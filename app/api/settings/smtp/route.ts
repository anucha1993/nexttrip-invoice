// app/api/settings/smtp/route.ts
// GET/PUT: ตั้งค่า SMTP ผู้ส่งอีเมล (ใช้โดย lib/email.ts sendMail สำหรับส่งอีเมล Tracking
// system เช่น ใบเสนอราคา/ใบจอง/ใบเสร็จ) — เก็บใน company_settings แทนการแก้ .env
// รหัสผ่านจะไม่ถูกส่งกลับตรงๆ (mask) และจะไม่ถูกเขียนทับถ้าไม่ได้ส่งค่าใหม่มา

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CompanySettingService } from '@/lib/services/company-setting';

const KEYS = [
  'smtp_host',
  'smtp_port',
  'smtp_secure',
  'smtp_user',
  'smtp_pass',
  'smtp_from_name',
  'smtp_from_email',
] as const;

function maskSecret(s: string) {
  if (!s) return '';
  const tail = s.length > 4 ? s.slice(-4) : '';
  return `${'*'.repeat(20)}${tail}`;
}

export async function GET() {
  try {
    await requireAuth();
    const v = await CompanySettingService.getMany([...KEYS]);
    const pass = v.smtp_pass || (process.env.SMTP_PASS ? process.env.SMTP_PASS : '');
    return NextResponse.json({
      host: v.smtp_host || process.env.SMTP_HOST || '',
      port: v.smtp_port || process.env.SMTP_PORT || '587',
      secure: v.smtp_secure ? v.smtp_secure === 'true' : process.env.SMTP_SECURE === 'true',
      user: v.smtp_user || process.env.SMTP_USER || '',
      passwordMasked: maskSecret(pass),
      hasPassword: !!pass,
      fromName: v.smtp_from_name || process.env.SMTP_FROM_NAME || 'NextTrip',
      fromEmail: v.smtp_from_email || process.env.SMTP_FROM_EMAIL || '',
      usingEnvFallback: !v.smtp_host && !!process.env.SMTP_HOST,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/settings/smtp error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    const host = typeof body.host === 'string' ? body.host.trim() : '';
    const user = typeof body.user === 'string' ? body.user.trim() : '';
    if (!host || !user) {
      return NextResponse.json({ error: 'กรุณากรอก Host และ User ให้ครบ' }, { status: 400 });
    }

    const patch: Record<string, string> = {
      smtp_host: host,
      smtp_port: String(Number(body.port) || 587),
      smtp_secure: body.secure ? 'true' : 'false',
      smtp_user: user,
      smtp_from_name: typeof body.fromName === 'string' ? body.fromName.trim() : '',
      smtp_from_email: typeof body.fromEmail === 'string' ? body.fromEmail.trim() : '',
    };

    // อัปเดตรหัสผ่านเฉพาะเมื่อผู้ใช้กรอกค่าใหม่มา (ไม่ทับด้วยค่า mask ที่เป็น ****)
    if (typeof body.password === 'string' && body.password && !body.password.startsWith('*')) {
      patch.smtp_pass = body.password;
    }

    await CompanySettingService.setMany(patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PUT /api/settings/smtp error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
