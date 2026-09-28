// lib/pdf/document-pdf.ts
// ดึงข้อมูลใบแจ้งหนี้ / ใบกำกับภาษี / ใบเสร็จรับเงิน / ใบลดหนี้ แล้ว render เป็น PDF ด้วย Puppeteer
// ใช้หัวเอกสาร (โลโก้/ที่อยู่บริษัท/บัญชีธนาคาร) ชุดเดียวกับใบเสนอราคา (getLetterheadSettings)

import pool from '@/lib/db';
import { getLetterheadSettings } from '@/lib/pdf/quotation-pdf';
import { fetchSale, fetchAirlines } from '@/lib/services/tour-api';
import {
  buildInvoiceLikeHtml,
  buildReceiptLikeHtml,
  InvoiceLikeDocData,
  ReceiptLikeDocData,
} from '@/lib/pdf/document-template';

async function loadSettings() {
  const settings = await getLetterheadSettings();
  return {
    logoUrl: settings.quotation_pdf_logo_url,
    signatureUrl: settings.quotation_pdf_signature_url,
    signatureName: settings.quotation_pdf_signature_name,
    companyName: settings.quotation_pdf_company_name,
    companyAddress: settings.quotation_pdf_company_address,
    companyPhone: settings.quotation_pdf_company_phone,
    companyHotline: settings.quotation_pdf_company_hotline,
    companyLicense: settings.quotation_pdf_company_license,
    companyTaxId: settings.quotation_pdf_company_tax_id,
    companyWebsite: settings.quotation_pdf_company_website,
    companyEmail: settings.quotation_pdf_company_email,
    bankName: settings.quotation_pdf_bank_name,
    bankType: settings.quotation_pdf_bank_type,
    bankBranch: settings.quotation_pdf_bank_branch,
    bankAccount: settings.quotation_pdf_bank_account,
    footerNote: settings.quotation_pdf_footer_note,
  };
}

async function loadSaleName(saleId: number | null | undefined): Promise<string | null> {
  if (!saleId) return null;
  const sale = await fetchSale(Number(saleId)).catch(() => null);
  return sale?.name || null;
}

async function loadAirlineName(airlineId: number | null | undefined): Promise<string | null> {
  if (!airlineId) return null;
  const airlines = await fetchAirlines().catch(() => []);
  return airlines.find((a) => a.id === Number(airlineId))?.name || null;
}

