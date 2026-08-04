// app/api/quotations/[id]/send-email/route.ts
// Sends one of the Tracking-system emails for a quotation and, on success,
// auto-checks the matching checklist item (see lib/checklist-auto.ts):
//   QUOTATION       -> customer   -> QUOTATION_EMAIL_SENT
//   BOOKING         -> wholesaler -> BOOKING_EMAIL_SENT
//   RECEIPT_DEPOSIT -> customer   -> RECEIPT_DEPOSIT_EMAIL_SENT
//   RECEIPT_FULL    -> customer   -> RECEIPT_FULL_EMAIL_SENT
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { sendMail } from '@/lib/email';
import { fetchWholesaler } from '@/lib/services/tour-api';
import { markChecklistAuto } from '@/lib/checklist-auto';
import { generateQuotationPdf } from '@/lib/pdf/quotation-pdf';
import { EMAIL_TYPES, EmailType, buildTrackingEmailContent, getEmailTemplates, getPublicOrigin } from '@/lib/email-templates/tracking-email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const type = body.type as EmailType;
    const toOverride = typeof body.to === 'string' ? body.to.trim() : '';
    const subjectOverride = typeof body.subject === 'string' ? body.subject.trim() : '';
    const bodyOverride = typeof body.body === 'string' ? body.body : undefined;

    if (!EMAIL_TYPES.includes(type)) {
      return NextResponse.json({ error: 'ประเภทอีเมลไม่ถูกต้อง' }, { status: 400 });
    }
    if (toOverride && !EMAIL_RE.test(toOverride)) {
      return NextResponse.json({ error: 'รูปแบบอีเมลผู้รับไม่ถูกต้อง' }, { status: 400 });
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
    const origin = getPublicOrigin(request);
    const viewUrl = `${origin}/quotations/${id}`;
    const actorName = (session as any)?.name || (session as any)?.email || null;

    if (type === 'BOOKING' && !q.wholesaleId) {
      return NextResponse.json({ error: 'ใบเสนอราคานี้ยังไม่ได้เลือกโฮลเซลล์' }, { status: 400 });
    }
    const wholesaler = type === 'BOOKING' && q.wholesaleId ? await fetchWholesaler(Number(q.wholesaleId)) : null;
    if (type === 'BOOKING' && !toOverride && !wholesaler?.email) {
      return NextResponse.json(
        { error: 'ไม่พบอีเมลผู้ติดต่อของโฮลเซลล์นี้ กรุณาเพิ่มอีเมลผู้ติดต่อ (contact_email) ในระบบ tour-api ก่อน หรือระบุอีเมลผู้รับเอง' },
        { status: 400 }
      );
    }

    const templates = await getEmailTemplates();
    const { eventKey, subject, html, defaultTo } = buildTrackingEmailContent(
      type,
      q,
      wholesaler,
      viewUrl,
      templates[type],
      subjectOverride,
      bodyOverride
    );
    const to = toOverride || defaultTo;

    if (!to) {
      return NextResponse.json({ error: 'ไม่พบอีเมลผู้รับ กรุณาตรวจสอบข้อมูลอีเมลลูกค้าก่อน' }, { status: 400 });
    }

    // แนบไฟล์ PDF ใบเสนอราคาไปกับอีเมลประเภท QUOTATION
    let attachments: { filename: string; content: Buffer }[] | undefined;
    if (type === 'QUOTATION') {
      try {
        const pdfBuffer = await generateQuotationPdf(id);
        if (pdfBuffer) {
          attachments = [{ filename: `${q.quotationNumber}.pdf`, content: pdfBuffer }];
        }
      } catch (pdfError) {
        console.error('Error generating quotation PDF for email attachment:', pdfError);
      }
    }

    try {
      await sendMail({ to, subject, html, attachments });
      await conn.query(
        `INSERT INTO quotation_email_log (quotationId, emailType, toEmail, subject, status, sentById, sentByName)
         VALUES (?, ?, ?, ?, 'SENT', ?, ?)`,
        [id, type, to, subject, (session as any)?.id || null, actorName]
      );
      await markChecklistAuto(Number(id), eventKey, { actorName, sourceRef: `email:${type}` });
      return NextResponse.json({ success: true, message: `ส่งอีเมลไปยัง ${to} เรียบร้อย` });
    } catch (sendError: any) {
      await conn.query(
        `INSERT INTO quotation_email_log (quotationId, emailType, toEmail, subject, status, errorMessage, sentById, sentByName)
         VALUES (?, ?, ?, ?, 'FAILED', ?, ?, ?)`,
        [id, type, to, subject, sendError?.message || String(sendError), (session as any)?.id || null, actorName]
      );
      return NextResponse.json({ error: sendError?.message || 'ส่งอีเมลไม่สำเร็จ' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error sending quotation email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

// GET - list email send history for a quotation (used by ChecklistTab to show last-sent status)
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
      `SELECT id, emailType, toEmail, subject, status, errorMessage, sentByName, createdAt
       FROM quotation_email_log WHERE quotationId = ? ORDER BY createdAt DESC`,
      [id]
    );
    return NextResponse.json({ logs: rows });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching email log:', error);
    return NextResponse.json({ error: 'Failed to fetch email log' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
