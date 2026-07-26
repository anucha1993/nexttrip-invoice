// lib/storage.ts
// Centralized file storage for uploads — mirrors the tour-api approach:
//   - Images (JPEG/PNG/GIF/WebP)  -> Cloudflare Images  (served via imagedelivery.net)
//   - Other files (e.g. PDF)      -> Cloudflare R2       (served via the R2_URL custom domain)
// Falls back to local disk (public/uploads) ONLY when the cloud env vars are not set,
// so local development keeps working without credentials.

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ---- Cloudflare Images config ----
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_IMAGES_TOKEN = process.env.CLOUDFLARE_IMAGES_TOKEN;
const CF_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH;

// ---- Cloudflare R2 config ----
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_URL = process.env.R2_URL;
const R2_REGION = process.env.R2_REGION || 'auto';
// Prefix so invoice objects never collide with tour-api objects in a shared bucket.
const R2_PREFIX = process.env.R2_PREFIX || 'invoices';

export const cloudflareImagesConfigured = Boolean(
  CF_ACCOUNT_ID && CF_IMAGES_TOKEN && CF_ACCOUNT_HASH
);
export const r2Configured = Boolean(
  R2_ENDPOINT && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_URL
);

export type StorageBackend = 'cloudflare-images' | 'r2' | 'local';

export interface StoredFile {
  /** Public URL to display / persist in the DB. */
  url: string;
  /** Final object filename (or Cloudflare image id). */
  filename: string;
  /** Which backend actually stored the file. */
  storage: StorageBackend;
  /** Identifier for later deletion: Cloudflare image id, or the R2 object key. */
  id?: string;
}

let r2Singleton: S3Client | null = null;
function getR2Client(): S3Client {
  if (!r2Singleton) {
    r2Singleton = new S3Client({
      region: R2_REGION,
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID as string,
        secretAccessKey: R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return r2Singleton;
}

/** Upload an image to Cloudflare Images and return its public delivery URL. */
async function uploadImageToCloudflare(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<StoredFile> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: contentType }), filename);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CF_IMAGES_TOKEN}` },
      body: form,
    }
  );

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    const msg = data?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`Cloudflare Images upload failed: ${msg}`);
  }

  const id: string = data.result.id;
  return {
    url: `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${id}/public`,
    filename: id,
    storage: 'cloudflare-images',
    id,
  };
}

/** Upload any file to R2 under `{R2_PREFIX}/{folder}/{filename}` and return its public URL. */
async function uploadFileToR2(
  buffer: Buffer,
  folder: string,
  filename: string,
  contentType: string
): Promise<StoredFile> {
  const key = `${R2_PREFIX}/${folder}/${filename}`;
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return {
    url: `${(R2_URL as string).replace(/\/+$/, '')}/${key}`,
    filename,
    storage: 'r2',
    id: key,
  };
}

/** Local-disk fallback for development when cloud storage is not configured. */
async function uploadFileToLocal(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<StoredFile> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return { url: `/uploads/${folder}/${filename}`, filename, storage: 'local' };
}

/**
 * Store an uploaded file on the appropriate backend.
 * Images go to Cloudflare Images; everything else goes to R2.
 * Falls back to local disk only when the relevant cloud config is missing.
 */
export async function uploadFile(opts: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  folder: string;
}): Promise<StoredFile> {
  const { buffer, filename, contentType, folder } = opts;
  const isImage = contentType.startsWith('image/');

  if (isImage && cloudflareImagesConfigured) {
    return uploadImageToCloudflare(buffer, filename, contentType);
  }
  if (r2Configured) {
    return uploadFileToR2(buffer, folder, filename, contentType);
  }

  console.warn(
    '[storage] Cloudflare/R2 not configured — falling back to local disk (public/uploads). ' +
      'Set CLOUDFLARE_* and R2_* env vars to store uploads on Cloudflare.'
  );
  return uploadFileToLocal(buffer, folder, filename);
}
