// app/api/quotations/[id]/share-link/route.ts
// POST: สร้างลิงก์สาธารณะ (ไม่ต้องล็อกอิน) สำหรับดู/ดาวน์โหลด PDF ใบเสนอราคานี้
// ลิงก์มี Token เซ็นชื่อแบบมีวันหมดอายุ (ค่าเริ่มต้น 7 วัน) — ใช้แสดงในปุ่ม "สร้างลิงก์ PDF"

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { createQuotationShareToken } from '@/lib/quotation-share-token';
import { getPublicOrigin } from '@/lib/email-templates/tracking-email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    await requireAuth();
    const { id } = await params;
    const quotationId = Number(id);
    if (!quotationId) {
      return NextResponse.json({ error: 'รหัสใบเสนอราคาไม่ถูกต้อง' }, { status: 400 });
    }

    conn = await pool.getConnection();
    const rows = await conn.query('SELECT id FROM quotations WHERE id = ?', [quotationId]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
    }

    const token = await createQuotationShareToken(quotationId, '7d');
    const origin = getPublicOrigin(request);
    const url = `${origin}/api/quotations/${quotationId}/pdf/public?token=${encodeURIComponent(token)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({ url, expiresAt });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/quotations/[id]/share-link error', e);
    return NextResponse.json({ error: 'สร้างลิงก์ไม่สำเร็จ' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
