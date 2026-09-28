// lib/pdf/document-template.ts
// สร้าง HTML สำหรับใบแจ้งหนี้ / ใบกำกับภาษี / ใบรับเงิน(ใบเสร็จ) / ใบลดหนี้
// buildInvoiceLikeHtml / buildReceiptLikeHtml พอร์ตโครงสร้าง+เนื้อหามาจากฟอร์มเดิมของระบบ Laravel ตรงๆ ตามที่ผู้ใช้ยืนยันให้ใช้:
//   accounting-nexttripholiday/resources/views/MPDF/mpdf_invoice.blade.php     -> variant: 'invoice'
//   accounting-nexttripholiday/resources/views/MPDF/mpdf_taxReceipt.blade.php -> variant: 'taxInvoice'
//   accounting-nexttripholiday/resources/views/MPDF/mpdf_payment.blade.php    -> buildReceiptLikeHtml (RECEIPT)
// (ใบลดหนี้/CREDIT_NOTE ไม่มีฟอร์มเดิมให้อ้างอิง จึงปรับจากโครงของใบรับเงินแทน ใช้ buildReceiptLikeHtml เช่นกัน)
// buildSimpleDocumentHtml (เดิม) ยังคงเก็บไว้เผื่อใช้ fallback แต่ไม่ได้เรียกใช้งานแล้ว

import { bahtText } from '@/lib/thai-baht-text';
import { getFontFaceCss, thaiDate, money, esc } from '@/lib/pdf/quotation-template';
import type { QuotationPdfSettings } from '@/lib/pdf/quotation-template';

export interface LegacyItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemType: 'INCOME' | 'DISCOUNT';
  vatType: 'NO_VAT' | 'VAT' | 'VAT_EXEMPT';
  hasWithholdingTax: boolean;
}

interface LegacyCustomerInfo {
  code?: string | null;
  name: string;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  fax?: string | null;
  taxId?: string | null;
}

export interface InvoiceLikeDocData {
  variant: 'invoice' | 'taxInvoice';
  docNumber: string;
  docDate: Date | string;
  refLabel: string;
  refNumber?: string | null;
  bookingCode?: string | null;
  tourCode?: string | null;
  status?: string | null;
  cancelNote?: string | null;
  customer: LegacyCustomerInfo;
  items: LegacyItemRow[];
  notes?: string | null;
  vatExemptAmount: number;
  preTaxAmountBeforeDiscount: number;
  discountAmount: number;
  preVatAmount: number;
  vatAmount: number;
  includeVatAmount: number;
  depositAmount: number;
  grandTotal: number;
  withholdingTax: number;
  saleName?: string | null;
  createdByName?: string | null;
  taxInvoicePaymentMethod?: string | null;
  taxInvoicePaymentDetail?: {
    referenceNumber?: string | null;
    bankAccount?: string | null;
    paymentDate?: Date | string | null;
  } | null;
  settings: QuotationPdfSettings;
}

export interface ReceiptLikeDocData {
  docTitleTh: string;
  docNumber: string;
  docDate: Date | string;
  status?: string | null;
  cancelNote?: string | null;
  customer: LegacyCustomerInfo;
  quotationNumber?: string | null;
  bookingCode?: string | null;
  tourName?: string | null;
  tourCode?: string | null;
  airlineName?: string | null;
  departureDate?: Date | string | null;
  returnDate?: Date | string | null;
  saleName?: string | null;
  invoiceNumber?: string | null;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  bankAccount?: string | null;
  paymentDate?: Date | string | null;
  reason?: string | null;
  amount: number;
  issuedByName?: string | null;
  settings: QuotationPdfSettings;
}

