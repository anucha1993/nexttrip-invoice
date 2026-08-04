// lib/pdf/quotation-pdf.ts
// ดึงข้อมูลใบเสนอราคา + ตั้งค่าหัวเอกสาร แล้ว render เป็น PDF ด้วย Puppeteer

import pool from '@/lib/db';
import { CompanySettingService } from '@/lib/services/company-setting';
import { fetchSale, fetchAirlines } from '@/lib/services/tour-api';
import { buildQuotationHtml, QuotationPdfData } from '@/lib/pdf/quotation-template';

const LETTERHEAD_KEYS = [
  'quotation_pdf_logo_url',
  'quotation_pdf_signature_url',
  'quotation_pdf_signature_name',
  'quotation_pdf_company_name',
  'quotation_pdf_company_address',
  'quotation_pdf_company_phone',
  'quotation_pdf_company_hotline',
  'quotation_pdf_company_license',
  'quotation_pdf_company_website',
  'quotation_pdf_company_email',
  'quotation_pdf_bank_name',
  'quotation_pdf_bank_type',
  'quotation_pdf_bank_branch',
  'quotation_pdf_bank_account',
  'quotation_pdf_footer_note',
] as const;

export const LETTERHEAD_DEFAULTS: Record<(typeof LETTERHEAD_KEYS)[number], string> = {
  quotation_pdf_logo_url: '',
  quotation_pdf_signature_url: '',
  quotation_pdf_signature_name: 'ผู้อนุมัติ',
  quotation_pdf_company_name: 'บริษัท เน็กซ์ ทริป ฮอลิเดย์ จำกัด (สำนักงานใหญ่)',
  quotation_pdf_company_address: '222/2 โกลเด้นทาวน์ บางนา-สวนหลวง แขวงดอกไม้ เขตประเวศ กทม 10250',
  quotation_pdf_company_phone: 'โทรศัพท์: 02-136-9144 อัตโนมัติ 16 คู่สาย โทรสาร (Fax): 02-136-9146',
  quotation_pdf_company_hotline: 'Hotline: 091-091-6364, 091-091-6463',
  quotation_pdf_company_license: 'TAT License: 11/07440, TTAA License: 1469',
  quotation_pdf_company_website: 'https://www.nexttripholiday.com',
  quotation_pdf_company_email: 'nexttripholiday@gmail.com',
  quotation_pdf_bank_name: '',
  quotation_pdf_bank_type: '',
  quotation_pdf_bank_branch: '',
  quotation_pdf_bank_account: '',
  quotation_pdf_footer_note:
    'หากไม่ชำระเงินตามกำหนด ทางบริษัทฯ ขอสงวนสิทธิ์ในการตัดที่นั่งโดยไม่แจ้งให้ทราบล่วงหน้า / สำเนาพาสปอร์ตกรุณาจัดส่งให้บริษัทก่อนเดินทาง 30 วัน',
};

export async function getLetterheadSettings() {
  const values = await CompanySettingService.getMany([...LETTERHEAD_KEYS]);
  const merged: Record<string, string> = {};
  for (const key of LETTERHEAD_KEYS) {
    merged[key] = values[key] || LETTERHEAD_DEFAULTS[key];
  }
  return merged;
}

async function loadQuotationPdfData(id: string | number): Promise<QuotationPdfData | null> {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        q.quotationNumber, q.bookingCode, q.customTourCode, q.ntCode, q.tourName,
        q.departureDate, q.returnDate, q.numDays, q.airlineId, q.saleId,
        q.quotationDate, q.depositDueDate, q.depositAmount,
        q.fullPaymentDueDate, q.fullPaymentAmount,
        q.subtotal, q.vatAmount, q.grandTotal, q.status, q.cancelNote, q.notes,
        c.code as customerCode, c.name as customerName, c.address as customerAddress,
        c.phone as customerPhone, c.email as customerEmail, c.taxId as customerTaxId
      FROM quotations q
      LEFT JOIN customers c ON q.customerId = c.id
      WHERE q.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const q = rows[0];

    const items = await conn.query(
      `SELECT productName, quantity, unitPrice, amount, itemType, hasWithholdingTax
       FROM quotation_items
       WHERE quotationId = ?
       ORDER BY sortOrder ASC`,
      [id]
    );

    let saleName: string | null = null;
    // tour-api's `users` table (sale staff) has no phone column, so there is
    // no phone number to show here — kept as null (template falls back to '-').
    const saleTel: string | null = null;
    if (q.saleId) {
      const sale = await fetchSale(Number(q.saleId));
      if (sale) {
        saleName = sale.name;
      }
    }

    let airlineName: string | null = null;
    if (q.airlineId) {
      const airlines = await fetchAirlines().catch(() => []);
      airlineName = airlines.find((a) => a.id === Number(q.airlineId))?.name || null;
    }

    const settings = await getLetterheadSettings();

    return {
      quotationNumber: q.quotationNumber,
      quotationDate: q.quotationDate,
      status: q.status,
      cancelNote: q.cancelNote,
      bookingCode: q.bookingCode,
      customTourCode: q.customTourCode,
      ntCode: q.ntCode,
      tourName: q.tourName,
      departureDate: q.departureDate,
      returnDate: q.returnDate,
      numDays: q.numDays,
      customer: {
        code: q.customerCode,
        name: q.customerName,
        address: q.customerAddress,
        phone: q.customerPhone,
        email: q.customerEmail,
        taxId: q.customerTaxId,
      },
      saleName,
      saleTel,
      airlineName,
      items: items.map((item: any) => ({
        productName: item.productName,
        quantity: Number(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        amount: parseFloat(item.amount) || 0,
        itemType: item.itemType,
        hasWithholdingTax: !!item.hasWithholdingTax,
      })),
      subtotal: parseFloat(q.subtotal) || 0,
      vatAmount: parseFloat(q.vatAmount) || 0,
      grandTotal: parseFloat(q.grandTotal) || 0,
      depositDueDate: q.depositDueDate,
      depositAmount: parseFloat(q.depositAmount) || 0,
      fullPaymentDueDate: q.fullPaymentDueDate,
      fullPaymentAmount: parseFloat(q.fullPaymentAmount) || 0,
      notes: q.notes,
      settings: {
        logoUrl: settings.quotation_pdf_logo_url,
        signatureUrl: settings.quotation_pdf_signature_url,
        signatureName: settings.quotation_pdf_signature_name,
        companyName: settings.quotation_pdf_company_name,
        companyAddress: settings.quotation_pdf_company_address,
        companyPhone: settings.quotation_pdf_company_phone,
        companyHotline: settings.quotation_pdf_company_hotline,
        companyLicense: settings.quotation_pdf_company_license,
        companyWebsite: settings.quotation_pdf_company_website,
        companyEmail: settings.quotation_pdf_company_email,
        bankName: settings.quotation_pdf_bank_name,
        bankType: settings.quotation_pdf_bank_type,
        bankBranch: settings.quotation_pdf_bank_branch,
        bankAccount: settings.quotation_pdf_bank_account,
        footerNote: settings.quotation_pdf_footer_note,
      },
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

/** สร้าง PDF ของใบเสนอราคา คืนค่าเป็น Buffer หรือ null ถ้าไม่พบใบเสนอราคานี้ */
export async function generateQuotationPdf(id: string | number): Promise<Buffer | null> {
  const data = await loadQuotationPdfData(id);
  if (!data) return null;

  const html = buildQuotationHtml(data);
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
