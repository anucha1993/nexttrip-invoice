// lib/validations/invoice.ts
// Validation logic สำหรับ Invoice

/**
 * ตรวจสอบว่า Quotation สามารถสร้าง Invoice ได้หรือไม่
 */
export async function validateQuotationForInvoice(
  quotationId: number,
  conn: any
): Promise<{ valid: boolean; error?: string }> {
  // 1. ตรวจสอบว่า Quotation มีอยู่จริง
  const quotations = await conn.query(
    'SELECT id, status, grandTotal FROM quotations WHERE id = ?',
    [quotationId]
  );
  
  if (!quotations || quotations.length === 0) {
    return { valid: false, error: 'Quotation not found' };
  }
  
  const quotation = quotations[0];
  
  // 2. ตรวจสอบว่า Quotation มีสถานะ CONFIRMED หรือ COMPLETED
  if (quotation.status !== 'CONFIRMED' && quotation.status !== 'COMPLETED') {
    return { 
      valid: false, 
      error: `Quotation must be CONFIRMED (current: ${quotation.status})` 
    };
  }
  
  return { valid: true };
}

/**
 * คำนวณจำนวนเงินคงเหลือของ Quotation
 * (grandTotal ของ Quotation - ยอดรวม Invoices ทั้งหมด)
 */
export async function getQuotationRemainingAmount(
  quotationId: number,
  conn: any
): Promise<number> {
  // ดึง grandTotal ของ Quotation
  const quotations = await conn.query(
    'SELECT grandTotal FROM quotations WHERE id = ?',
    [quotationId]
  );
  
  if (!quotations || quotations.length === 0) {
    throw new Error('Quotation not found');
  }
  
  const quotationTotal = quotations[0].grandTotal;
  
  // รวมยอด Invoices ที่ไม่ใช่ CANCELLED หรือ VOIDED
  const invoices = await conn.query(
    `SELECT COALESCE(SUM(grandTotal), 0) as totalInvoiced 
     FROM invoices 
     WHERE quotationId = ? 
     AND status NOT IN ('CANCELLED', 'VOIDED')`,
    [quotationId]
  );
  
  const totalInvoiced = invoices[0]?.totalInvoiced || 0;
  
  return quotationTotal - totalInvoiced;
}

/**
 * ตรวจสอบว่ายอดเงินของ Invoice ไม่เกินยอดคงเหลือ
 */
export async function validateInvoiceAmount(
  quotationId: number,
  invoiceAmount: number,
  excludeInvoiceId: number | null, // ใช้สำหรับ update (ไม่นับ invoice ปัจจุบัน)
  conn: any
): Promise<{ valid: boolean; error?: string; remaining?: number }> {
  // คำนวณยอดคงเหลือ
  const quotations = await conn.query(
    'SELECT grandTotal FROM quotations WHERE id = ?',
    [quotationId]
  );
  
  if (!quotations || quotations.length === 0) {
    return { valid: false, error: 'Quotation not found' };
  }
  
  const quotationTotal = quotations[0].grandTotal;
  
  // รวมยอด Invoices (ไม่รวม invoice ที่กำลัง update)
  let query = `
    SELECT COALESCE(SUM(grandTotal), 0) as totalInvoiced 
    FROM invoices 
    WHERE quotationId = ? 
    AND status NOT IN ('CANCELLED', 'VOIDED')
  `;
  const params: any[] = [quotationId];
  
  if (excludeInvoiceId) {
    query += ' AND id != ?';
    params.push(excludeInvoiceId);
  }
  
  const invoices = await conn.query(query, params);
  const totalInvoiced = invoices[0]?.totalInvoiced || 0;
  const remaining = quotationTotal - totalInvoiced;
  
  if (invoiceAmount > remaining) {
    return { 
      valid: false, 
      error: `Invoice amount (${invoiceAmount}) exceeds remaining amount (${remaining})`,
      remaining 
    };
  }
  
  return { valid: true, remaining };
}

/**
 * ตรวจสอบว่ายอดรวมของ Items = subtotal (ก่อน VAT)
 * หรือถ้า copy จาก quotation โดยตรง ให้ skip validation
 */
export function validateInvoiceItems(
  items: any[], 
  expectedSubtotal: number,
  skipValidation: boolean = false
): {
  valid: boolean;
  error?: string;
  calculatedTotal?: number;
} {
  if (!items || items.length === 0) {
    return { valid: false, error: 'Invoice must have at least one item' };
  }
  
  // Skip validation ถ้า copy มาจาก quotation โดยตรง
  if (skipValidation) {
    return { valid: true };
  }
  
  const calculatedTotal = items.reduce((sum, item) => {
    const amount = parseFloat(item.amount) || 0;
    // ถ้าเป็น DISCOUNT ให้ลบ
    return item.itemType === 'DISCOUNT' ? sum - Math.abs(amount) : sum + amount;
  }, 0);
  
  const expected = parseFloat(String(expectedSubtotal)) || 0;
  
  // ใช้ toFixed(2) เพื่อเปรียบเทียบทศนิยม
  if (calculatedTotal.toFixed(2) !== expected.toFixed(2)) {
    return {
      valid: false,
      error: `Items total (${calculatedTotal.toFixed(2)}) does not match subtotal (${expected.toFixed(2)})`,
      calculatedTotal
    };
  }
  
  return { valid: true, calculatedTotal };
}

/**
 * ตรวจสอบว่า Invoice สามารถ Cancel ได้หรือไม่
 */
export async function canCancelInvoice(
  invoiceId: number,
  conn: any
): Promise<{ canCancel: boolean; error?: string; relatedDocuments?: any[] }> {
  // ดึงข้อมูล Invoice
  const invoices = await conn.query(
    'SELECT id, status, invoiceNumber FROM invoices WHERE id = ?',
    [invoiceId]
  );
  
  if (!invoices || invoices.length === 0) {
    return { canCancel: false, error: 'Invoice not found' };
  }
  
  const invoice = invoices[0];
  
  // ตรวจสอบสถานะ
  if (invoice.status === 'CANCELLED' || invoice.status === 'VOIDED') {
    return { canCancel: false, error: 'Invoice already cancelled' };
  }
  
  return { canCancel: true };
}
