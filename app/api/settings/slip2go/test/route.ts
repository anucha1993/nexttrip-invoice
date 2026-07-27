// app/api/settings/slip2go/test/route.ts
// POST: ทดสอบการเชื่อมต่อ Slip2Go (เรียก /api/account/info)

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { Slip2goService } from '@/lib/services/slip2go';

export async function POST() {
  try {
    await requireAuth();
    const svc = await Slip2goService.fromSettings();
    if (!svc.isConfigured) {
      return NextResponse.json(
        { ok: false, error: 'ยังไม่ได้ตั้งค่า Secret Key' },
        { status: 400 }
      );
    }
    const result = await svc.getAccountInfo();
    const code = String(result.code);
    // account/info สำเร็จคืนค่า 200001 (verify-slip คืนค่า 200000) — รับทั้งสองกันพลาด
    const ok = code === '200001' || code === '200000';
    return NextResponse.json({ ok, result });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/settings/slip2go/test error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
