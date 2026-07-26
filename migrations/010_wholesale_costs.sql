-- migrations/010_wholesale_costs.sql
-- ระบบบันทึกต้นทุน Wholesale
-- เพื่อเปรียบเทียบกับยอดชำระเงินให้ Wholesale

-- ======================================
-- 1. ตาราง wholesale_costs
-- ======================================
CREATE TABLE IF NOT EXISTS wholesale_costs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- อ้างอิง
  quotationId INT NOT NULL,
  wholesaleId INT,           -- ID จาก tb_wholesale (DB2)
  wholesaleName VARCHAR(200), -- ชื่อ Wholesale (cache)
  
  -- ประเภทต้นทุน
  costType VARCHAR(50) DEFAULT 'OTHER', -- TOUR_TOTAL, ROOM, FOOD, AIRLINE_TICKET, OTHER
  
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