/** ใบแจ้งหนี้ (invoice) หรือ ใบกำกับภาษี (taxInvoice = true) — พอร์ตตรงจาก mpdf_invoice.blade.php / mpdf_taxReceipt.blade.php */
async function loadInvoiceDocData(id: string | number, asTaxInvoice: boolean): Promise<InvoiceLikeDocData | null> {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        i.*, q.quotationNumber, q.bookingCode, q.customTourCode, q.ntCode, q.saleId,
        c.name as customerName, c.address as customerAddress,
        c.phone as customerPhone, c.email as customerEmail, c.taxId as customerTaxId
      FROM invoices i
      LEFT JOIN quotations q ON i.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      WHERE i.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const inv = rows[0];

    if (asTaxInvoice && !inv.hasTaxInvoice) return null;

    const items = await conn.query(
      `SELECT description, quantity, unitPrice, amount, itemType, vatType, hasWithholdingTax
       FROM invoice_items WHERE invoiceId = ? ORDER BY sortOrder ASC`,
      [id]
    );

    // สำหรับใบกำกับภาษี: ดึงข้อมูลการชำระเงินล่าสุดที่ยืนยันแล้วของใบแจ้งหนี้นี้ มาแสดงเป็น checkbox วิธีชำระเงิน
    let taxInvoicePaymentMethod: string | null = null;
    let taxInvoicePaymentDetail: InvoiceLikeDocData['taxInvoicePaymentDetail'] = null;
    if (asTaxInvoice) {
      const txRows = await conn.query(
        `SELECT paymentMethod, referenceNumber, bankAccount, paymentDate
         FROM customer_transactions
         WHERE invoiceId = ? AND transactionType = 'PAYMENT' AND status = 'CONFIRMED'
         ORDER BY paymentDate DESC, id DESC LIMIT 1`,
        [id]
      );
      if (txRows && txRows.length > 0) {
        taxInvoicePaymentMethod = txRows[0].paymentMethod;
        taxInvoicePaymentDetail = {
          referenceNumber: txRows[0].referenceNumber,
          bankAccount: txRows[0].bankAccount,
          paymentDate: txRows[0].paymentDate,
        };
      }
    }

    const saleName = await loadSaleName(inv.saleId);
    const settings = await loadSettings();

    const discountAmount = parseFloat(inv.discountAmount) || 0;
    const vatExemptAmount = parseFloat(inv.vatExemptAmount) || 0;
    const preVatAmount = parseFloat(inv.preTaxAmount) || 0; // DB "preTaxAmount" = ยอดหลังหักส่วนลด ก่อน VAT (ตรงกับ legacy "Pre-VAT Amount")
    const vatAmount = parseFloat(inv.vatAmount) || 0;
    const depositAmount = parseFloat(inv.depositAmount) || 0;

    return {
      variant: asTaxInvoice ? 'taxInvoice' : 'invoice',
      docNumber: asTaxInvoice ? inv.taxInvoiceNumber : inv.invoiceNumber,
      docDate: asTaxInvoice ? inv.taxInvoiceIssuedAt : inv.invoiceDate,
      refLabel: asTaxInvoice ? 'เลขที่อ้างอิง/Ref No.' : 'เลขที่อ้างอิง/Ref No.',
      refNumber: asTaxInvoice ? inv.invoiceNumber : inv.quotationNumber,
      bookingCode: inv.bookingCode,
      tourCode: inv.ntCode || inv.customTourCode,
      status: inv.status,
      cancelNote: inv.cancelReason,
      customer: {
        name: inv.customerName,
        address: inv.customerAddress,
        phone: inv.customerPhone,
        email: inv.customerEmail,
        taxId: inv.customerTaxId,
      },
      items: items.map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        amount: parseFloat(item.amount) || 0,
        itemType: item.itemType,
        vatType: item.vatType,
        hasWithholdingTax: !!item.hasWithholdingTax,
      })),
      notes: inv.notes,
      vatExemptAmount,
      preTaxAmountBeforeDiscount: preVatAmount + discountAmount, // ย้อนกลับยอดก่อนหักส่วนลด (legacy "Pre-Tax Amount")
      discountAmount,
      preVatAmount,
      vatAmount,
      includeVatAmount: preVatAmount + vatAmount,
      depositAmount,
      grandTotal: parseFloat(inv.grandTotal) || 0,
      withholdingTax: parseFloat(inv.withholdingTax) || 0,
      saleName,
      createdByName: asTaxInvoice ? (inv.taxInvoiceIssuedByName || inv.createdByName) : inv.createdByName,
      taxInvoicePaymentMethod,
      taxInvoicePaymentDetail,
      settings,
    };
  } finally {
    if (conn) conn.release();
  }
}

/** ใบเสร็จรับเงิน (RECEIPT) — พอร์ตตรงจาก mpdf_payment.blade.php */
async function loadReceiptDocData(id: string | number): Promise<ReceiptLikeDocData | null> {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        r.*, ct.referenceNumber, ct.bankAccount,
        i.invoiceNumber, q.quotationNumber, q.bookingCode, q.tourName, q.saleId,
        c.name as customerName, c.address as customerAddress,
        c.phone as customerPhone, c.email as customerEmail, c.taxId as customerTaxId
      FROM receipts r
      LEFT JOIN customer_transactions ct ON r.transactionId = ct.id
      LEFT JOIN invoices i ON r.invoiceId = i.id
      LEFT JOIN quotations q ON r.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      WHERE r.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    const saleName = await loadSaleName(r.saleId);
    const airlineName = await loadAirlineName(r.airlineId);
    const settings = await loadSettings();

    return {
      docTitleTh: 'ใบเสร็จรับเงิน',
      docNumber: r.receiptNumber,
      docDate: r.paymentDate,
      status: r.status === 'CANCELLED' ? 'CANCELLED' : null,
      cancelNote: r.cancelReason,
      customer: {
        code: r.customerCode,
        name: r.customerName,
        address: r.customerAddress,
        phone: r.customerPhone,
        email: r.customerEmail,
        taxId: r.customerTaxId,
      },
      quotationNumber: r.quotationNumber,
      bookingCode: r.bookingCode,
      tourName: r.tourName,
      tourCode: r.ntCode || r.customTourCode,
      airlineName,
      departureDate: r.departureDate,
      returnDate: r.returnDate,
      saleName,
      invoiceNumber: r.invoiceNumber,
      paymentMethod: r.paymentMethod,
      referenceNumber: r.referenceNumber,
      bankAccount: r.bankAccount,
      paymentDate: r.paymentDate,
      amount: parseFloat(r.amount) || 0,
      issuedByName: r.issuedByName,
      settings,
    };
  } finally {
    if (conn) conn.release();
  }
}

