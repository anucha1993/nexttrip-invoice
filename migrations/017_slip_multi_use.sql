-- migrations/017_slip_multi_use.sql
-- อนุญาตให้สลิปใบเดียวกัน (slipRef / referenceNumber) ถูกใช้แบ่งชำระได้หลายใบแจ้งหนี้/QT
-- โดยจำกัดยอดรวมที่ใช้ได้ไม่เกินยอดเงินจริงในสลิป (ตรวจสอบที่ระดับ application แทน DB unique constraint)

-- เดิม slipRef มี UNIQUE INDEX (migration 015) ทำให้บันทึกสลิปเดิมซ้ำไม่ได้เลยแม้จะยังไม่ครบยอด
ALTER TABLE customer_transactions DROP INDEX uniq_customer_tx_slip_ref;

-- เปลี่ยนเป็น index ธรรมดา (ไม่ unique) ไว้เพื่อ lookup เร็วตอนคำนวณยอดที่ใช้ไปแล้ว
ALTER TABLE customer_transactions ADD INDEX idx_customer_tx_slip_ref (slipRef);
ALTER TABLE customer_transactions ADD INDEX idx_customer_tx_reference_number (referenceNumber);