function legacyBaseStyles(borderColor: string, lightBorder: string): string {
  return `
    ${getFontFaceCss()}
    * { box-sizing: border-box; }
    body {
      font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
      font-size: 13px;
      color: #1f2937;
      margin: 0;
      padding: 10px;
      position: relative;
      line-height: 1.25;
    }
    table { border-collapse: collapse; width: 100%; }
    td { padding: 4px 7px; vertical-align: top; font-size: 13px; word-wrap: break-word; }
    .no-border td { border: none; }
    .head-table { border: 2px solid ${borderColor}; }
    .head-table td { border: none; padding: 6px 8px; font-size: 12px; }
    .head-table td:nth-child(1), .head-table td:nth-child(3) { white-space: nowrap; }
    .item-table { border: 2px solid ${borderColor}; }
    .item-table th, .item-table td { border: 1px solid ${lightBorder}; }
    .item-table th { text-align: center; font-size: 12px; padding: 8px 6px; }
    .item-table td.sum-label, .item-table td.sum-value { font-size: 11px; white-space: nowrap; }
    h1, h2, h3, h4, h5 { margin: 0; }
    .cancel-watermark {
      position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 90px; color: rgba(220, 38, 38, 0.18); font-weight: 700; z-index: 100; white-space: nowrap;
    }
    .header-flex { display: flex; align-items: flex-start; gap: 8px; }
    .header-flex .logo { width: 80px; flex-shrink: 0; }
    .header-flex .logo img { width: 100%; }
    .header-flex .company-info { flex: 1; font-size: 11px; line-height: 1.35; }
    .header-flex .company-info h5 { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .header-flex .doc-title { width: 210px; text-align: center; flex-shrink: 0; }
    .doc-title h4 { font-size: 14px; }
    .doc-title .doc-no { display: block; width: 100%; padding: 6px 0; margin-top: 8px; font-weight: 700; font-size: 14px; }
    .sign-table { border: 2px solid ${borderColor}; }
    .sign-table td { text-align: center; border: none; border-left: 1px solid ${lightBorder}; padding-top: 12px; font-size: 12px; }
    .sign-table td:first-child { border-left: none; }
    .sign-table .sign-above { height: 46px; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; }
    .sign-table .sign-above img { max-width: 100px; max-height: 46px; }
    .sign-table .sign-line { border-top: 1px solid ${borderColor}; padding-top: 4px; margin: 6px auto 0; display: block; width: 65%; }
  `;
}

// เดิม (mpdf_invoice.blade.php): รายการทั้งหมดอยู่ใน <tr height:300px> แถวเดียว แต่ละคอลัมน์วน <p> ทับกัน
// ไม่ใช่ 1 แถวต่อ 1 รายการ — ต้องคงโครงสร้างนี้ไว้ ไม่งั้นความสูงของตารางจะแปรผันตามจำนวนรายการ
// จนไปชนกับแถวสรุปยอด (rowspan=8) ที่ตามมาทันที
function legacyItemRows(items: LegacyItemRow[]): string {
  const vatLabel = (v: LegacyItemRow['vatType']) =>
    v === 'VAT' ? '**(VAT)' : v === 'VAT_EXEMPT' ? '**(ยกเว้นภาษี)' : '**(Non VAT)';

  const p = (html: string) => `<p style="margin:0;">${html}</p>`;

  const nos = items.map((_, idx) => p(String(idx + 1))).join('');
  const descriptions = items
    .map((item) =>
      p(
        item.itemType === 'DISCOUNT'
          ? 'ส่วนลด'
          : `${esc(item.description)} <b>&nbsp;${vatLabel(item.vatType)}</b>`
      )
    )
    .join('');
  const qtys = items.map((item) => p(String(item.quantity))).join('');
  const unitPrices = items
    .map((item) => p(money(item.hasWithholdingTax ? item.unitPrice * 1.03 : item.unitPrice)))
    .join('');
  const totals = items.map((item) => p(money(item.amount))).join('');

  return `
    <tr>
      <td style="height:295px; text-align:center; vertical-align:top;">${nos}</td>
      <td style="text-align:left; vertical-align:top;">${descriptions}</td>
      <td style="text-align:center; vertical-align:top;">${qtys}</td>
      <td style="text-align:right; vertical-align:top;">${unitPrices}</td>
      <td style="text-align:right; vertical-align:top;">${totals}</td>
    </tr>`;
}

