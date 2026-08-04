// lib/email-templates/tracking-email.ts
// Shared builder for the Tracking-system checklist emails (QUOTATION / BOOKING /
// RECEIPT_DEPOSIT / RECEIPT_FULL). Used by BOTH the preview endpoint (shows the
// employee what will be sent, before sending) and the actual send endpoint, so
// the two are always guaranteed to be in sync.
//
// Subject/body are editable templates (with {{placeholder}} tokens) stored in
// company_settings (see getEmailTemplates/saveEmailTemplate below), configurable
// from /settings/email-templates. If no override is saved, DEFAULT_EMAIL_TEMPLATES
// is used.
import { emailLayout } from '@/lib/email';
import { CompanySettingService } from '@/lib/services/company-setting';

export const EMAIL_TYPES = ['QUOTATION', 'BOOKING', 'RECEIPT_DEPOSIT', 'RECEIPT_FULL'] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

export const EMAIL_TYPE_LABEL: Record<EmailType, string> = {
  QUOTATION: 'ส่งใบเสนอราคาให้ลูกค้า',
  BOOKING: 'ส่งใบจองทัวร์ให้โฮลเซลล์',
  RECEIPT_DEPOSIT: 'ส่งใบเสร็จรับเงินมัดจำให้ลูกค้า',
  RECEIPT_FULL: 'ส่งใบเสร็จรับเงินยอดเต็มให้ลูกค้า',
};

export interface EmailTemplateConfig {
  subject: string;
  body: string;
}

