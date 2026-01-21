// app/api/upload/route.ts
// API สำหรับ Upload ไฟล์

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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
    const ext = path.extname(file.name) || '.jpg';
    const filename = `${timestamp}_${randomStr}${ext}`;

    // Create upload directory if not exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return URL
    const fileUrl = `/uploads/${folder}/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename,
    });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์', details: error.message },
      { status: 500 }
    );
  }
}
