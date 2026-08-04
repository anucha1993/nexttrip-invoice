// lib/email.ts
// Outbound transactional email (quotation to customer, booking to
// wholesaler, receipts) via SMTP. Configured via the UI (ตั้งค่า > SMTP
// ผู้ส่งอีเมล, stored in company_settings — see lib/services/company-setting.ts
// and app/api/settings/smtp/route.ts), falling back to .env for any field
// not set in the DB: SMTP_HOST, SMTP_PORT, SMTP_SECURE ("true"/"false"),
// SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, SMTP_FROM_EMAIL.
// If not configured, `sendMail()` throws a clear Thai error instead of
// silently failing — callers surface that to the UI so the sale knows to
// contact an admin, rather than the checklist item silently never
// auto-checking.

import nodemailer from 'nodemailer';
import { CompanySettingService } from './services/company-setting';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

/** Resolve SMTP config: DB (company_settings) values win, .env fills in whatever is missing. */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  const rows = await CompanySettingService.getMany([
    'smtp_host',
    'smtp_port',
    'smtp_secure',
    'smtp_user',
    'smtp_pass',
    'smtp_from_name',
    'smtp_from_email',
  ]);
  const user = rows.smtp_user || process.env.SMTP_USER || '';
  return {
    host: rows.smtp_host || process.env.SMTP_HOST || '',
    port: Number(rows.smtp_port || process.env.SMTP_PORT || 587),
    secure: rows.smtp_secure ? rows.smtp_secure === 'true' : process.env.SMTP_SECURE === 'true',
    user,
    pass: rows.smtp_pass || process.env.SMTP_PASS || '',
    fromName: rows.smtp_from_name || process.env.SMTP_FROM_NAME || 'NextTrip',
    fromEmail: rows.smtp_from_email || process.env.SMTP_FROM_EMAIL || user,
  };
}

export function isSmtpConfigured(cfg: SmtpConfig): boolean {
  return Boolean(cfg.host && cfg.user && cfg.pass);
}

function buildTransporter(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

/**
 * Translate common nodemailer/SMTP errors into a clear Thai message. Gmail (and most
 * providers with 2-Step Verification) reject the account's normal login password over
 * SMTP — an App Password is required — so that specific case gets step-by-step guidance
 * instead of the raw "535 5.7.8 ... BadCredentials" text.
 */
function friendlySmtpError(e: any): string {
  const raw = e?.message || String(e);
  const code = e?.responseCode || e?.code;
  if (code === 'EAUTH' || /Username and Password not accepted/i.test(raw) || /BadCredentials/i.test(raw)) {
    return (
      'เข้าสู่ระบบ SMTP ไม่สำเร็จ (Username/Password ไม่ถูกต้อง) — ถ้าใช้ Gmail: ' +
      '1) เปิด "การยืนยันแบบ 2 ขั้นตอน (2-Step Verification)" ในบัญชี Google ก่อน ' +
      '2) สร้าง "รหัสผ่านแอป (App Password)" ที่ myaccount.google.com/apppasswords ' +
      '3) นำรหัสผ่านแอป 16 หลักนั้น (ไม่ใช่รหัสผ่านล็อกอินปกติ) มากรอกในช่อง Password ที่หน้าตั้งค่า SMTP แล้วทดสอบเชื่อมต่ออีกครั้ง'
    );
  }
  if (code === 'ESOCKET' || /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(raw)) {
    return `เชื่อมต่อเซิร์ฟเวอร์ SMTP ไม่สำเร็จ กรุณาตรวจสอบ Host/Port ให้ถูกต้อง (${raw})`;
  }
  return raw;
}

/** Verify the SMTP connection/credentials without sending an email (used by the settings UI). */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getSmtpConfig();
  if (!isSmtpConfigured(cfg)) {
    return { ok: false, error: 'ยังไม่ได้ตั้งค่าอีเมลผู้ส่ง (Host/User/Password) กรุณาตั้งค่าก่อน' };
  }
  try {
    await buildTransporter(cfg).verify();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: friendlySmtpError(e) };
  }
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path?: string; content?: Buffer }[];
  replyTo?: string;
}

/** Send an email via the configured SMTP account. Throws if not configured or on send failure. */
export async function sendMail(opts: SendMailOptions): Promise<void> {
  const cfg = await getSmtpConfig();
  if (!isSmtpConfigured(cfg)) {
    throw new Error(
      'ยังไม่ได้ตั้งค่าอีเมลผู้ส่ง (SMTP_HOST/SMTP_USER/SMTP_PASS) กรุณาตั้งค่าที่เมนู ตั้งค่า > SMTP ผู้ส่งอีเมล'
    );
  }
  try {
    await buildTransporter(cfg).sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
      replyTo: opts.replyTo,
    });
  } catch (e: any) {
    throw new Error(friendlySmtpError(e));
  }
}

/** Shared HTML wrapper so every transactional email looks consistent. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;">
    <h2 style="color:#6d28d9;margin-bottom:16px;">${title}</h2>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#9ca3af;">อีเมลนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับหากไม่จำเป็น</p>
  </div>`;
}
