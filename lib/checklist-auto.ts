// lib/checklist-auto.ts
// Auto-checking for the post-sale "Tracking System" checklist
// (checklist_items / quotation_checklist_status — see migrations/021).
//
// Real business events (sending an email, confirming a refund, recording a
// purchase tax, uploading a WHT document, ...) call `markChecklistAuto()`
// with the matching event key. Any ACTIVE checklist item whose
// `autoEventKey` matches gets checked automatically with source='AUTO'.
// The sale can still manually re-tick/untick afterwards (that goes through
// the PUT /api/quotations/[id]/checklist route with source='MANUAL')
// as long as the item's `allowManualOverride` is 1.
//
// IMPORTANT: this is called AFTER the caller's own DB transaction has
// already committed, using its own connection from the pool. Failures here
// are logged but never thrown — a checklist-marking hiccup must never fail
// the real business operation (payment/refund/tax record) that triggered it.

import pool from '@/lib/db';

/** Fixed catalog of auto-trigger event keys, shown in the Settings UI dropdown. */
export const CHECKLIST_EVENT_KEYS: { key: string; label: string }[] = [
  { key: 'QUOTATION_EMAIL_SENT', label: 'ส่งอีเมลใบเสนอราคาให้ลูกค้า' },
  { key: 'BOOKING_EMAIL_SENT', label: 'ส่งอีเมลใบจองทัวร์ให้โฮลเซลล์' },
  { key: 'RECEIPT_DEPOSIT_EMAIL_SENT', label: 'ส่งอีเมลใบเสร็จมัดจำให้ลูกค้า' },
  { key: 'RECEIPT_FULL_EMAIL_SENT', label: 'ส่งอีเมลใบเสร็จยอดเต็มให้ลูกค้า' },
  { key: 'CUSTOMER_WHT_DOC_UPLOADED', label: 'อัปโหลดใบหัก ณ ที่จ่ายของลูกค้า' },
  { key: 'WHT_ISSUED_TO_WHOLESALER', label: 'บันทึกใบภาษีซื้อแบบมีหัก ณ ที่จ่าย (ออกให้โฮลเซลล์)' },
  { key: 'PURCHASE_TAX_RECORDED', label: 'บันทึกใบภาษีซื้อ (ได้รับจากโฮลเซลล์)' },
  { key: 'WHOLESALE_REFUND_CONFIRMED', label: 'ยืนยันรับเงินคืนจากโฮลเซลล์' },
  { key: 'CUSTOMER_REFUND_CONFIRMED', label: 'ยืนยันคืนเงินให้ลูกค้า' },
];

export async function markChecklistAuto(
  quotationId: number | string,
  eventKey: string,
  opts?: { actorName?: string; sourceRef?: string }
): Promise<void> {
  if (!quotationId || !eventKey) return;
  let conn;
  try {
    conn = await pool.getConnection();
    const items = await conn.query(
      'SELECT id FROM checklist_items WHERE autoEventKey = ? AND isActive = 1',
      [eventKey]
    );
    if (!items || items.length === 0) return;

    const checkedBy = opts?.actorName || 'ระบบ (อัตโนมัติ)';
    const now = new Date();

    for (const item of items as any[]) {
      await conn.query(
        `INSERT INTO quotation_checklist_status
           (quotationId, itemId, checked, checkedAt, checkedBy, source, sourceRef)
         VALUES (?, ?, 1, ?, ?, 'AUTO', ?)
         ON DUPLICATE KEY UPDATE
           checked = 1,
           checkedAt = VALUES(checkedAt),
           checkedBy = VALUES(checkedBy),
           source = 'AUTO',
           sourceRef = VALUES(sourceRef),
           updatedAt = NOW()`,
        [quotationId, item.id, now, checkedBy, opts?.sourceRef || null]
      );
    }
  } catch (error) {
    console.error(`markChecklistAuto failed (quotationId=${quotationId}, eventKey=${eventKey}):`, error);
  } finally {
    if (conn) conn.release();
  }
}
