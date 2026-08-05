-- migrations/024_quotation_documents.sql
-- ระบบจัดเก็บเอกสารประจำใบเสนอราคา (Passport / Visa / ใบแจ้งหนี้ / อื่นๆ)

CREATE TABLE IF NOT EXISTS quotation_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- อ้างอิง
  quotationId INT NOT NULL,

  -- หมวดหมู่เอกสาร
  category VARCHAR(50) NOT NULL DEFAULT 'OTHER', -- PASSPORT, VISA, INVOICE, OTHER

  -- ไฟล์
  fileName VARCHAR(255) NOT NULL,   -- ชื่อไฟล์ต้นฉบับ (สำหรับแสดงผล)
  fileUrl VARCHAR(500) NOT NULL,    -- URL ของไฟล์ที่อัพโหลด
  fileType VARCHAR(100),            -- MIME type

  -- หมายเหตุ
  notes VARCHAR(500),

  -- Audit fields
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdById INT,
  createdByName VARCHAR(100),

  INDEX idx_quotationId (quotationId),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
