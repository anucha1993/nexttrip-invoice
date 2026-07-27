// app/api/line-oa/webhook/route.ts
// Webhook รับ event จาก LINE Messaging API — ใช้เก็บ userId/groupId/roomId ล่าสุด
// เพื่อให้ผู้ใช้คัดลอกไปใส่เป็น "Target ID" ในหน้าตั้งค่า LINE OA ได้ง่ายๆ
// ตั้งค่า Webhook URL นี้ใน LINE Developers Console: https://<domain>/api/line-oa/webhook

import { NextRequest, NextResponse } from 'next/server';
import { LineOaService } from '@/lib/services/line-oa';
import { CompanySettingService } from '@/lib/services/company-setting';

const MAX_EVENTS = 20;

interface LineEventSource {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
}

interface LineEvent {
  type: string;
  timestamp: number;
  source?: LineEventSource;
  message?: { type: string; text?: string };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // ตรวจสอบลายเซ็นด้วย Channel Secret ถ้าตั้งค่าไว้แล้ว (แนะนำให้ตั้ง แต่ไม่บังคับ เพื่อให้เริ่มจับ ID ได้ทันที)
  const channelSecret = await CompanySettingService.get('line_oa_channel_secret');
  if (channelSecret) {
    const signature = req.headers.get('x-line-signature') || '';
    if (!LineOaService.verifySignature(rawBody, signature, channelSecret)) {
      console.warn('LINE webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  try {
    const body = JSON.parse(rawBody || '{}') as { events?: LineEvent[] };
    const events = Array.isArray(body.events) ? body.events : [];

    if (events.length > 0) {
      const existingRaw = await CompanySettingService.get('line_oa_recent_events', '[]');
      let existing: unknown[] = [];
      try {
        existing = JSON.parse(existingRaw);
        if (!Array.isArray(existing)) existing = [];
      } catch {
        existing = [];
      }

      const newRecords = events.map((ev) => ({
        type: ev.type,
        sourceType: ev.source?.type || 'unknown',
        id: ev.source?.userId || ev.source?.groupId || ev.source?.roomId || '',
        text: ev.message?.type === 'text' ? ev.message.text : ev.message?.type ? `[${ev.message.type}]` : '',
        timestamp: ev.timestamp,
      }));

      const merged = [...newRecords, ...existing].slice(0, MAX_EVENTS);
      await CompanySettingService.set('line_oa_recent_events', JSON.stringify(merged));
    }
  } catch (e) {
    console.error('LINE webhook: failed to process event', e);
    // ยังคงตอบ 200 กลับไปเพื่อไม่ให้ LINE รีทรายซ้ำ
  }

  return NextResponse.json({ ok: true });
}

// LINE Developers Console ปุ่ม "Verify" จะยิง GET มาเช็คว่า endpoint ตอบสนองหรือไม่
export async function GET() {
  return NextResponse.json({ ok: true });
}
