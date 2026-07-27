// app/api/settings/line-oa/route.ts
// GET: อ่านค่าตั้งค่า LINE OA (สำหรับส่งต่อสลิปที่แนบเข้ามา)
// PUT: บันทึกค่าตั้งค่า LINE OA

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CompanySettingService } from '@/lib/services/company-setting';

const KEYS = [
  'line_oa_channel_access_token',
  'line_oa_channel_secret',
  'line_oa_target_id',
  'line_oa_enabled',
] as const;

function maskSecret(s: string) {
  if (!s) return '';
  const tail = s.length > 6 ? s.slice(-4) : '';
  return `${'*'.repeat(24)}${tail}`;
}

export async function GET() {
  try {
    await requireAuth();
    const values = await CompanySettingService.getMany([...KEYS]);
    return NextResponse.json({
      targetId: values.line_oa_target_id || '',
      channelAccessTokenMasked: maskSecret(values.line_oa_channel_access_token || ''),
      hasChannelAccessToken: !!values.line_oa_channel_access_token,
      channelSecretMasked: maskSecret(values.line_oa_channel_secret || ''),
      hasChannelSecret: !!values.line_oa_channel_secret,
      enabled: (values.line_oa_enabled || 'false') === 'true',
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/settings/line-oa error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    const patch: Record<string, string> = {};
    if (typeof body.targetId === 'string') patch.line_oa_target_id = body.targetId.trim();
    // อัปเดต token เฉพาะเมื่อผู้ใช้ส่งค่าใหม่มา (ไม่ทับด้วยค่า mask ****)
    if (
      typeof body.channelAccessToken === 'string' &&
      body.channelAccessToken &&
      !body.channelAccessToken.startsWith('*')
    ) {
      patch.line_oa_channel_access_token = body.channelAccessToken.trim();
    }
    if (
      typeof body.channelSecret === 'string' &&
      body.channelSecret &&
      !body.channelSecret.startsWith('*')
    ) {
      patch.line_oa_channel_secret = body.channelSecret.trim();
    }
    if (typeof body.enabled === 'boolean') patch.line_oa_enabled = body.enabled ? 'true' : 'false';

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้บันทึก' }, { status: 400 });
    }

    await CompanySettingService.setMany(patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PUT /api/settings/line-oa error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
