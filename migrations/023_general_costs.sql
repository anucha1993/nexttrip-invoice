-- migrations/023_general_costs.sql
-- ระบบบันทึกต้นทุนทั่วไป (แยกจาก wholesale_costs)
-- เช่น ค่าคอมมิชชั่น, ค่าเดินทาง/ที่พักพนักงาน, ค่าดำเนินการ, การตลาด, เบ็ดเตล็ด ฯลฯ

CREATE TABLE IF NOT EXISTS general_costs (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- อ้างอิง
  quotationId INT NOT NULL,

  -- ประเภทต้นทุน
  costType VARCHAR(50) DEFAULT 'OTHER', -- COMMISSION, TRANSPORT, OPERATION, MARKETING, MISC, OTHER

  -- รายละเอียดต้นทุน
  description VARCHAR(500),   -- รายละเอียดต้นทุน
  amount DECIMAL(15,2) NOT NULL,

  -- หลักฐาน
  slipUrl VARCHAR(500),       -- URL ของหลักฐาน/สลิป

  -- หมายเหตุ
  notes TEXT,

  -- Audit fields
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdById INT,
  createdByName VARCHAR(100),
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedById INT,
  updatedByName VARCHAR(100),

  INDEX idx_quotationId (quotationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