/** {{placeholder}} tokens available per email type, shown as hints in the settings UI. */
export const EMAIL_PLACEHOLDERS: Record<EmailType, { key: string; label: string }[]> = {
  QUOTATION: [
    { key: 'customerName', label: 'ชื่อลูกค้า' },
    { key: 'tourName', label: 'ชื่อทัวร์' },
    { key: 'quotationNumber', label: 'เลขที่ใบเสนอราคา' },
    { key: 'grandTotal', label: 'ยอดรวมทั้งสิ้น (บาท)' },
    { key: 'viewUrl', label: 'ลิงก์ดูใบเสนอราคา' },
  ],
  BOOKING: [
    { key: 'wholesalerName', label: 'ชื่อโฮลเซลล์' },
    { key: 'tourName', label: 'ชื่อทัวร์' },
    { key: 'customTourCode', label: 'รหัสทัวร์' },
    { key: 'quotationNumber', label: 'เลขที่ใบเสนอราคา' },
    { key: 'customerName', label: 'ชื่อลูกค้า' },
    { key: 'viewUrl', label: 'ลิงก์ดูรายละเอียด' },
  ],
  RECEIPT_DEPOSIT: [
    { key: 'customerName', label: 'ชื่อลูกค้า' },
    { key: 'tourName', label: 'ชื่อทัวร์' },
    { key: 'quotationNumber', label: 'เลขที่ใบเสนอราคา' },
    { key: 'depositAmount', label: 'ยอดมัดจำ (บาท)' },
    { key: 'viewUrl', label: 'ลิงก์ดูใบเสนอราคา' },
  ],
  RECEIPT_FULL: [
    { key: 'customerName', label: 'ชื่อลูกค้า' },
    { key: 'tourName', label: 'ชื่อทัวร์' },
    { key: 'quotationNumber', label: 'เลขที่ใบเสนอราคา' },
    { key: 'grandTotal', label: 'ยอดรวมทั้งสิ้น (บาท)' },
    { key: 'viewUrl', label: 'ลิงก์ดูใบเสนอราคา' },
  ],
};

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailType, EmailTemplateConfig> = {
  QUOTATION: {
    subject: 'ใบเสนอราคา {{quotationNumber}} - {{tourName}}',
    body:
      '<p>เรียน {{customerName}}</p>' +
      '<p>ใบเสนอราคาเลขที่ {{quotationNumber}}</p>' +
      '<p>กรุณาตรวจสอบไฟล์แนบที่ส่งมาพร้อมกับอีเมลนี้</p>' +
      '<p>&nbsp;</p>' +
      '<p>**Email นี้ เป็น Email ตอบรับอัตโนมัติ ไม่สามารถตอบกลับได้</p>' +
      '<p>&nbsp;</p>' +
      '<p>สอบถามรายละเอียดและจองทัวร์ได้ที่ Line: @nexttripholiday</p>' +
      '<p>ขอแสดงความนับถือ</p>' +
      '<p>บริษัท เน็กซ์ ทริป ฮอลิเดย์ จำกัด (สำนักงานใหญ่)</p>' +
      '<p>โทรศัพท์:02-136-9144 อัตโนมัติ 16 คู่สาย โทรสาร(Fax): 02-136-9146</p>' +
      '<p>Hotline: 091-091-6364 ,091-091-6463</p>' +
      '<p>TAT License: 11/07440 ,TTAA License:1469</p>' +
      '<p>Website: https://www.nexttripholiday.com , Email : nexttripholiday@gmail.com</p>',
  },
  BOOKING: {
    subject: 'ใบจองทัวร์ {{quotationNumber}} - {{tourName}}',
    body:
      '<p>เรียน {{wholesalerName}}</p>' +
      '<p>ขอแจ้งจองทัวร์ <b>{{tourName}}</b> ({{customTourCode}}) เลขที่ใบเสนอราคา {{quotationNumber}}</p>' +
      '<p>ลูกค้า: {{customerName}}</p>' +
      '<p><a href="{{viewUrl}}" style="background:#6d28d9;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">ดูรายละเอียด</a></p>' +
      '<p>&nbsp;</p>' +
      '<p>**Email นี้ เป็น Email ตอบรับอัตโนมัติ ไม่สามารถตอบกลับได้</p>' +
      '<p>&nbsp;</p>' +
      '<p>สอบถามรายละเอียดและจองทัวร์ได้ที่ Line: @nexttripholiday</p>' +
      '<p>ขอแสดงความนับถือ</p>' +
      '<p>บริษัท เน็กซ์ ทริป ฮอลิเดย์ จำกัด (สำนักงานใหญ่)</p>' +
      '<p>โทรศัพท์:02-136-9144 อัตโนมัติ 16 คู่สาย โทรสาร(Fax): 02-136-9146</p>' +
      '<p>Hotline: 091-091-6364 ,091-091-6463</p>' +
      '<p>TAT License: 11/07440 ,TTAA License:1469</p>' +
      '<p>Website: https://www.nexttripholiday.com , Email : nexttripholiday@gmail.com</p>',
  },
  RECEIPT_DEPOSIT: {
    subject: 'ใบเสร็จรับเงินมัดจำ - {{quotationNumber}}',
    body:
      '<p>เรียน {{customerName}}</p>' +
      '<p>ทางเราได้รับชำระเงินมัดจำสำหรับทัวร์ <b>{{tourName}}</b> (เลขที่ {{quotationNumber}}) เรียบร้อยแล้ว</p>' +
      '<p>ยอดมัดจำ: <b>{{depositAmount}}</b> บาท</p>' +
      '<p><a href="{{viewUrl}}" style="background:#6d28d9;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">ดูใบเสนอราคา</a></p>' +
      '<p>&nbsp;</p>' +
      '<p>**Email นี้ เป็น Email ตอบรับอัตโนมัติ ไม่สามารถตอบกลับได้</p>' +
      '<p>&nbsp;</p>' +
      '<p>สอบถามรายละเอียดและจองทัวร์ได้ที่ Line: @nexttripholiday</p>' +
      '<p>ขอแสดงความนับถือ</p>' +
      '<p>บริษัท เน็กซ์ ทริป ฮอลิเดย์ จำกัด (สำนักงานใหญ่)</p>' +
      '<p>โทรศัพท์:02-136-9144 อัตโนมัติ 16 คู่สาย โทรสาร(Fax): 02-136-9146</p>' +
      '<p>Hotline: 091-091-6364 ,091-091-6463</p>' +
      '<p>TAT License: 11/07440 ,TTAA License:1469</p>' +
      '<p>Website: https://www.nexttripholiday.com , Email : nexttripholiday@gmail.com</p>',
  },
  RECEIPT_FULL: {
    subject: 'ใบเสร็จรับเงินยอดเต็ม - {{quotationNumber}}',
    body:
      '<p>เรียน {{customerName}}</p>' +
      '<p>ทางเราได้รับชำระเงินครบเต็มจำนวนสำหรับทัวร์ <b>{{tourName}}</b> (เลขที่ {{quotationNumber}}) เรียบร้อยแล้ว</p>' +
      '<p>ยอดรวมทั้งสิ้น: <b>{{grandTotal}}</b> บาท</p>' +
      '<p><a href="{{viewUrl}}" style="background:#6d28d9;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">ดูใบเสนอราคา</a></p>' +
      '<p>&nbsp;</p>' +
      '<p>**Email นี้ เป็น Email ตอบรับอัตโนมัติ ไม่สามารถตอบกลับได้</p>' +
      '<p>&nbsp;</p>' +
      '<p>สอบถามรายละเอียดและจองทัวร์ได้ที่ Line: @nexttripholiday</p>' +
      '<p>ขอแสดงความนับถือ</p>' +
      '<p>บริษัท เน็กซ์ ทริป ฮอลิเดย์ จำกัด (สำนักงานใหญ่)</p>' +
      '<p>โทรศัพท์:02-136-9144 อัตโนมัติ 16 คู่สาย โทรสาร(Fax): 02-136-9146</p>' +
      '<p>Hotline: 091-091-6364 ,091-091-6463</p>' +
      '<p>TAT License: 11/07440 ,TTAA License:1469</p>' +
      '<p>Website: https://www.nexttripholiday.com , Email : nexttripholiday@gmail.com</p>',
  },
};

