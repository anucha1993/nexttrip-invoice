// app/api/settings/slip2go/route.ts
// GET: อ่านค่าตั้งค่า Slip2Go
// PUT: บันทึกค่าตั้งค่า Slip2Go

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CompanySettingService } from '@/lib/services/company-setting';

const KEYS = [
  'slip2go_api_url',
  'slip2go_secret_key',
  'slip2go_check_duplicate',
  'slip2go_enabled',
] as const;

function maskSecret(s: string) {
  if (!s) return '';
  if (s.length <= 8) return '••••';
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

export async function GET() {
  try {
    await requireAuth();
    const values = await CompanySettingService.getMany([...KEYS]);
    return NextResponse.json({
      apiUrl: values.slip2go_api_url || 'https://connect.slip2go.com',
      secretKeyMasked: maskSecret(values.slip2go_secret_key || ''),
      hasSecretKey: !!values.slip2go_secret_key,
      checkDuplicate: (values.slip2go_check_duplicate || 'true') === 'true',
      enabled: (values.slip2go_enabled || 'false') === 'true',
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/settings/slip2go error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    const patch: Record<string, string> = {};
    if (typeof body.apiUrl === 'string') patch.slip2go_api_url = body.apiUrl.trim();
    // อัปเดต secret เฉพาะเมื่อผู้ใช้ส่งค่าใหม่มา (ไม่ทับด้วยค่า mask)
    if (typeof body.secretKey === 'string' && body.secretKey && !body.secretKey.includes('••')) {
      patch.slip2go_secret_key = body.secretKey.trim();
    }
    if (typeof body.checkDuplicate === 'boolean')
      patch.slip2go_check_duplicate = body.checkDuplicate ? 'true' : 'false';
    if (typeof body.enabled === 'boolean')
      patch.slip2go_enabled = body.enabled ? 'true' : 'false';

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้บันทึก' }, { status: 400 });
    }

    await CompanySettingService.setMany(patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PUT /api/settings/slip2go error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
