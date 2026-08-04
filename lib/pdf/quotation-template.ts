// lib/pdf/quotation-template.ts
// สร้าง HTML สำหรับใบเสนอราคา/ใบจองทัวร์ (ใช้ render เป็น PDF ด้วย Puppeteer)
// โครงสร้างอ้างอิงจากฟอร์มเดิม (mpdf_quote.blade.php) แต่ปรับให้เรนเดอร์ด้วย Chromium แทน mPDF

import fs from 'fs';
import path from 'path';
import { bahtText } from '@/lib/thai-baht-text';

// ฝังฟอนต์ Sarabun แบบ base64 (self-host) แทนการโหลดจาก fonts.googleapis.com
// เพราะเซิร์ฟเวอร์ที่รัน Puppeteer อาจไม่มีอินเทอร์เน็ตออกนอก (หรือถูกบล็อก) ทำให้ font โหลดไม่ขึ้น
// แล้ว Chromium fallback ไปใช้ font อื่นแทน หน้าตา PDF จะดูต่างจากต้นฉบับไปเลยทั้งที่โครงสร้างถูกต้อง
let cachedFontFaceCss: string | null = null;
function getFontFaceCss(): string {
  if (cachedFontFaceCss !== null) return cachedFontFaceCss;
  try {
    const dir = path.join(process.cwd(), 'node_modules', '@fontsource', 'sarabun', 'files');
    const b64 = (file: string) => fs.readFileSync(path.join(dir, file)).toString('base64');
    const thai400 = b64('sarabun-thai-400-normal.woff2');
    const latin400 = b64('sarabun-latin-400-normal.woff2');
    const thai700 = b64('sarabun-thai-700-normal.woff2');
    const latin700 = b64('sarabun-latin-700-normal.woff2');
    cachedFontFaceCss = `
      @font-face { font-family:'Sarabun'; font-style:normal; font-weight:400; font-display:swap; src:url(data:font/woff2;base64,${thai400}) format('woff2'); unicode-range: U+0E01-0E5B,U+200C-200D,U+25CC; }
      @font-face { font-family:'Sarabun'; font-style:normal; font-weight:400; font-display:swap; src:url(data:font/woff2;base64,${latin400}) format('woff2'); unicode-range: U+0000-00FF,U+2000-206F,U+2122; }
      @font-face { font-family:'Sarabun'; font-style:normal; font-weight:700; font-display:swap; src:url(data:font/woff2;base64,${thai700}) format('woff2'); unicode-range: U+0E01-0E5B,U+200C-200D,U+25CC; }
      @font-face { font-family:'Sarabun'; font-style:normal; font-weight:700; font-display:swap; src:url(data:font/woff2;base64,${latin700}) format('woff2'); unicode-range: U+0000-00FF,U+2000-206F,U+2122; }
    `;
  } catch (e) {
    console.warn('[quotation-template] self-hosted Sarabun font not found, falling back to Google Fonts CDN:', e);
    cachedFontFaceCss = '';
  }
  return cachedFontFaceCss;
}

export interface QuotationPdfItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: 'INCOME' | 'DISCOUNT' | 'FREE';
  hasWithholdingTax?: boolean;
}

export interface QuotationPdfSettings {
  logoUrl?: string | null;
  signatureUrl?: string | null;
  signatureName?: string | null;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyHotline: string;
  companyLicense: string;
  companyWebsite: string;
  companyEmail: string;
  bankName: string;
  bankType: string;
  bankBranch: string;
  bankAccount: string;
  footerNote: string;
}

