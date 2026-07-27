// lib/services/line-oa.ts
// Service สำหรับส่งข้อความ/รูปแจ้งเตือนผ่าน LINE Messaging API (LINE OA)
// ใช้ส่งต่อสลิปที่ลูกค้าแนบเข้ามา ไปยังกลุ่ม/บัญชี LINE ที่ตั้งค่าไว้

import { createHmac, timingSafeEqual } from 'crypto';
import { CompanySettingService } from './company-setting';

export interface LineOaConfig {
  channelAccessToken: string;
  channelSecret: string;
  targetId: string;
  enabled: boolean;
}

export interface LineOaResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export class LineOaService {
  private channelAccessToken: string;
  private targetId: string;

  constructor(config: { channelAccessToken: string; targetId: string }) {
    this.channelAccessToken = config.channelAccessToken || '';
    this.targetId = config.targetId || '';
  }

  static async loadConfig(): Promise<LineOaConfig> {
    const s = await CompanySettingService.getMany([
      'line_oa_channel_access_token',
      'line_oa_channel_secret',
      'line_oa_target_id',
      'line_oa_enabled',
    ]);
    return {
      channelAccessToken: s.line_oa_channel_access_token || '',
      channelSecret: s.line_oa_channel_secret || '',
      targetId: s.line_oa_target_id || '',
      enabled: (s.line_oa_enabled || 'false') === 'true',
    };
  }

