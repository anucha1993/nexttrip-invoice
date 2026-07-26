-- migrations/015_add_slip2go_columns.sql
-- เพิ่มคอลัมน์สำหรับผลการตรวจสอบสลิปด้วย Slip2Go
-- และเพิ่มคีย์ตั้งค่าใน company_settings

-- ============================================
-- 1. customer_transactions: เก็บผลลัพธ์ Slip2Go
-- ============================================
ALTER TABLE customer_transactions
  ADD COLUMN slipRef VARCHAR(100) NULL COMMENT 'transRef จาก Slip2Go ใช้กันสลิปซ้ำ' AFTER slipUploadedAt,
  ADD COLUMN slipStatusCode VARCHAR(20) NULL COMMENT 'code จาก Slip2Go เช่น 200000' AFTER slipRef,
  ADD COLUMN slipVerifiedAt DATETIME NULL AFTER slipStatusCode,
  ADD COLUMN slipData JSON NULL COMMENT 'response ทั้งก้อนจาก Slip2Go' AFTER slipVerifiedAt;

-- unique index บน slipRef (กันสลิปซ้ำระดับฐานข้อมูล) — nullable ใช้ได้กับ MySQL/MariaDB
ALTER TABLE customer_transactions
  ADD UNIQUE INDEX uniq_customer_tx_slip_ref (slipRef);

-- ============================================
-- 2. company_settings: seed คีย์ Slip2Go
-- ============================================
INSERT INTO company_settings (id, `key`, `value`, createdAt, updatedAt) VALUES
  (UUID(), 'slip2go_api_url',         'https://connect.slip2go.com', NOW(), NOW()),
  (UUID(), 'slip2go_secret_key',      '',                            NOW(), NOW()),
  (UUID(), 'slip2go_check_duplicate', 'true',                        NOW(), NOW()),
  (UUID(), 'slip2go_enabled',         'false',                       NOW(), NOW())
ON DUPLICATE KEY UPDATE updatedAt = NOW();