/** ใบแจ้งหนี้ (invoice) และ ใบกำกับภาษี (taxInvoice) — โครงหน้าเดียวกับต้นฉบับ mpdf_invoice / mpdf_taxReceipt */
export function buildInvoiceLikeHtml(data: InvoiceLikeDocData): string {
  const s = data.settings;
  const isTax = data.variant === 'taxInvoice';
  const borderColor = isTax ? '#95cfff' : '#ffaa50';
  const headerBg = isTax ? '#bbdefb' : '#f9c68f';
  const lightBorder = isTax ? '#d6ecff' : '#ffd8ab';
  const isCancelled = data.status === 'CANCELLED';
  const netPayable = data.grandTotal - data.depositAmount;
  const pm = data.taxInvoicePaymentMethod;

  const paymentCheckboxes = isTax
    ? `
    <div style="margin-top:6px; font-size:12px;">
      <b>ชำระเงินโดย / Form of payment:</b><br>
      ${pm === 'CASH' ? '☑' : '☐'} <b>เงินสด</b><br>
      ${pm === 'CHEQUE' ? '☑' : '☐'} <b>เช็คธนาคาร</b>
      ${pm === 'CHEQUE' ? `เลขที่เช็ค: ${esc(data.taxInvoicePaymentDetail?.referenceNumber) || '-'} วันที่: ${thaiDate(data.taxInvoicePaymentDetail?.paymentDate)}` : ''}<br>
      ${pm === 'CREDIT_CARD' ? '☑' : '☐'} <b>บัตรเครดิต</b>
      ${pm === 'CREDIT_CARD' ? `เลขที่สลิป: ${esc(data.taxInvoicePaymentDetail?.referenceNumber) || '-'}` : ''}<br>
      ${pm === 'TRANSFER' ? '☑' : '☐'} <b>โอนเงินเข้าบัญชี</b>
      ${pm === 'TRANSFER' ? `โอนเมื่อวันที่: ${thaiDate(data.taxInvoicePaymentDetail?.paymentDate)} เข้าบัญชี: ${esc(data.taxInvoicePaymentDetail?.bankAccount) || '-'}` : ''}<br>
    </div>`
    : `
    <div style="margin-top:6px; font-size:12px;">
      <b>วิธีการชำระเงิน:</b> ชื่อบัญชี ${esc(s.companyName)}
      <table class="no-border" style="margin-top:2px;">
        <tr>
          <td style="width:25%;"><b>ธนาคาร</b><br>${esc(s.bankName) || '-'}</td>
          <td style="width:25%;"><b>ประเภทบัญชี</b><br>${esc(s.bankType) || '-'}</td>
          <td style="width:25%;"><b>สาขา</b><br>${esc(s.bankBranch) || '-'}</td>
          <td style="width:25%;"><b>เลขบัญชี</b><br>${esc(s.bankAccount) || '-'}</td>
        </tr>
      </table>
      <div style="margin-top:4px;">
        <b>แจ้งชำระเงิน:</b> ${esc(s.footerNote) || 'สามารถแจ้งการชำระเงินได้ทางอีเมลหรือไลน์กับพนักงานขายที่ท่านทำการจอง'}
      </div>
    </div>`;

  const signBlock = `
    <tr>
      <td style="width:33.33%;">
        <div class="sign-above"><b>${esc(data.saleName) || '-'}</b></div>
        <span class="sign-line">Sale / Operation</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
      <td style="width:33.33%;">
        <div class="sign-above"><b>${esc(data.createdByName) || '-'}</b></div>
        <span class="sign-line">${isTax ? 'ผู้รับเงิน / Collector' : 'ผู้วางบิล'}</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
      <td style="width:33.33%;">
        <div class="sign-above">${s.signatureUrl ? `<img src="${esc(s.signatureUrl)}" alt="signature">` : ''}</div>
        <span class="sign-line">${isTax ? 'ผู้มีอำนาจลงนาม / Authorized signature' : esc(s.signatureName) || 'ผู้อนุมัติ'}</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>${esc(data.docNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>${legacyBaseStyles(borderColor, lightBorder)}</style>
</head>
<body>
  ${isCancelled ? `<div class="cancel-watermark">ยกเลิก${data.cancelNote ? ` ${esc(data.cancelNote)}` : ''}</div>` : ''}

  <div class="header-flex">
    <div class="logo">${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="logo">` : ''}</div>
    <div class="company-info">
      <h5>${esc(s.companyName)}</h5>
      <div>${esc(s.companyAddress)}</div>
      <div>${esc(s.companyPhone)}</div>
      <div>${esc(s.companyWebsite)} , Email: ${esc(s.companyEmail)}</div>
      <div><b>เลขประจำตัวผู้เสียภาษี TaxID: ${esc(s.companyTaxId)}</b></div>
    </div>
    <div class="doc-title">
      <h4>${isTax ? 'ต้นฉบับ/ใบกำกับภาษี' : 'ต้นฉบับใบแจ้งหนี้'}</h4>
      <h5><b>${isTax ? 'Original/Tax Receipt' : 'Original Invoice'}</b></h5>
      <div style="font-size:11px;">${isTax ? '(สำหรับลูกค้า)' : 'สำหรับลูกค้า (ไม่ใช่ใบกำกับภาษี)'}</div>
    </div>
  </div>

  <div class="head-table" style="margin-top:4px;">
  <table>
    <tr>
      <td style="width:20%;"><b>ชื่อลูกค้า/Customer Name</b></td>
      <td style="width:30%;">${esc(data.customer.name)}</td>
      <td style="width:20%;"><b>เลขที่/No.</b></td>
      <td style="width:30%;">${esc(data.docNumber)}</td>
    </tr>
    <tr>
      <td><b>อีเมล์/Email</b></td>
      <td>${esc(data.customer.email) || '-'}</td>
      <td><b>วันที่/Date</b></td>
      <td>${thaiDate(data.docDate)}</td>
    </tr>
    <tr>
      <td><b>ที่อยู่/Address</b></td>
      <td>${esc(data.customer.address) || '-'}</td>
      <td><b>${esc(data.refLabel)}</b></td>
      <td>${esc(data.refNumber) || '-'}</td>
    </tr>
    <tr>
      <td><b>เบอร์โทรศัพท์/Phone No.</b></td>
      <td>${esc(data.customer.phone) || '-'}</td>
      <td><b>เลขที่จอง/Booking No.</b></td>
      <td>${esc(data.bookingCode) || '-'}</td>
    </tr>
    <tr>
      <td><b>แฟกซ์/Fax</b></td>
      <td>${esc(data.customer.fax) || '-'}</td>
      <td><b>รหัสทัวร์/Tour Code</b></td>
      <td>${esc(data.tourCode) || '-'}</td>
    </tr>
    <tr>
      <td><b>เลขประจำตัวผู้เสียภาษี/Tax ID</b></td>
      <td>${esc(data.customer.taxId) || '-'}</td>
      <td></td>
      <td></td>
    </tr>
  </table>
  </div>

  <div class="item-table" style="margin-top:4px;">
  <table>
    <thead>
      <tr style="background:${headerBg};">
        <th style="width:6%;">ลำดับ<br>Item</th>
        <th style="width:44%;">รายการ<br>Descriptons</th>
        <th style="width:10%;">จำนวน<br>Quanily</th>
        <th style="width:20%;">ราคาต่อหน่วย<br>Unit Price</th>
        <th style="width:20%;">ราคารวม<br>Total Amout</th>
      </tr>
    </thead>
    <tbody>
      ${legacyItemRows(data.items)}
      <tr>
        <td colspan="2" rowspan="8" style="text-align:left; vertical-align:top; font-size:11px;">
          **(Non VAT) = ค่าบริการไม่คิดภาษีมูลค่าเพิ่ม<br><br>
          <b>หมายเหตุ / Remark:</b><br>${esc(data.notes) || '-'}<br>
          ภาษีหัก ณ ที่จ่าย 3% : จำนวนเงิน ${money(data.withholdingTax)} บาท<br>
          (คำนวณจากยอดรวมก่อนภาษีมูลค่าเพิ่ม / Pre-VAT Amount)<br>
          ข้อสังเกต: กรุณาตรวจสอบกับบริษัทเกี่ยวกับการหักภาษี ณ ที่จ่าย 3% ภายใต้เงื่อนไขที่กำหนด
        </td>
        <td colspan="2" class="sum-label" style="text-align:right;">ยอดรวมยกเว้นภาษี / Vat-Exempted Amount</td>
        <td class="sum-value" style="text-align:right;">${money(data.vatExemptAmount)}</td>
      </tr>
      <tr>
        <td colspan="2" class="sum-label" style="text-align:right;">ราคาสุทธิสินค้าที่เสียภาษี / Pre-Tax Amount</td>
        <td class="sum-value" style="text-align:right;">${money(data.preTaxAmountBeforeDiscount)}</td>
      </tr>
      <tr>
        <td colspan="2" class="sum-label" style="text-align:right;">ส่วนลด / Discount</td>
        <td class="sum-value" style="text-align:right;">${money(data.discountAmount)}</td>
      </tr>
      <tr>
        <td colspan="2" class="sum-label" style="text-align:right;">ราคาก่อนภาษีมูลค่าเพิ่ม / Pre-VAT Amount</td>
        <td class="sum-value" style="text-align:right;">${money(data.preVatAmount)}</td>
      </tr>
      <tr>
        <td colspan="2" class="sum-label" style="text-align:right;">ภาษีมูลค่าเพิ่ม VAT 7%</td>
        <td class="sum-value" style="text-align:right;">${money(data.vatAmount)}</td>
      </tr>
      <tr>
        <td colspan="2" class="sum-label" style="text-align:right;">ราคาพร้อมภาษีมูลค่าเพิ่ม / Include VAT</td>
        <td class="sum-value" style="text-align:right;">${money(data.includeVatAmount)}</td>
      </tr>
      <tr>
        <td colspan="2" class="sum-label" style="text-align:right;">หักเงินมัดจำ / Deposit</td>
        <td class="sum-value" style="text-align:right;">${money(data.depositAmount)}</td>
      </tr>
      <tr>
        <td colspan="2" style="text-align:right;">
          <h3 style="font-size:15px;">ยอดชำระทั้งสิ้น / Grand Total</h3>
        </td>
        <td style="text-align:right;"><b>${money(netPayable)}</b></td>
      </tr>
      <tr>
        <td colspan="2" style="text-align:right;">
          <h3 style="font-size:15px;">จำนวนเงินตัวอักษร:</h3>
        </td>
        <td colspan="3" style="text-align:right; background:${headerBg};">
          <h3 style="font-size:15px;">${esc(bahtText(netPayable))}</h3>
        </td>
      </tr>
    </tbody>
  </table>
  </div>

  ${paymentCheckboxes}

  <div class="sign-table" style="margin-top:8px;">
  <table style="border-collapse:collapse; width:100%; table-layout:fixed;">
    ${signBlock}
  </table>
  </div>
