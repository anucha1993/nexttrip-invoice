// app/api/settings/smtp/test/route.ts
// POST: ทดสอบการเชื่อมต่อ SMTP (verify credentials) และส่งอีเมลทดสอบถ้าระบุ `to`

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { verifySmtpConnection, sendMail, emailLayout } from '@/lib/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json().catch(() => ({}));
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    if (to && !EMAIL_RE.test(to)) {
      return NextResponse.json({ ok: false, error: 'รูปแบบอีเมลผู้รับไม่ถูกต้อง' }, { status: 400 });
    }

    const verify = await verifySmtpConnection();
    if (!verify.ok) {
      return NextResponse.json({ ok: false, error: verify.error }, { status: 400 });
    }

    if (to) {
      await sendMail({
        to,
        subject: 'ทดสอบการส่งอีเมล - NextTrip',
        html: emailLayout(
          'ทดสอบการส่งอีเมล',
          '<p>นี่คืออีเมลทดสอบจากระบบ NextTrip Invoice การตั้งค่า SMTP ของคุณใช้งานได้ถูกต้องแล้ว</p>'
        ),
      });
      return NextResponse.json({ ok: true, message: `เชื่อมต่อสำเร็จ และส่งอีเมลทดสอบไปยัง ${to} เรียบร้อย` });
    }

    return NextResponse.json({ ok: true, message: 'เชื่อมต่อ SMTP สำเร็จ' });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error('POST /api/settings/smtp/test error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Internal error' }, { status: 500 });
  }
}
