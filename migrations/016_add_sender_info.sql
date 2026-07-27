-- Migration: 016_add_sender_info.sql
-- เพิ่มข้อมูลผู้โอน (สำหรับ TRANSFER) ลงใน customer_transactions
-- ผู้โอน / ชื่อธนาคารผู้โอน / เลขที่บัญชีผู้โอน — ปกติเติมอัตโนมัติจากผลตรวจสอบสลิป (Slip2Go) sender object

ALTER TABLE customer_transactions
  ADD COLUMN senderName VARCHAR(150) NULL COMMENT 'ชื่อผู้โอน (จากสลิป/กรอกเอง)' AFTER referenceNumber,
  ADD COLUMN senderBankName VARCHAR(100) NULL COMMENT 'ชื่อธนาคารผู้โอน (จากสลิป/กรอกเอง)' AFTER senderName,
  ADD COLUMN senderAccountNumber VARCHAR(30) NULL COMMENT 'เลขที่บัญชีผู้โอน (จากสลิป/กรอกเอง)' AFTER senderBankName;
