// app/api/settings/quotation-pdf/route.ts
// GET/PUT: ตั้งค่าหัวเอกสาร (โลโก้/ลายเซ็น/ข้อมูลบริษัท/บัญชีธนาคาร) สำหรับ PDF ใบเสนอราคา

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CompanySettingService } from '@/lib/services/company-setting';
import { getLetterheadSettings, LETTERHEAD_DEFAULTS } from '@/lib/pdf/quotation-pdf';

const KEYS = Object.keys(LETTERHEAD_DEFAULTS);

export async function GET() {
  try {
    await requireAuth();
    const values = await getLetterheadSettings();
    return NextResponse.json(values);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/settings/quotation-pdf error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    const patch: Record<string, string> = {};
    for (const key of KEYS) {
      if (typeof body[key] === 'string') patch[key] = body[key].trim();
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้บันทึก' }, { status: 400 });
    }

    await CompanySettingService.setMany(patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PUT /api/settings/quotation-pdf error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
