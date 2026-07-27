// app/api/settings/line-oa/followers/route.ts
// GET: ดึงรายชื่อ userId ที่ Add เพื่อน LINE OA ไว้แล้ว (ไม่ต้องแตะ Webhook URL เลย)
// ใช้เมื่อ Webhook ของ Channel นี้ถูกใช้งานโดยระบบอื่นอยู่แล้ว (เช่น zaapi.co) และแก้ไม่ได้

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CompanySettingService } from '@/lib/services/company-setting';
import { LineOaService } from '@/lib/services/line-oa';

export async function GET() {
  try {
    await requireAuth();
    const channelAccessToken = await CompanySettingService.get('line_oa_channel_access_token', '');
    if (!channelAccessToken) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่า Channel Access Token' }, { status: 400 });
    }

    const { ok, userIds, error } = await LineOaService.fetchFollowerIds(channelAccessToken);
    if (!ok) {
      return NextResponse.json({ error: error || 'ดึงรายชื่อผู้ติดตามไม่สำเร็จ' }, { status: 502 });
    }

    const limited = userIds.slice(0, 50);
    const profiles = await Promise.all(
      limited.map(async (userId) => {
        const profile = await LineOaService.getProfile(channelAccessToken, userId);
        return { userId, displayName: profile?.displayName || null, pictureUrl: profile?.pictureUrl || null };
      })
    );

    return NextResponse.json({ followers: profiles, total: userIds.length });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/settings/line-oa/followers error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
