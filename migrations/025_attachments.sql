-- migrations/025_attachments.sql
-- ระบบไฟล์แนบแบบ polymorphic (แนบได้หลายไฟล์ต่อ 1 รายการ)
-- ใช้ร่วมกันได้กับหลายตาราง เช่น general_costs, wholesale_costs, purchase_taxes
-- โดยระบุ entityType + entityId

CREATE TABLE IF NOT EXISTS attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- อ้างอิงแบบ polymorphic
  entityType VARCHAR(50) NOT NULL, -- GENERAL_COST, WHOLESALE_COST, PURCHASE_TAX
  entityId INT NOT NULL,

  -- ไฟล์
  fileName VARCHAR(255) NOT NULL,
  fileUrl VARCHAR(500) NOT NULL,
  fileType VARCHAR(100),

  -- Audit fields
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdById INT,
  createdByName VARCHAR(100),

  INDEX idx_entity (entityType, entityId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
