// lib/helpers/slip-usage.ts
// คำนวณยอดเงินที่ "ใช้ไปแล้ว" ของสลิป/เลขอ้างอิงเดียวกัน (slipRef หรือ referenceNumber)
// รองรับการแนบสลิปใบเดียวไปใช้ชำระแบ่งได้หลายใบแจ้งหนี้/QT ตราบไม่เกินยอดเงินจริงในสลิป

export interface SlipUsageItem {
  transactionId: number;
  transactionNumber: string;
  invoiceId: number | null;
  invoiceNumber: string | null;
  quotationId: number | null;
  quotationNumber: string | null;
  customerName: string | null;
  amount: number;
  status: string;
  paymentDate: string | null;
}

export interface SlipUsageResult {
  usedAmount: number;
  usages: SlipUsageItem[];
}

/**
 * ดึงรายการธุรกรรมทั้งหมดที่เคยใช้ slipRef/referenceNumber เดียวกันนี้ไปแล้ว (ไม่รวมรายการที่ถูกยกเลิก)
 * @param excludeTransactionId ไม่รวม transaction นี้เอง (ใช้ตอนแก้ไขรายการ ไม่ให้นับตัวเองซ้ำ)
 */
export async function getSlipUsage(
  connection: any,
  params: { slipRef?: string | null; referenceNumber?: string | null; excludeTransactionId?: number }
): Promise<SlipUsageResult> {
  const { slipRef, referenceNumber, excludeTransactionId } = params;
  if (!slipRef && !referenceNumber) {
    return { usedAmount: 0, usages: [] };
  }

  const conditions: string[] = [];
  const values: any[] = [];
  if (slipRef) {
    conditions.push('ct.slipRef = ?');
    values.push(slipRef);
  }
  if (referenceNumber) {
    conditions.push('ct.referenceNumber = ?');
    values.push(referenceNumber);
  }

  let query = `
    SELECT ct.id, ct.transactionNumber, ct.invoiceId, ct.quotationId, ct.amount, ct.status, ct.paymentDate,
           i.invoiceNumber, q.quotationNumber, c.name as customerName
    FROM customer_transactions ct
    LEFT JOIN invoices i ON ct.invoiceId = i.id
    LEFT JOIN quotations q ON ct.quotationId = q.id
    LEFT JOIN customers c ON q.customerId = c.id
    WHERE (${conditions.join(' OR ')}) AND ct.status != 'CANCELLED'
  `;
  if (excludeTransactionId) {
    query += ' AND ct.id != ?';
    values.push(excludeTransactionId);
  }
  query += ' ORDER BY ct.createdAt ASC';

  const rows = await connection.query(query, values);
  const usages: SlipUsageItem[] = (rows || []).map((r: any) => ({
    transactionId: Number(r.id),
    transactionNumber: r.transactionNumber,
    invoiceId: r.invoiceId != null ? Number(r.invoiceId) : null,
    invoiceNumber: r.invoiceNumber || null,
    quotationId: r.quotationId != null ? Number(r.quotationId) : null,
    quotationNumber: r.quotationNumber || null,
    customerName: r.customerName || null,
    amount: parseFloat(r.amount) || 0,
    status: r.status,
    paymentDate: r.paymentDate || null,
  }));
  const usedAmount = Math.round(usages.reduce((sum, u) => sum + u.amount, 0) * 100) / 100;
  return { usedAmount, usages };
}

/** เอาไว้แสดง "เคยใช้กับ QT.../INV..." เป็นข้อความสั้นๆ */
export function formatSlipUsageList(usages: SlipUsageItem[]): string {
  return usages
    .map((u) => {
      const ref = [u.quotationNumber, u.invoiceNumber].filter(Boolean).join('/');
      return `${ref || u.transactionNumber} (${u.amount.toLocaleString('th-TH')} บาท)`;
    })
    .join(', ');
}
