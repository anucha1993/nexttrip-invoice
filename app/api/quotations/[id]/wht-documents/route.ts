// app/api/quotations/[id]/wht-documents/route.ts
// Customer withholding-tax (WHT) document tracking (item 9 in Tracking.xlsx —
// "ติดตามใบหัก ณ ที่จ่ายของลูกค้า"). GET lists uploaded docs for a quotation;
// POST accepts a multipart file upload, stores it via lib/storage.ts (same
// Cloudflare R2 pattern as app/api/upload), records it, and
// auto-checks the matching checklist item.
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { uploadFile } from '@/lib/storage';
import { markChecklistAuto } from '@/lib/checklist-auto';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    await requireAuth();
    const { id } = await params;
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id, fileUrl, fileName, notes, uploadedByName, createdAt
       FROM customer_wht_documents WHERE quotationId = ? ORDER BY createdAt DESC`,
      [id]
    );
    return NextResponse.json({ documents: rows });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching WHT documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const session = await requireAuth();
    const { id } = await params;

    conn = await pool.getConnection();
    const quotationRows = await conn.query('SELECT id FROM quotations WHERE id = ?', [id]);
    if (!quotationRows || quotationRows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const notes = (formData.get('notes') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์' }, { status: 400 });
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'ประเภทไฟล์ไม่ถูกต้อง (รองรับ: JPEG, PNG, GIF, WebP, PDF)' },
        { status: 400 }
      );
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'ไฟล์ใหญ่เกินไป (สูงสุด 5MB)' }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
    const filename = `${timestamp}_${randomStr}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await uploadFile({
      buffer,
      filename,
      contentType: file.type,
      folder: 'wht-documents',
    });

    const actorName = (session as any)?.name || (session as any)?.email || null;
    const result = await conn.query(
      `INSERT INTO customer_wht_documents (quotationId, fileUrl, fileName, notes, uploadedById, uploadedByName)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, stored.url, file.name, notes, (session as any)?.id || null, actorName]
    );

    await markChecklistAuto(Number(id), 'CUSTOMER_WHT_DOC_UPLOADED', {
      actorName,
      sourceRef: `wht_doc:${(result as any).insertId}`,
    });

    return NextResponse.json({
      success: true,
      document: { id: Number((result as any).insertId), fileUrl: stored.url, fileName: file.name, notes },
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error uploading WHT document:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', details: error.message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