/** ใบลดหนี้ (CREDIT_NOTE) — ไม่มีฟอร์มเดิมให้อ้างอิง จึงปรับจากโครงของใบเสร็จรับเงิน */
async function loadCreditNoteDocData(id: string | number): Promise<ReceiptLikeDocData | null> {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        cn.*,
        i.invoiceNumber, q.quotationNumber, q.bookingCode, q.tourName, q.saleId,
        q.customTourCode, q.ntCode, q.airlineId, q.departureDate, q.returnDate,
        c.code as customerCode, c.name as customerName, c.address as customerAddress,
        c.phone as customerPhone, c.email as customerEmail, c.taxId as customerTaxId
      FROM credit_notes cn
      LEFT JOIN invoices i ON cn.invoiceId = i.id
      LEFT JOIN quotations q ON cn.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      WHERE cn.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const cn = rows[0];

    const saleName = await loadSaleName(cn.saleId);
    const airlineName = await loadAirlineName(cn.airlineId);
    const settings = await loadSettings();

    return {
      docTitleTh: 'ใบลดหนี้',
      docNumber: cn.creditNoteNumber,
      docDate: cn.refundDate,
      status: cn.status === 'CANCELLED' ? 'CANCELLED' : null,
      cancelNote: cn.cancelReason,
      customer: {
        code: cn.customerCode,
        name: cn.customerName,
        address: cn.customerAddress,
        phone: cn.customerPhone,
        email: cn.customerEmail,
        taxId: cn.customerTaxId,
      },
      quotationNumber: cn.quotationNumber,
      bookingCode: cn.bookingCode,
      tourName: cn.tourName,
      tourCode: cn.ntCode || cn.customTourCode,
      airlineName,
      departureDate: cn.departureDate,
      returnDate: cn.returnDate,
      saleName,
      invoiceNumber: cn.invoiceNumber,
      reason: cn.reason,
      amount: parseFloat(cn.amount) || 0,
      issuedByName: cn.issuedByName,
      settings,
    };
  } finally {
    if (conn) conn.release();
  }
}

let browserSingleton: import('puppeteer').Browser | null = null;
async function getBrowser() {
  if (!browserSingleton || !browserSingleton.connected) {
    const puppeteer = await import('puppeteer');
    browserSingleton = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserSingleton;
}

async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluateHandle('document.fonts.ready');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '8mm', right: '8mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function generateInvoicePdf(id: string | number, asTaxInvoice: boolean): Promise<Buffer | null> {
  const data = await loadInvoiceDocData(id, asTaxInvoice);
  if (!data) return null;
  return renderHtmlToPdf(buildInvoiceLikeHtml(data));
}

export async function generateReceiptPdf(id: string | number): Promise<Buffer | null> {
  const data = await loadReceiptDocData(id);
  if (!data) return null;
  return renderHtmlToPdf(buildReceiptLikeHtml(data));
}

export async function generateCreditNotePdf(id: string | number): Promise<Buffer | null> {
  const data = await loadCreditNoteDocData(id);
  if (!data) return null;
  return renderHtmlToPdf(buildReceiptLikeHtml(data));
}
