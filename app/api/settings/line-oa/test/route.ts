// app/api/settings/line-oa/test/route.ts
// POST: ทดสอบการเชื่อมต่อ LINE OA (ส่งข้อความทดสอบไปยัง target ที่ตั้งค่าไว้)

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { LineOaService } from '@/lib/services/line-oa';

export async function POST() {
  try {
    await requireAuth();
    const svc = await LineOaService.fromSettings();
    if (!svc.isConfigured) {
      return NextResponse.json(
        { ok: false, error: 'ยังไม่ได้ตั้งค่า Channel Access Token / Target ID' },
        { status: 400 }
      );
    }
    const result = await svc.sendTestMessage();
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/settings/line-oa/test error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