</body>
</html>`;
}

/** ใบรับเงิน/ใบเสร็จรับเงิน (RECEIPT) และ ใบลดหนี้ (CREDIT_NOTE) — โครงหน้าเดียวกับต้นฉบับ mpdf_payment */
export function buildReceiptLikeHtml(data: ReceiptLikeDocData): string {
  const s = data.settings;
  const isCancelled = data.status === 'CANCELLED';
  const isCreditNote = !!data.reason;
  const themeColor = isCreditNote ? '#ffb4ab' : '#ffaa50';
  const themeBg = isCreditNote ? '#ffb4ab' : '#f9c68f';
  const lightBorder = isCreditNote ? '#ffdad5' : '#ffd8ab';

  const period = (() => {
    if (!data.departureDate || !data.returnDate) return '-';
    const dep = new Date(data.departureDate);
    const ret = new Date(data.returnDate);
    if (Number.isNaN(dep.getTime()) || Number.isNaN(ret.getTime())) return '-';
    return `${dep.getDate()}-${thaiDate(ret)}`;
  })();

  const paymentDetail = (() => {
    if (isCreditNote) return esc(data.reason);
    const pm = data.paymentMethod;
    if (pm === 'CASH') return 'เงินสด';
    if (pm === 'TRANSFER') {
      return `โอนเงินผ่านธนาคาร<br>วันที่โอน: ${thaiDate(data.paymentDate)}<br>เข้าบัญชี: ${esc(data.bankAccount) || '-'}`;
    }
    if (pm === 'CHEQUE') {
      return `เช็คธนาคาร<br>เลขที่เช็ค: ${esc(data.referenceNumber) || '-'}<br>วันที่: ${thaiDate(data.paymentDate)}`;
    }
    if (pm === 'CREDIT_CARD') {
      return `บัตรเครดิต<br>เลขที่สลิป: ${esc(data.referenceNumber) || '-'}`;
    }
    return esc(pm) || '-';
  })();

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>${esc(data.docNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>${legacyBaseStyles(themeColor, lightBorder)}</style>
</head>
<body>
  ${isCancelled ? `<div class="cancel-watermark">ยกเลิก${data.cancelNote ? ` ${esc(data.cancelNote)}` : ''}</div>` : ''}

  <div class="header-flex">
    <div class="logo">${s.logoUrl ? `<img src="${esc(s.logoUrl)}" alt="logo">` : ''}</div>
    <div class="company-info">
      <h5>${esc(s.companyName)}</h5>
      <div>${esc(s.companyAddress)}</div>
      <div>${esc(s.companyPhone)}</div>
      <div>${esc(s.companyHotline)}</div>
      <div>${esc(s.companyLicense)}</div>
      <div>${esc(s.companyWebsite)} , Email: ${esc(s.companyEmail)}</div>
    </div>
    <div class="doc-title">
      <h2 style="font-size:20px;">${esc(data.docTitleTh)}</h2>
      <div class="doc-no" style="background:${themeBg};">${esc(data.docNumber)}</div>
    </div>
  </div>

  <div class="head-table" style="margin-top:4px;">
  <table>
    <tr>
      <td style="width:14%;"><b>Customer ID</b></td>
      <td style="width:36%;">${esc(data.customer.code) || '-'}</td>
      <td style="width:14%;"><b>Date</b></td>
      <td style="width:36%;">${thaiDate(data.docDate)}</td>
    </tr>
    <tr>
      <td><b>Name</b></td>
      <td>${esc(data.customer.name)}</td>
      <td><b>Ref Quotation</b></td>
      <td>${esc(data.quotationNumber) || '-'}</td>
    </tr>
    <tr>
      <td><b>Address</b></td>
      <td>${esc(data.customer.address) || '-'}</td>
      <td><b>Booking</b></td>
      <td>${esc(data.bookingCode) || '-'}</td>
    </tr>
    <tr>
      <td><b>Mobile</b></td>
      <td>${esc(data.customer.phone) || '-'}</td>
      <td><b>Sale</b></td>
      <td>${esc(data.saleName) || '-'}</td>
    </tr>
    <tr>
      <td><b>Tax ID</b></td>
      <td>${esc(data.customer.taxId) || '-'}</td>
      <td><b>Tour Code</b></td>
      <td>${esc(data.tourCode) || '-'}</td>
    </tr>
    <tr>
      <td><b>Email</b></td>
      <td>${esc(data.customer.email) || '-'}</td>
      <td><b>Airline</b></td>
      <td style="background:${themeBg}; text-align:center;">${esc(data.airlineName) || '-'}</td>
    </tr>
    <tr>
      <td><b>${isCreditNote ? 'อ้างอิงใบแจ้งหนี้' : 'Ref Invoice'}</b></td>
      <td>${esc(data.invoiceNumber) || '-'}</td>
      <td><b>Period</b></td>
      <td style="background:${themeBg}; text-align:center;">${period}</td>
    </tr>
    <tr>
      <td><b>Program</b></td>
      <td colspan="3" style="background:${themeBg};">${esc(data.tourName) || '-'}</td>
    </tr>
  </table>
  </div>

  <div class="item-table" style="margin-top:4px;">
  <table>
    <thead>
      <tr style="background:${themeBg};">
        <th style="width:16%;">วันที่<br>Date</th>
        <th style="width:44%;">${isCreditNote ? 'เหตุผล<br>Reason' : 'วิธีชำระเงิน<br>Paid By'}</th>
        <th style="width:20%;">อ้างอิงใบแจ้งหนี้<br>Invoice Ref</th>
        <th style="width:20%;">จำนวนเงิน<br>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align:center; vertical-align:top; height:140px;">${thaiDate(data.docDate)}</td>
        <td style="vertical-align:top;">${paymentDetail}</td>
        <td style="text-align:center; vertical-align:top;">${esc(data.invoiceNumber) || '-'}</td>
        <td style="text-align:right; vertical-align:top;">${money(data.amount)}</td>
      </tr>
      <tr>
        <td colspan="2" style="text-align:right; background:${themeBg};">
          <h3 style="font-size:15px;">${esc(bahtText(data.amount))}</h3>
        </td>
        <td style="text-align:center; background:${themeBg};">
          <h3 style="font-size:14px;">ยอดรวม / Grand Total</h3>
        </td>
        <td style="text-align:right; background:${themeBg};">
          <h3 style="font-size:15px;">${money(data.amount)}</h3>
        </td>
      </tr>
    </tbody>
  </table>
  </div>

  <div class="sign-table" style="margin-top:10px;">
  <table style="border-collapse:collapse; width:100%; table-layout:fixed;">
    ${
      isCreditNote
        ? `<tr>
      <td style="width:33.33%;">
        <div class="sign-above"></div>
        <span class="sign-line">Customer</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
      <td style="width:33.33%;">
        <div class="sign-above"><b>${esc(data.issuedByName) || '-'}</b></div>
        <span class="sign-line">ผู้อนุมัติ</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
      <td style="width:33.33%;">
        <div class="sign-above">${s.signatureUrl ? `<img src="${esc(s.signatureUrl)}" alt="signature">` : ''}</div>
        <span class="sign-line">Authorized by</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
    </tr>`
        : `<tr>
      <td style="width:68%;"></td>
      <td style="width:32%;">
        <div class="sign-above">${s.signatureUrl ? `<img src="${esc(s.signatureUrl)}" alt="signature">` : ''}</div>
        <span class="sign-line">Authorized by</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
    </tr>`
    }
  </table>
  </div>
</body>
</html>`;
}

