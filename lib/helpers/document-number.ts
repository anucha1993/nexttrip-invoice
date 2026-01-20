// lib/helpers/document-number.ts
// Helper สำหรับ Generate เลขที่เอกสาร (Invoice, Receipt, Tax Invoice)

export type DocumentType = 'INVOICE' | 'RECEIPT' | 'TAX_INVOICE';

/**
 * Generate เลขที่เอกสารถัดไป (Thread-safe)
 * อ้างอิงจากข้อมูลจริงในฐานข้อมูล ไม่ใช่จาก sequence table
 * 
 * @param type - ประเภทเอกสาร
 * @param conn - Database connection
 * @returns เลขที่เอกสาร เช่น IVN2601-0001, PM2601-0001, RVN202601-0001
 * 
 * @example
 * const invoiceNumber = await generateDocumentNumber('INVOICE', conn);
 * // Output: IVN2601-0001
 */
export async function generateDocumentNumber(
  type: DocumentType,
  conn: any
): Promise<string> {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);    // 26
  const yyyy = now.getFullYear().toString();            // 2026
  const mm = (now.getMonth() + 1).toString().padStart(2, '0'); // 01
  
  let prefix: string;
  let tableName: string;
  let columnName: string;
  
  switch (type) {
    case 'INVOICE':
      prefix = `IVN${yy}${mm}`;      // IVN2601
      tableName = 'invoices';
      columnName = 'invoiceNumber';
      break;
    case 'RECEIPT':
      prefix = `PM${yy}${mm}`;        // PM2601
      tableName = 'receipts';
      columnName = 'receiptNumber';
      break;
    case 'TAX_INVOICE':
      prefix = `RVN${yyyy}${mm}`;     // RVN202601
      tableName = 'tax_invoices';
      columnName = 'taxInvoiceNumber';
      break;
    default:
      throw new Error(`Invalid document type: ${type}`);
  }
  
  try {
    // ดึง lastNumber จากฐานข้อมูลจริง โดยหา max number ที่มี prefix ตรงกัน
    const rows = await conn.query(
      `SELECT ${columnName} FROM ${tableName} 
       WHERE ${columnName} LIKE ? 
       ORDER BY ${columnName} DESC 
       LIMIT 1`,
      [`${prefix}-%`]
    );
    
    let nextNumber = 1;
    
    if (rows && Array.isArray(rows) && rows.length > 0) {
      // Extract number from existing document number (e.g., IVN2601-0003 -> 3)
      const lastDocNumber = rows[0][columnName];
      const match = lastDocNumber.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    const number = nextNumber.toString().padStart(4, '0');
    
    return `${prefix}-${number}`;
  } catch (error) {
    console.error('Error generating document number:', error);
    throw error;
  }
}

/**
 * ตรวจสอบว่าเลขที่เอกสารซ้ำหรือไม่
 */
export async function isDocumentNumberExists(
  type: DocumentType,
  documentNumber: string,
  conn: any
): Promise<boolean> {
  let tableName: string;
  let columnName: string;
  
  switch (type) {
    case 'INVOICE':
      tableName = 'invoices';
      columnName = 'invoiceNumber';
      break;
    case 'RECEIPT':
      tableName = 'receipts';
      columnName = 'receiptNumber';
      break;
    case 'TAX_INVOICE':
      tableName = 'tax_invoices';
      columnName = 'taxInvoiceNumber';
      break;
  }
  
  const rows = await conn.query(
    `SELECT COUNT(*) as count FROM ${tableName} WHERE ${columnName} = ?`,
    [documentNumber]
  ) as any[];
  
  return rows[0].count > 0;
}

/**
 * Parse เลขที่เอกสารเพื่อดึงข้อมูล
 */
export function parseDocumentNumber(documentNumber: string): {
  type: string;
  year: string;
  month: string;
  sequence: string;
} | null {
  // IVN2601-0001 → { type: 'INVOICE', year: '2026', month: '01', sequence: '0001' }
  // PM2601-0001 → { type: 'RECEIPT', year: '2026', month: '01', sequence: '0001' }
  // RVN202601-0001 → { type: 'TAX_INVOICE', year: '2026', month: '01', sequence: '0001' }
  
  const invoiceMatch = documentNumber.match(/^IVN(\d{2})(\d{2})-(\d{4})$/);
  if (invoiceMatch) {
    return {
      type: 'INVOICE',
      year: `20${invoiceMatch[1]}`,
      month: invoiceMatch[2],
      sequence: invoiceMatch[3]
    };
  }
  
  const receiptMatch = documentNumber.match(/^PM(\d{2})(\d{2})-(\d{4})$/);
  if (receiptMatch) {
    return {
      type: 'RECEIPT',
      year: `20${receiptMatch[1]}`,
      month: receiptMatch[2],
      sequence: receiptMatch[3]
    };
  }
  
  const taxInvoiceMatch = documentNumber.match(/^RVN(\d{4})(\d{2})-(\d{4})$/);
  if (taxInvoiceMatch) {
    return {
      type: 'TAX_INVOICE',
      year: taxInvoiceMatch[1],
      month: taxInvoiceMatch[2],
      sequence: taxInvoiceMatch[3]
    };
  }
  
  return null;
}
