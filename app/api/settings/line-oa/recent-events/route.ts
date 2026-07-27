// app/api/settings/line-oa/recent-events/route.ts
// GET: อ่านรายการ event ล่าสุดที่ webhook LINE OA จับได้ (ใช้หา userId/groupId มาใส่เป็น Target ID)

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CompanySettingService } from '@/lib/services/company-setting';

export async function GET() {
  try {
    await requireAuth();
    const raw = await CompanySettingService.get('line_oa_recent_events', '[]');
    let events: unknown[] = [];
    try {
      events = JSON.parse(raw);
      if (!Array.isArray(events)) events = [];
    } catch {
      events = [];
    }
    return NextResponse.json({ events });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/settings/line-oa/recent-events error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
