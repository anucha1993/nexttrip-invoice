-- migrations/020_checklist_and_tour_type.sql
-- 1) Post-sale follow-up checklist (ติดตามงานหลังการขาย):
--    - checklist_items = admin-editable global list of checklist item definitions
--      (label, sort order, active/inactive, and whether it's REQUIRED before
--      commission can be marked as paid).
--    - quotation_checklist_status = per-quotation checked state for each item.
-- 2) Commission-payment gate on quotations: commissionPaid/commissionPaidAt.
--    Server enforces: commissionPaid can only be set TRUE when every ACTIVE
--    checklist item with requiredForCommission=1 is checked for that quotation.
-- 3) tourType tag on quotations (ราคาปกติ/โปรโมชั่น/ไฟไหม้) — settable both
--    automatically from the tour-api booking webhook AND manually in Invoice.

CREATE TABLE IF NOT EXISTS checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  requiredForCommission TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_checklist_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotationId INT NOT NULL,
  itemId INT NOT NULL,
  checked TINYINT(1) NOT NULL DEFAULT 0,
  checkedAt DATETIME NULL,
  checkedBy VARCHAR(100) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_quotation_item (quotationId, itemId),
  KEY idx_quotation (quotationId),
  KEY idx_item (itemId)
);

INSERT IGNORE INTO checklist_items (id, label, sortOrder, isActive, requiredForCommission) VALUES
  (1, 'ส่งใบเสนอราคาให้ลูกค้า', 1, 1, 0),
  (2, 'ได้รับการชำระมัดจำ', 2, 1, 1),
  (3, 'ชำระเงินให้ Wholesale', 3, 1, 1),
  (4, 'เก็บ Passport ครบ', 4, 1, 0),
  (5, 'จองตั๋วเครื่องบิน', 5, 1, 0),
  (6, 'จองโรงแรม', 6, 1, 0),
  (7, 'ได้รับการชำระเงินครบ', 7, 1, 1),
  (8, 'ส่งโปรแกรมให้ลูกค้า', 8, 1, 0),
  (9, 'ติดต่อไกด์', 9, 1, 0),
  (10, 'ส่งข้อมูลนักท่องเที่ยวให้ Wholesale', 10, 1, 0);

ALTER TABLE quotations ADD COLUMN commissionPaid TINYINT(1) NOT NULL DEFAULT 0 AFTER commissionNote;
ALTER TABLE quotations ADD COLUMN commissionPaidAt DATETIME NULL AFTER commissionPaid;
ALTER TABLE quotations ADD COLUMN tourType ENUM('NORMAL','PROMOTION','FLASH_SALE') NOT NULL DEFAULT 'NORMAL' AFTER customTourCode;
CREATE INDEX idx_quotations_tour_type ON quotations (tourType);
