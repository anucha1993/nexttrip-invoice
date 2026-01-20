-- เพิ่มฟิลด์ noCost ในตาราง quotations
-- ใช้สำหรับ ByPass ใบเสนอราคาที่ไม่มีต้นทุน

ALTER TABLE quotations 
ADD COLUMN noCost BOOLEAN DEFAULT FALSE COMMENT 'ByPass ไม่มีต้นทุน' 
AFTER netPayable;