const EVENT_KEY: Record<EmailType, string> = {
  QUOTATION: 'QUOTATION_EMAIL_SENT',
  BOOKING: 'BOOKING_EMAIL_SENT',
  RECEIPT_DEPOSIT: 'RECEIPT_DEPOSIT_EMAIL_SENT',
  RECEIPT_FULL: 'RECEIPT_FULL_EMAIL_SENT',
};

function settingKey(type: EmailType, field: 'subject' | 'body'): string {
  return `email_tpl_${type}_${field}`;
}

/** อ่าน template ที่บันทึกไว้ (ถ้ามี) รวมกับค่าเริ่มต้น */
export async function getEmailTemplates(): Promise<Record<EmailType, EmailTemplateConfig>> {
  const keys = EMAIL_TYPES.flatMap((t) => [settingKey(t, 'subject'), settingKey(t, 'body')]);
  const map = await CompanySettingService.getMany(keys);
  const result = {} as Record<EmailType, EmailTemplateConfig>;
  for (const t of EMAIL_TYPES) {
    const subject = map[settingKey(t, 'subject')];
    const body = map[settingKey(t, 'body')];
    result[t] = {
      subject: subject || DEFAULT_EMAIL_TEMPLATES[t].subject,
      body: body || DEFAULT_EMAIL_TEMPLATES[t].body,
    };
  }
  return result;
}

/** บันทึก template ของประเภทอีเมลหนึ่งประเภท (subject/body อย่างใดอย่างหนึ่งหรือทั้งคู่) */
export async function saveEmailTemplate(type: EmailType, cfg: Partial<EmailTemplateConfig>): Promise<void> {
  const patch: Record<string, string> = {};
  if (typeof cfg.subject === 'string') patch[settingKey(type, 'subject')] = cfg.subject;
  if (typeof cfg.body === 'string') patch[settingKey(type, 'body')] = cfg.body;
  if (Object.keys(patch).length) await CompanySettingService.setMany(patch);
}

/** แทนที่ {{key}} ด้วยค่าจริงใน vars (คีย์ที่ไม่พบจะถูกแทนที่ด้วยสตริงว่าง) */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}

export interface TrackingEmailQuotation {
  id: number | string;
  quotationNumber: string;
  tourName: string;
  customTourCode?: string | null;
  grandTotal: number | null;
  depositAmount: number | null;
  wholesaleId?: number | string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}

export interface TrackingEmailWholesaler {
  nameTh?: string | null;
  email?: string | null;
}

export interface TrackingEmailContent {
  eventKey: string;
  defaultTo: string;
  subject: string;
  /** Rendered body HTML (placeholders resolved), WITHOUT the emailLayout wrapper — editable in the Send Email modal. */
  bodyHtml: string;
  /** Full email HTML, i.e. emailLayout(subject, bodyHtml) — what actually gets sent. */
  html: string;
}

export function getPublicOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function formatMoney(n: number | null | undefined): string {
  return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Builds the {{key}} -> value map available to a template for the given email type. */
function buildTemplateVars(
  type: EmailType,
  q: TrackingEmailQuotation,
  wholesaler: TrackingEmailWholesaler | null,
  viewUrl: string
): Record<string, string> {
  return {
    customerName: q.customerName || '',
    tourName: q.tourName || '',
    customTourCode: q.customTourCode || '',
    quotationNumber: q.quotationNumber || '',
    grandTotal: formatMoney(q.grandTotal),
    depositAmount: formatMoney(q.depositAmount),
    wholesalerName: wholesaler?.nameTh || '',
    viewUrl,
  };
}

/**
 * Builds the subject/body/default-recipient for a tracking-system email. Pure — does not
 * send anything. `template` defaults to DEFAULT_EMAIL_TEMPLATES[type] when omitted (i.e. no
 * custom template has been saved yet in /settings/email-templates). `subjectOverride`/
 * `bodyOverride`, when provided (e.g. the employee edited them in the Send Email modal),
 * win over the template-rendered subject/body.
 */
export function buildTrackingEmailContent(
  type: EmailType,
  q: TrackingEmailQuotation,
  wholesaler: TrackingEmailWholesaler | null,
  viewUrl: string,
  template?: EmailTemplateConfig,
  subjectOverride?: string,
  bodyOverride?: string
): TrackingEmailContent {
  const tpl = template || DEFAULT_EMAIL_TEMPLATES[type];
  const vars = buildTemplateVars(type, q, wholesaler, viewUrl);
  const subject = subjectOverride?.trim() ? subjectOverride.trim() : renderTemplate(tpl.subject, vars);
  const bodyHtml = typeof bodyOverride === 'string' && bodyOverride.trim() ? bodyOverride : renderTemplate(tpl.body, vars);
  const defaultTo = type === 'BOOKING' ? wholesaler?.email || '' : q.customerEmail || '';

  return {
    eventKey: EVENT_KEY[type],
    defaultTo,
    subject,
    bodyHtml,
    html: emailLayout(subject, bodyHtml),
  };
}
