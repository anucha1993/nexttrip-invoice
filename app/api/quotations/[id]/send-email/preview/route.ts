// app/api/quotations/[id]/send-email/preview/route.ts
// Returns the subject/body/default-recipient that WOULD be sent for a given
// tracking-system email type, WITHOUT actually sending anything. Used to
// populate the "confirm & edit before sending" modal in the Tracking tab.
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { fetchWholesaler } from '@/lib/services/tour-api';
import {
  EMAIL_TYPES,
  EMAIL_TYPE_LABEL,
  EmailType,
  buildTrackingEmailContent,
  getEmailTemplates,
  getPublicOrigin,
} from '@/lib/email-templates/tracking-email';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as EmailType;

    if (!EMAIL_TYPES.includes(type)) {
      return NextResponse.json({ error: 'ประเภทอีเมลไม่ถูกต้อง' }, { status: 400 });
    }

    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT q.id, q.quotationNumber, q.tourName, q.customTourCode, q.grandTotal,
              q.depositAmount, q.wholesaleId,
              c.name as customerName, c.email as customerEmail
       FROM quotations q
       LEFT JOIN customers c ON q.customerId = c.id
       WHERE q.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
    }
    const q = rows[0];

    let wholesaler: { nameTh?: string | null; email?: string | null } | null = null;
    if (type === 'BOOKING' && q.wholesaleId) {
      wholesaler = await fetchWholesaler(Number(q.wholesaleId));
    }

    const origin = getPublicOrigin(request);
    const viewUrl = `${origin}/quotations/${id}`;
    const templates = await getEmailTemplates();
    const content = buildTrackingEmailContent(type, q, wholesaler, viewUrl, templates[type]);

    return NextResponse.json({
      label: EMAIL_TYPE_LABEL[type],
      to: content.defaultTo,
      subject: content.subject,
      bodyHtml: content.bodyHtml,
      html: content.html,
      hasWholesaleContact: type !== 'BOOKING' || !!wholesaler?.email,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error building email preview:', error);
    return NextResponse.json({ error: 'สร้างตัวอย่างอีเมลไม่สำเร็จ' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
