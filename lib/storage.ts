// lib/storage.ts
// Centralized file storage for uploads — ALL document files (images included)
// go to Cloudflare R2 (served via the R2_URL custom domain).
// Falls back to local disk (public/uploads) ONLY when R2 env vars are not set,
// so local development keeps working without credentials.

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ---- Cloudflare R2 config ----
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_URL = process.env.R2_URL;
const R2_REGION = process.env.R2_REGION || 'auto';
// Prefix so invoice objects never collide with tour-api objects in a shared bucket.
const R2_PREFIX = process.env.R2_PREFIX || 'invoices';

export const r2Configured = Boolean(
  R2_ENDPOINT && R2_BUCKET && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_URL
);

export type StorageBackend = 'r2' | 'local';

export interface StoredFile {
  /** Public URL to display / persist in the DB. */
  url: string;
  /** Final object filename. */
  filename: string;
  /** Which backend actually stored the file. */
  storage: StorageBackend;
  /** Identifier for later deletion: the R2 object key. */
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
 * Store an uploaded file on R2 (the only cloud backend — every document file,
 * images included, goes to R2). Falls back to local disk only when R2 is not configured.
 */
export async function uploadFile(opts: {
  buffer: Buffer;
  filename: string;
  contentType: string;
  folder: string;
}): Promise<StoredFile> {
  const { buffer, filename, contentType, folder } = opts;

  if (r2Configured) {
    return uploadFileToR2(buffer, folder, filename, contentType);
  }

  console.warn(
    '[storage] R2 not configured — falling back to local disk (public/uploads). ' +
      'Set R2_* env vars to store uploads on Cloudflare R2.'
  );
  return uploadFileToLocal(buffer, folder, filename);
}
