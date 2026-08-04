// app/api/upload/route.ts
// API สำหรับ Upload ไฟล์ — เก็บบน Cloudflare R2 ทุกไฟล์ (local disk เป็น fallback ถ้ายังไม่ตั้งค่า R2)

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { uploadFile } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'ประเภทไฟล์ไม่ถูกต้อง (รองรับ: JPEG, PNG, GIF, WebP, PDF)' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ไฟล์ใหญ่เกินไป (สูงสุด 5MB)' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
    const filename = `${timestamp}_${randomStr}${ext}`;

    // Upload to Cloudflare R2 (all file types); local disk if R2 unconfigured
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const stored = await uploadFile({
      buffer,
      filename,
      contentType: file.type,
      folder,
    });

    // Return URL (response shape unchanged; `storage` is extra/optional)
    return NextResponse.json({
      success: true,
      url: stored.url,
      filename: stored.filename,
      storage: stored.storage,
    });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์', details: error.message },
      { status: 500 }
    );
  }
}