export interface QuotationPdfData {
  quotationNumber: string;
  quotationDate: Date | string;
  status: string;
  cancelNote?: string | null;
  bookingCode?: string | null;
  customTourCode?: string | null;
  ntCode?: string | null;
  tourName: string;
  departureDate?: Date | string | null;
  returnDate?: Date | string | null;
  numDays?: string | null;
  customer: {
    code?: string | null;
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
  };
  saleName?: string | null;
  saleTel?: string | null;
  airlineName?: string | null;
  items: QuotationPdfItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  depositDueDate?: Date | string | null;
  depositAmount: number;
  fullPaymentDueDate?: Date | string | null;
  fullPaymentAmount: number;
  notes?: string | null;
  settings: QuotationPdfSettings;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function thaiDate(d?: Date | string | null): string {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}

function thaiTime(d?: Date | string | null): string {
  if (!d) return '-น.';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-น.';
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${hh}:${mm} น.`;
}

function money(n: number | null | undefined): string {
  return (Number(n) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildQuotationHtml(data: QuotationPdfData): string {
  const s = data.settings;
  const isCancelled = data.status === 'CANCELLED';

  const itemRows = data.items
    .map((item, idx) => {
      const label = item.itemType === 'DISCOUNT' ? `${esc(item.productName)} <b>(ส่วนลด)</b>` : esc(item.productName);
      const unitPrice = item.hasWithholdingTax ? item.unitPrice * 0.03 + item.unitPrice : item.unitPrice;
      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${label}</td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">${money(unitPrice)}</td>
          <td style="text-align:right;">${money(item.amount)}</td>
        </tr>`;
    })
    .join('');

  const period = (() => {
    if (!data.departureDate || !data.returnDate) return '-';
    const dep = new Date(data.departureDate);
    const ret = new Date(data.returnDate);
    const nights = Math.max(0, Math.round((ret.getTime() - dep.getTime()) / 86400000));
    const days = nights + 1;
    return `${dep.getDate()} - ${thaiDate(ret)}<br>(${days} วัน ${nights} คืน)`;
  })();

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>${esc(data.quotationNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  ${getFontFaceCss()}
  * { box-sizing: border-box; }
  body {
    font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
    font-size: 13px;
    color: #1f2937;
    margin: 0;
    padding: 16px;
    position: relative;
    line-height: 1.25;
  }
  table { border-collapse: collapse; width: 100%; }
  td { padding: 4px 7px; vertical-align: top; font-size: 13px; }
  .no-border td { border: none; }
  .box { border: 2px solid #ffaa50; }
  .head-table { border: 2px solid #ffaa50; }
  .head-table td { border: none; padding: 6px 8px; }
  .item-table { border: 2px solid #ffaa50; }
  .item-table th, .item-table td { border: 1px solid #ffd8ab; }
  .item-table th { background: #f9c68f; text-align: center; font-size: 13px; padding: 8px 6px; }
  .highlight { background: #f9c68f; }
  h1, h2, h3, h4, h5 { margin: 0; }
  .company-info h4 { font-size: 14px; font-weight: 700; margin-bottom: 0px; }
  .cancel-watermark {
    position: fixed;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 90px;
    color: rgba(220, 38, 38, 0.18);
    font-weight: 700;
    z-index: 100;
    white-space: nowrap;
  }
  .header-flex { display: flex; align-items: flex-start; gap: 8px; }
  .header-flex .logo { width: 80px; flex-shrink: 0; }
  .header-flex .logo img { width: 100%; }
  .header-flex .company-info { flex: 1; font-size: 11px; line-height: 1.35; text-align: left; }
  .header-flex .doc-title { width: 210px; text-align: center; flex-shrink: 0; }
  .doc-title .quote-no { background: #f9c68f; display: block; width: 100%; padding: 6px 0; margin-top: 8px; font-weight: 700; font-size: 14px; }
  .section-title { font-weight: 700; }
  footer-note { font-size: 12px; }
  .sign-table { border: 2px solid #ffaa50; }
  .sign-table td { text-align: center; border: none; border-left: 1px solid #ffd8ab; padding-top: 18px; }
  .sign-table td:first-child { border-left: none; }
  .sign-table .sign-above { height: 46px; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
  .sign-table .sign-above img { max-width: 100px; max-height: 46px; }
  .sign-table .sign-line { border-top: 1px solid #ffaa50; padding-top: 4px; margin: 6px auto 0; display: block; width: 65%; }
</style>
</head>
<body>
  ${isCancelled ? `<div class="cancel-watermark">ยกเลิก${data.cancelNote ? ` ${esc(data.cancelNote)}` : ''}</div>` : ''}

  <div class="header-flex">
    <div class="logo">${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="logo">` : ''}</div>
    <div class="company-info">
      <h4>${esc(s.companyName)}</h4>
      <div>${esc(s.companyAddress)}</div>
      <div>${esc(s.companyPhone)}</div>
      <div>${esc(s.companyHotline)}</div>
      <div>${esc(s.companyLicense)}</div>
      <div>${esc(s.companyWebsite)} , Email: ${esc(s.companyEmail)}</div>
    </div>
    <div class="doc-title">
      <h4>ใบจองทัวร์ / ใบเสนอราคา</h4>
      <h5>Booking / Quotation</h5>
      <div style="font-size:11px;">สำหรับลูกค้า (ไม่ใช่ใบกำกับภาษี)</div>
      <div class="quote-no">${esc(data.quotationNumber)}</div>
    </div>
  </div>

  <div class="head-table" style="margin-top:6px;">
  <table style="border-collapse:collapse; width:100%;">
    <tr>
      <td style="width:14%;"><b>Customer ID</b></td>
      <td style="width:36%;">${esc(data.customer.code)}</td>
      <td style="width:14%;"><b>Date</b></td>
      <td style="width:36%;">${thaiDate(data.quotationDate)}</td>
    </tr>
    <tr>
      <td><b>Name</b></td>
      <td>${esc(data.customer.name)}</td>
      <td><b>Boonking No</b></td>
      <td>${esc(data.bookingCode)}</td>
    </tr>
    <tr>
      <td><b>Address</b></td>
      <td>${esc(data.customer.address)}</td>
      <td><b>Sale</b></td>
      <td>${esc(data.saleName)}</td>
    </tr>
    <tr>
      <td><b>Mobile</b></td>
      <td>${esc(data.customer.phone)}</td>
      <td><b>Tel</b></td>
      <td>${esc(data.saleTel) || '-'}</td>
    </tr>
    <tr>
      <td><b>Tax ID</b></td>
      <td>${esc(data.customer.taxId) || '-'}</td>
      <td><b>Tour Code</b></td>
      <td>${esc(data.ntCode || data.customTourCode)}</td>
    </tr>
    <tr>
      <td><b>Email</b></td>
      <td>${esc(data.customer.email)}</td>
      <td><b>Airline</b></td>
      <td class="highlight">${esc(data.airlineName) || '-'}</td>
    </tr>
  </table>
  </div>

  <div class="head-table" style="margin-top:4px;">
    <table style="border-collapse:collapse; width:100%;">
      <tr>
        <td style="width:14%;"><b>Program</b></td>
        <td class="highlight" style="width:36%;">${esc(data.tourName)}</td>
        <td style="width:14%;"><b>Period</b></td>
        <td class="highlight" style="width:36%; text-align:center;">${period}</td>
      </tr>
    </table>
  </div>

  <div class="item-table" style="margin-top:4px;">
  <table style="border-collapse:collapse; width:100%;">
    <thead>
      <tr>
        <th style="width:6%;">ลำดับ<br>Item</th>
        <th style="width:44%;">รายการ<br>Descriptons</th>
        <th style="width:10%;">จำนวน<br>Quanily</th>
        <th style="width:18%;">ราคาต่อหน่วย<br>Unit Price</th>
        <th style="width:18%;">ราคารวม<br>Total Amout</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr style="height:${Math.max(0, 150 - data.items.length * 22)}px;">
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td colspan="3" style="border:none;"></td>
        <td style="text-align:center; font-size:12.5px; white-space:nowrap;"><b>รวมเป็นเงิน / Amount</b></td>
        <td style="text-align:right;">${money(data.subtotal)}</td>
      </tr>
      <tr>
        <td colspan="3" style="border:none;"></td>
        <td style="text-align:center; font-size:12.5px; white-space:nowrap;"><b>ภาษีมูลค่าเพิ่ม / VAT 7%</b></td>
        <td style="text-align:right;">${data.vatAmount > 0 ? money(data.vatAmount) : '-'}</td>
      </tr>
      <tr>
        <td colspan="2" class="highlight" style="text-align:center;"><b>${esc(bahtText(data.grandTotal))}</b></td>
        <td colspan="2" class="highlight" style="text-align:center;"><b>ยอดรวม / Grand Total</b></td>
        <td class="highlight" style="text-align:right;"><b>${money(data.grandTotal)}</b></td>
      </tr>
    </tbody>
  </table>
  </div>

  <div style="margin-top:4px; font-size:12px; line-height:1.3;">
    <div><b>Note :</b> ${esc(data.notes) || '-'}</div>
    <div><b>หมายเหตุ :</b> ${esc(s.footerNote)}</div>
  </div>

  <div class="head-table" style="margin-top:4px;">
  <table class="no-border" style="font-size:12px;">
    <tr>
      <td style="width:16%; white-space:nowrap;"><b>วันที่ชำระเงินมัดจำ</b></td>
      <td style="width:13%; white-space:nowrap;">${thaiDate(data.depositDueDate)}</td>
      <td style="width:10%;"><b>ก่อนเวลา</b></td>
      <td style="width:10%;">${thaiTime(data.depositDueDate)}</td>
      <td style="width:11%;"><b>จำนวนเงิน</b></td>
      <td style="width:14%; text-align:center;">${data.depositAmount > 0 ? money(data.depositAmount) : '-'}</td>
      <td style="width:8%;"><b>บาท</b></td>
    </tr>
    <tr>
      <td style="white-space:nowrap;"><b>วันที่ชำระยอดเต็ม</b></td>
      <td style="white-space:nowrap;">${thaiDate(data.fullPaymentDueDate)}</td>
      <td><b>ก่อนเวลา</b></td>
      <td>${thaiTime(data.fullPaymentDueDate)}</td>
      <td><b>จำนวนเงิน</b></td>
      <td style="text-align:center;">${data.fullPaymentAmount > 0 ? money(data.fullPaymentAmount) : '-'}</td>
      <td><b>บาท</b></td>
    </tr>
  </table>
  </div>

  <div class="sign-table" style="margin-top:6px;">
  <table style="border-collapse:collapse; width:100%; table-layout:fixed;">
    <tr>
      <td style="width:33.33%;">
        <div class="sign-above"></div>
        <span class="sign-line">Customer</span>
        <div>${thaiDate(data.quotationDate)}</div>
      </td>
      <td style="width:33.33%;">
        <div class="sign-above"><b>${esc(data.saleName)}</b></div>
        <span class="sign-line">Sale / Operation</span>
        <div>${thaiDate(data.quotationDate)}</div>
      </td>
      <td style="width:33.33%;">
        <div class="sign-above">${s.signatureUrl ? `<img src="${esc(s.signatureUrl)}" alt="signature">` : ''}</div>
        <span class="sign-line">${esc(s.signatureName) || 'ผู้อนุมัติ'}</span>
        <div>${thaiDate(data.quotationDate)}</div>
      </td>
    </tr>
  </table>
  </div>

  <div style="margin-top:4px; font-size:12px;">
    กรุณาชำระเงินค่าทัวร์ หรือตั๋วเครื่องบินโดยการโอน<br>
    <b>ชื่อบัญชี ${esc(s.companyName)}</b>
    <table class="no-border" style="margin-top:2px;">
      <tr>
        <td style="width:25%;"><b>ธนาคาร</b><br>${esc(s.bankName)}</td>
        <td style="width:25%;"><b>ประเภทบัญชี</b><br>${esc(s.bankType)}</td>
        <td style="width:25%;"><b>สาขา</b><br>${esc(s.bankBranch)}</td>
        <td style="width:25%;"><b>เลขบัญชี</b><br>${esc(s.bankAccount)}</td>
      </tr>
    </table>
    <div style="margin-top:4px;">
      <b>แจ้งชำระเงิน</b><br>
      สามารถแจ้งได้ทุกช่องทาง Line :@nexttripholiday ,อีเมล:nexttripholiday@gmail.com หรือทางไลน์กับพนักงานขายที่ท่านทำการจอง
    </div>
  </div>
</body>
</html>`;
}
