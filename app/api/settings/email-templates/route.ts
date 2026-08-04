// app/api/settings/email-templates/route.ts
// GET/PUT: ตั้งค่าหัวข้อ/เนื้อหา template ของอีเมล Tracking system (QUOTATION/BOOKING/
// RECEIPT_DEPOSIT/RECEIPT_FULL) ที่ใช้แสดงใน Modal "ส่งอีเมล" ของหน้า Checklist

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import {
  EMAIL_TYPES,
  EMAIL_TYPE_LABEL,
  EMAIL_PLACEHOLDERS,
  EmailType,
  DEFAULT_EMAIL_TEMPLATES,
  getEmailTemplates,
  saveEmailTemplate,
} from '@/lib/email-templates/tracking-email';

export async function GET() {
  try {
    await requireAuth();
    const templates = await getEmailTemplates();
    return NextResponse.json({
      templates,
      defaults: DEFAULT_EMAIL_TEMPLATES,
      labels: EMAIL_TYPE_LABEL,
      placeholders: EMAIL_PLACEHOLDERS,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/settings/email-templates error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const type = body.type as EmailType;

    if (!EMAIL_TYPES.includes(type)) {
      return NextResponse.json({ error: 'ประเภทอีเมลไม่ถูกต้อง' }, { status: 400 });
    }
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const bodyHtml = typeof body.body === 'string' ? body.body : '';
    if (!subject || !bodyHtml.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกหัวข้อและเนื้อหาอีเมล' }, { status: 400 });
    }

    await saveEmailTemplate(type, { subject, body: bodyHtml });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PUT /api/settings/email-templates error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
