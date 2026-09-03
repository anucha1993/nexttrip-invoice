-- migrations/026_cost_categories.sql
-- ตาราง cost_categories: รายการ "ประเภทต้นทุน" ที่ตั้งค่าได้เอง (แทนของเดิมที่ hardcode
-- ไว้ในโค้ด costTypeOptions ของ CostTab/WholesaleCostTab). ค่า `key` คือค่าที่ถูกเก็บจริง
-- ใน general_costs.costType / wholesale_costs.costType (VARCHAR อิสระ ไม่ใช่ FK จึงลบแถวนี้
-- ได้โดยไม่กระทบข้อมูลต้นทุนที่บันทึกไปแล้ว — ค่าเก่าจะแสดงเป็นข้อความเดิมต่อไป)

CREATE TABLE IF NOT EXISTS cost_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scope ENUM('GENERAL', 'WHOLESALE') NOT NULL, -- GENERAL = ระบบจัดการต้นทุน, WHOLESALE = ต้นทุนโฮลเซลล์
  `key` VARCHAR(50) NOT NULL,                  -- ค่าที่เก็บจริงใน costType ของแต่ละแถวต้นทุน
  label VARCHAR(150) NOT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  sortOrder INT NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_scope_key (scope, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: ค่าที่เคย hardcode ไว้ใน CostTab (scope=GENERAL)
INSERT INTO cost_categories (scope, `key`, label, sortOrder) VALUES
  ('GENERAL', 'COMMISSION', 'ค่าคอมมิชชั่น', 1),
  ('GENERAL', 'TRANSPORT', 'ค่าเดินทาง/ที่พักพนักงาน', 2),
  ('GENERAL', 'OPERATION', 'ค่าดำเนินการ/ธนาคาร', 3),
  ('GENERAL', 'MARKETING', 'การตลาด', 4),
  ('GENERAL', 'MISC', 'เบ็ดเตล็ด', 5),
  ('GENERAL', 'OTHER', 'อื่นๆ', 6)
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- Seed: ค่าที่เคย hardcode ไว้ใน WholesaleCostTab (scope=WHOLESALE)
INSERT INTO cost_categories (scope, `key`, label, sortOrder) VALUES
  ('WHOLESALE', 'TOUR_TOTAL', 'ค่าทัวร์รวมทั้งหมด', 1),
  ('WHOLESALE', 'ROOM', 'ค่าห้อง', 2),
  ('WHOLESALE', 'FOOD', 'ค่าอาหาร', 3),
  ('WHOLESALE', 'AIRLINE_TICKET', 'ค่าตั๋วเครื่องบิน', 4),
  ('WHOLESALE', 'OTHER', 'อื่นๆ', 5)
ON DUPLICATE KEY UPDATE label = VALUES(label);