export type SimpleDocKind = 'INVOICE' | 'TAX_INVOICE' | 'RECEIPT' | 'CREDIT_NOTE';

export interface SimpleDocItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  vatType?: 'NO_VAT' | 'VAT' | 'VAT_EXEMPT';
}

export interface SimpleDocData {
  docKind: SimpleDocKind;
  docTitleTh: string;
  docTitleEn: string;
  docNumber: string;
  docDate: Date | string;
  refDocNumber?: string | null;
  refDocLabel?: string;
  status?: string | null;
  cancelNote?: string | null;
  quotationNumber?: string | null;
  tourName?: string | null;
  customer: {
    code?: string | null;
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    taxId?: string | null;
  };
  items?: SimpleDocItem[] | null;
  subtotal?: number | null;
  discountAmount?: number | null;
  vatAmount?: number | null;
  withholdingTax?: number | null;
  grandTotal: number;
  paymentMethod?: string | null;
  reason?: string | null;
  notes?: string | null;
  issuedByName?: string | null;
  settings: QuotationPdfSettings;
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'เงินสด',
  TRANSFER: 'โอนเงิน',
  CHEQUE: 'เช็ค',
  CREDIT_CARD: 'บัตรเครดิต',
};

export function buildSimpleDocumentHtml(data: SimpleDocData): string {
  const s = data.settings;
  const isCancelled = data.status === 'CANCELLED';
  const items = data.items || [];

  const itemRows = items
    .map(
      (item, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${esc(item.description)}</td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">${money(item.unitPrice)}</td>
          <td style="text-align:right;">${money(item.amount)}</td>
        </tr>`
    )
    .join('');

  const hasItems = items.length > 0;

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>${esc(data.docNumber)}</title>
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
    line-height: 1.3;
  }
  table { border-collapse: collapse; width: 100%; }
  td { padding: 4px 7px; vertical-align: top; font-size: 13px; }
  .no-border td { border: none; }
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
  .doc-title .doc-no { background: #f9c68f; display: block; width: 100%; padding: 6px 0; margin-top: 8px; font-weight: 700; font-size: 14px; }
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
      <h4>${esc(data.docTitleTh)}</h4>
      <h5>${esc(data.docTitleEn)}</h5>
      <div class="doc-no">${esc(data.docNumber)}</div>
    </div>
  </div>

  <div class="head-table" style="margin-top:6px;">
  <table style="border-collapse:collapse; width:100%;">
    <tr>
      <td style="width:14%;"><b>รหัสลูกค้า</b></td>
      <td style="width:36%;">${esc(data.customer.code)}</td>
      <td style="width:14%;"><b>วันที่</b></td>
      <td style="width:36%;">${thaiDate(data.docDate)}</td>
    </tr>
    <tr>
      <td><b>ชื่อลูกค้า</b></td>
      <td>${esc(data.customer.name)}</td>
      <td><b>${esc(data.refDocLabel) || 'อ้างอิงเอกสาร'}</b></td>
      <td>${esc(data.refDocNumber) || '-'}</td>
    </tr>
    <tr>
      <td><b>ที่อยู่</b></td>
      <td>${esc(data.customer.address) || '-'}</td>
      <td><b>ใบเสนอราคา</b></td>
      <td>${esc(data.quotationNumber) || '-'}</td>
    </tr>
    <tr>
      <td><b>เลขผู้เสียภาษี</b></td>
      <td>${esc(data.customer.taxId) || '-'}</td>
      <td><b>โปรแกรมทัวร์</b></td>
      <td>${esc(data.tourName) || '-'}</td>
    </tr>
  </table>
  </div>

  ${
    hasItems
      ? `
  <div class="item-table" style="margin-top:4px;">
  <table style="border-collapse:collapse; width:100%;">
    <thead>
      <tr>
        <th style="width:6%;">ลำดับ</th>
        <th style="width:44%;">รายการ</th>
        <th style="width:10%;">จำนวน</th>
        <th style="width:18%;">ราคาต่อหน่วย</th>
        <th style="width:18%;">ราคารวม</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr>
        <td colspan="3" style="border:none;"></td>
        <td style="text-align:center; font-size:12.5px; white-space:nowrap;"><b>รวมเป็นเงิน</b></td>
        <td style="text-align:right;">${money(data.subtotal)}</td>
      </tr>
      ${
        (data.discountAmount || 0) > 0
          ? `<tr>
        <td colspan="3" style="border:none;"></td>
        <td style="text-align:center; font-size:12.5px; white-space:nowrap;"><b>ส่วนลด</b></td>
        <td style="text-align:right;">-${money(data.discountAmount)}</td>
      </tr>`
          : ''
      }
      <tr>
        <td colspan="3" style="border:none;"></td>
        <td style="text-align:center; font-size:12.5px; white-space:nowrap;"><b>ภาษีมูลค่าเพิ่ม 7%</b></td>
        <td style="text-align:right;">${(data.vatAmount || 0) > 0 ? money(data.vatAmount) : '-'}</td>
      </tr>
      ${
        (data.withholdingTax || 0) > 0
          ? `<tr>
        <td colspan="3" style="border:none;"></td>
        <td style="text-align:center; font-size:12.5px; white-space:nowrap;"><b>หัก ณ ที่จ่าย 3%</b></td>
        <td style="text-align:right;">-${money(data.withholdingTax)}</td>
      </tr>`
          : ''
      }
      <tr>
        <td colspan="2" class="highlight" style="text-align:center;"><b>${esc(bahtText(data.grandTotal))}</b></td>
        <td colspan="2" class="highlight" style="text-align:center;"><b>ยอดรวมสุทธิ</b></td>
        <td class="highlight" style="text-align:right;"><b>${money(data.grandTotal)}</b></td>
      </tr>
    </tbody>
  </table>
  </div>`
      : `
  <div class="head-table" style="margin-top:4px;">
  <table style="border-collapse:collapse; width:100%;">
    <tr>
      <td style="width:25%;"><b>วิธีการชำระเงิน</b></td>
      <td style="width:25%;">${esc(PAYMENT_METHOD_LABEL[data.paymentMethod || ''] || data.paymentMethod || '-')}</td>
      <td style="width:25%;"><b>${data.reason ? 'เหตุผล' : 'จำนวนเงิน'}</b></td>
      <td style="width:25%;">${data.reason ? esc(data.reason) : `${money(data.grandTotal)} บาท`}</td>
    </tr>
  </table>
  </div>
  <div class="item-table" style="margin-top:4px;">
  <table style="border-collapse:collapse; width:100%;">
    <tr>
      <td colspan="2" class="highlight" style="text-align:center; padding:14px 8px;"><b>${esc(bahtText(data.grandTotal))}</b></td>
      <td class="highlight" style="text-align:center; width:30%;"><b>จำนวนเงินรวม</b></td>
      <td class="highlight" style="text-align:right; width:20%;"><b>${money(data.grandTotal)}</b></td>
    </tr>
  </table>
  </div>`
  }

  <div style="margin-top:4px; font-size:12px; line-height:1.3;">
    <div><b>หมายเหตุ :</b> ${esc(data.notes) || '-'}</div>
  </div>

  <div class="sign-table" style="margin-top:10px;">
  <table style="border-collapse:collapse; width:100%; table-layout:fixed;">
    <tr>
      <td style="width:33.33%;">
        <div class="sign-above"></div>
        <span class="sign-line">ผู้รับเงิน / ผู้ออกเอกสาร</span>
        <div>${esc(data.issuedByName) || '-'}</div>
      </td>
      <td style="width:33.33%;">
        <div class="sign-above"></div>
        <span class="sign-line">ลูกค้า</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
      <td style="width:33.33%;">
        <div class="sign-above">${s.signatureUrl ? `<img src="${esc(s.signatureUrl)}" alt="signature">` : ''}</div>
        <span class="sign-line">${esc(s.signatureName) || 'ผู้อนุมัติ'}</span>
        <div>${thaiDate(data.docDate)}</div>
      </td>
    </tr>
  </table>
  </div>
</body>
</html>`;
}
