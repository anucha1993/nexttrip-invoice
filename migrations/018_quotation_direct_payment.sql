-- migrations/018_quotation_direct_payment.sql
-- อนุญาตให้บันทึกรับเงิน/คืนเงิน (customer_transactions) ผูกกับใบเสนอราคา (quotation) โดยตรง
-- โดยไม่จำเป็นต้องมีใบแจ้งหนี้ (invoice) มาก่อน — ทำให้ invoiceId เป็นค่าว่างได้ในตารางที่เกี่ยวข้อง
ALTER TABLE customer_transactions MODIFY invoiceId INT NULL;
ALTER TABLE receipts MODIFY invoiceId INT NULL;
ALTER TABLE credit_notes MODIFY invoiceId INT NULL;