  /** ตรวจลายเซ็น webhook จาก LINE (header x-line-signature) ด้วย Channel Secret */
  static verifySignature(rawBody: string, signature: string, channelSecret: string): boolean {
    if (!channelSecret || !signature) return false;
    try {
      const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64');
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  static async fromSettings(): Promise<LineOaService> {
    const cfg = await LineOaService.loadConfig();
    return new LineOaService(cfg);
  }

  get isConfigured(): boolean {
    return this.channelAccessToken.length > 0 && this.targetId.length > 0;
  }

  private async push(messages: Record<string, unknown>[]): Promise<LineOaResult> {
    if (!this.isConfigured) {
      return { ok: false, error: 'LINE OA ยังไม่ได้ตั้งค่า Channel Access Token / Target ID' };
    }
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({ to: this.targetId, messages }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: body || `LINE API error (${res.status})` };
      }
      return { ok: true, status: res.status };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /** ส่งข้อความแจ้งเตือน + รูปสลิปที่แนบเข้ามา (imageUrl ต้องเป็น https) */
  async pushSlipNotification(params: { imageUrl: string; text: string }): Promise<LineOaResult> {
    const messages: Record<string, unknown>[] = [{ type: 'text', text: params.text }];
    if (/^https:\/\//i.test(params.imageUrl)) {
      messages.push({
        type: 'image',
        originalContentUrl: params.imageUrl,
        previewImageUrl: params.imageUrl,
      });
    }
    return this.push(messages);
  }

  /** ทดสอบการเชื่อมต่อ */
  async sendTestMessage(): Promise<LineOaResult> {
    return this.push([
      { type: 'text', text: '✅ ทดสอบการเชื่อมต่อ LINE OA สำเร็จ (จากระบบ NextTrip Invoice)' },
    ]);
  }

  /**
   * ดึงรายชื่อ userId ของคนที่ Add เพื่อน LINE OA นี้ไว้ (ไม่ต้องแตะ/เปลี่ยน Webhook URL เลย)
   * ใช้ได้เฉพาะ "ผู้ใช้เดี่ยว" ที่แอดเป็นเพื่อนแล้วเท่านั้น — ไม่รวม "กลุ่ม/ห้อง" (ต้องใช้ webhook จับแทน)
   */
  static async fetchFollowerIds(
    channelAccessToken: string
  ): Promise<{ ok: boolean; userIds: string[]; error?: string }> {
    if (!channelAccessToken) return { ok: false, userIds: [], error: 'ไม่มี Channel Access Token' };
    try {
      let userIds: string[] = [];
      let start: string | undefined;
      for (let i = 0; i < 10; i++) {
        const url = new URL('https://api.line.me/v2/bot/followers/ids');
        url.searchParams.set('limit', '300');
        if (start) url.searchParams.set('start', start);
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${channelAccessToken}` },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          return { ok: false, userIds, error: body || `LINE API error (${res.status})` };
        }
        const data = (await res.json()) as { userIds?: string[]; next?: string };
        userIds = userIds.concat(data.userIds || []);
        start = data.next;
        if (!start) break;
      }
      return { ok: true, userIds };
    } catch (err) {
      return { ok: false, userIds: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  /** ดึงชื่อ/รูปโปรไฟล์ของ userId เพื่อให้เลือกได้ง่ายขึ้น (ไม่ fail ทั้งหมดถ้าบาง id ดึงไม่ได้) */
  static async getProfile(
    channelAccessToken: string,
    userId: string
  ): Promise<{ displayName?: string; pictureUrl?: string } | null> {
    try {
      const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
        headers: { Authorization: `Bearer ${channelAccessToken}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /** สร้างข้อความแจ้งเตือนสลิปมาตรฐาน */
  static buildSlipText(params: {
    transactionType: 'PAYMENT' | 'REFUND';
    transactionNumber: string;
    amount: number;
    referenceNumber?: string | null;
    customerName?: string | null;
    quotationNumber?: string | null;
    invoiceNumber?: string | null;
    notes?: string | null;
    /** CREATE = แจ้งรับชำระ/แจ้งคืนเงิน (ค่าเริ่มต้น), EDIT = แก้ไขรายการ, CANCEL = ยกเลิกรายการ, DELETE = ลบรายการถาวร */
    action?: 'CREATE' | 'EDIT' | 'CANCEL' | 'DELETE';
  }): string {
    const isRefund = params.transactionType === 'REFUND';
    let emoji = '📎';
    let label = isRefund ? 'แจ้งคืนเงิน' : 'แจ้งรับชำระเงิน';
    if (params.action === 'EDIT') {
      emoji = '📝';
      label = isRefund ? 'แก้ไขรายการคืนเงิน' : 'แก้ไขรายการรับชำระเงิน';
    } else if (params.action === 'CANCEL') {
      emoji = '❌';
      label = isRefund ? 'ยกเลิกรายการคืนเงิน' : 'ยกเลิกรายการรับชำระเงิน';
    } else if (params.action === 'DELETE') {
      emoji = '🗑️';
      label = isRefund ? 'ลบรายการคืนเงิน (ถาวร)' : 'ลบรายการรับชำระเงิน (ถาวร)';
    }
    const lines = [
      `${emoji} ${label}`,
      `เลขที่: ${params.transactionNumber}`,
      params.quotationNumber ? `ใบเสนอราคา: ${params.quotationNumber}` : null,
      params.invoiceNumber ? `ใบแจ้งหนี้: ${params.invoiceNumber}` : null,
      params.customerName ? `ลูกค้า: ${params.customerName}` : null,
      `ยอดเงิน: ${params.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`,
      params.referenceNumber ? `Ref: ${params.referenceNumber}` : null,
      params.notes ? `หมายเหตุ: ${params.notes}` : null,
    ].filter(Boolean);
    return lines.join('\n');
  }

  /** สร้างข้อความแจ้งเตือน "ใช้สลิปเดิมซ้ำกับรายการอื่น" (แบ่งชำระหลายใบแจ้งหนี้ด้วยสลิปใบเดียวกัน) */
  static buildSlipReuseText(params: {
    transactionNumber: string;
    referenceNumber: string;
    amount: number;
    customerName?: string | null;
    quotationNumber?: string | null;
    invoiceNumber?: string | null;
    totalAmount?: number | null;
    usedAmountBefore: number;
    remainingAfter?: number | null;
    usages: { quotationNumber?: string | null; invoiceNumber?: string | null; transactionNumber: string; amount: number }[];
  }): string {
    const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2 });
    const usedList = params.usages
      .map((u) => `${[u.quotationNumber, u.invoiceNumber].filter(Boolean).join('/') || u.transactionNumber} (${fmt(u.amount)} บาท)`)
      .join(', ');
    const lines = [
      `🔁 ใช้สลิปเดิมซ้ำกับรายการอื่น`,
      `เลขที่รายการนี้: ${params.transactionNumber}`,
      params.quotationNumber ? `ใบเสนอราคา: ${params.quotationNumber}` : null,
      params.invoiceNumber ? `ใบแจ้งหนี้: ${params.invoiceNumber}` : null,
      params.customerName ? `ลูกค้า: ${params.customerName}` : null,
      `Ref: ${params.referenceNumber}`,
      `ยอดรายการนี้: ${fmt(params.amount)} บาท`,
      params.totalAmount != null ? `ยอดรวมในสลิป: ${fmt(params.totalAmount)} บาท` : null,
      `ใช้ไปแล้วก่อนหน้า: ${fmt(params.usedAmountBefore)} บาท`,
      params.remainingAfter != null ? `คงเหลือหลังรายการนี้: ${fmt(params.remainingAfter)} บาท` : null,
      usedList ? `เคยใช้กับ: ${usedList}` : null,
    ].filter(Boolean);
    return lines.join('\n');
  }
}
