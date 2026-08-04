-- migrations/021_tracking_system_upgrade.sql
-- Upgrades the post-sale checklist into a full "Tracking System" per Tracking.xlsx:
--   1) checklist_items: adds grouping (parentId), description, and a fixed
--      autoEventKey (drives automatic checking from real business events —
--      NULL means the item is manual-only).
--   2) quotation_checklist_status: adds `source` (MANUAL/AUTO) + `sourceRef`
--      so we always know whether/why an item auto-checked, while still
--      allowing a manual override on top (sale can tick/untick either way).
--   3) quotation_email_log: audit trail for the new outbound emails
--      (quotation to customer, booking to wholesaler, receipts) — also used
--      as sourceRef for the auto-check.
--   4) customer_wht_documents: new feature — upload the WHT cert a customer
--      sends back, which auto-checks the matching tracking item.
--   5) Re-seeds checklist_items with the REAL 13-group structure from
--      Tracking.xlsx (replacing the old 10-item flat mockup list). Safe to
--      wipe quotation_checklist_status/checklist_items here because the
--      checklist UI was a non-functional mock until this same feature build,
--      so there is no real per-quotation checked data to preserve yet.

ALTER TABLE checklist_items
  ADD COLUMN parentId INT NULL AFTER id,
  ADD COLUMN description TEXT NULL AFTER label,
  ADD COLUMN autoEventKey VARCHAR(100) NULL AFTER requiredForCommission,
  ADD COLUMN allowManualOverride TINYINT(1) NOT NULL DEFAULT 1 AFTER autoEventKey;

ALTER TABLE quotation_checklist_status
  ADD COLUMN source ENUM('MANUAL','AUTO') NOT NULL DEFAULT 'MANUAL' AFTER checkedBy,
  ADD COLUMN sourceRef VARCHAR(100) NULL AFTER source;

CREATE TABLE IF NOT EXISTS quotation_email_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotationId INT NOT NULL,
  emailType VARCHAR(50) NOT NULL,
  toEmail VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NULL,
  status ENUM('SENT','FAILED') NOT NULL,
  errorMessage TEXT NULL,
  sentById VARCHAR(100) NULL,
  sentByName VARCHAR(100) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_quotation (quotationId)
);

CREATE TABLE IF NOT EXISTS customer_wht_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotationId INT NOT NULL,
  fileUrl VARCHAR(500) NOT NULL,
  fileName VARCHAR(255) NULL,
  notes VARCHAR(500) NULL,
  uploadedById VARCHAR(100) NULL,
  uploadedByName VARCHAR(100) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_quotation (quotationId)
);

-- Wipe the old flat 10-item mock list + any statuses tied to it, then re-seed
-- with the real 13-group structure (19 rows incl. 6 grouped sub-items).
DELETE FROM quotation_checklist_status;
DELETE FROM checklist_items;
ALTER TABLE checklist_items AUTO_INCREMENT = 1;

INSERT INTO checklist_items
  (id, parentId, label, description, sortOrder, isActive, requiredForCommission, autoEventKey, allowManualOverride) VALUES
  (1,  NULL, 'ส่งใบเสนอราคาให้ลูกค้า', 'เมื่อสร้างใบเสนอราคาแล้ว ให้ทำการส่งให้ลูกค้าและตรวจเช็ค', 1,  1, 1, 'QUOTATION_EMAIL_SENT', 1),
  (2,  NULL, 'ส่งใบจองทัวร์ให้โฮลเซลล์', 'ส่งใบจองทัวร์ให้โฮลเซลล์ทางอีเมล', 2,  1, 1, 'BOOKING_EMAIL_SENT', 1),
  (3,  NULL, 'การชำระเงินของลูกค้า', 'กลุ่มติดตามใบเสร็จชำระเงินของลูกค้า', 3,  1, 0, NULL, 1),
  (4,  3,    'ส่งใบเสร็จชำระมัดจำให้ลูกค้า', NULL, 1, 1, 1, 'RECEIPT_DEPOSIT_EMAIL_SENT', 1),
  (5,  3,    'ส่งใบเสร็จชำระยอดเต็มให้ลูกค้า', NULL, 2, 1, 1, 'RECEIPT_FULL_EMAIL_SENT', 1),
  (6,  NULL, 'เอกสารของโฮลเซลล์', 'กลุ่มติดตามเอกสารฝั่งโฮลเซลล์', 4,  1, 0, NULL, 1),
  (7,  6,    'เอกสารใบเสนอราคาโฮลเซลล์', NULL, 1, 1, 1, NULL, 1),
  (8,  6,    'เอกสารใบแจ้งหนี้โฮลเซลล์', NULL, 2, 1, 1, NULL, 1),
  (9,  NULL, 'ชำระเงินให้ Wholesale', 'กลุ่มติดตามการชำระเงินให้โฮลเซลล์', 5,  1, 0, NULL, 1),
  (10, 9,    'ส่งสลิปมัดจำ', NULL, 1, 1, 1, NULL, 1),
  (11, 9,    'ส่งสลิปยอดคงเหลือ', NULL, 2, 1, 1, NULL, 1),
  (12, NULL, 'ส่ง Passport ให้โฮลเซลล์', NULL, 6,  1, 1, NULL, 1),
  (13, NULL, 'ส่งใบนัดหมายให้ลูกค้า', NULL, 7,  1, 1, NULL, 1),
  (14, NULL, 'ติดตามหลังการขาย', NULL, 8,  1, 1, NULL, 1),
  (15, NULL, 'ติดตามใบหัก ณ ที่จ่ายของลูกค้า', 'บัญชีอัปโหลดเอกสารใบหัก ณ ที่จ่ายที่ได้รับจากลูกค้า', 9,  1, 1, 'CUSTOMER_WHT_DOC_UPLOADED', 1),
  (16, NULL, 'ออกใบหัก ณ ที่จ่ายให้โฮลเซลล์', 'บันทึกเมื่อออกใบหัก ณ ที่จ่ายให้โฮลเซลล์แล้ว', 10, 1, 1, 'WHT_ISSUED_TO_WHOLESALER', 1),
  (17, NULL, 'ติดตามใบภาษีซื้อ', 'บันทึกเมื่อได้รับใบภาษีซื้อจากโฮลเซลล์', 11, 1, 1, 'PURCHASE_TAX_RECORDED', 1),
  (18, NULL, 'ติดตามโอนเงินคืนจากโฮลเซลล์ / เงินเกิน / ทัวร์ยกเลิก', NULL, 12, 1, 1, 'WHOLESALE_REFUND_CONFIRMED', 1),
  (19, NULL, 'คืนเงินลูกค้า / ลูกค้าโอนเงินเกิน / ยกเลิกทัวร์', NULL, 13, 1, 1, 'CUSTOMER_REFUND_CONFIRMED', 1);

ALTER TABLE checklist_items AUTO_INCREMENT = 20;
