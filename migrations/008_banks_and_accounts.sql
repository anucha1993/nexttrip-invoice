-- Migration: 008_banks_and_accounts.sql
-- สร้างตารางธนาคารและบัญชีธนาคาร

-- ตารางธนาคารในประเทศไทย
CREATE TABLE IF NOT EXISTS banks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE COMMENT 'รหัสธนาคาร เช่น KBANK, BBL',
  nameTH VARCHAR(100) NOT NULL COMMENT 'ชื่อธนาคารภาษาไทย',
  nameEN VARCHAR(100) NOT NULL COMMENT 'ชื่อธนาคารภาษาอังกฤษ',
  swiftCode VARCHAR(20) COMMENT 'SWIFT Code',
  isActive BOOLEAN DEFAULT TRUE,
  sortOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ตารางบัญชีธนาคารของบริษัท
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bankId INT NOT NULL,
  accountNumber VARCHAR(20) NOT NULL COMMENT 'เลขที่บัญชี',
  accountName VARCHAR(150) NOT NULL COMMENT 'ชื่อบัญชี',
  accountType ENUM('SAVINGS', 'CURRENT', 'FIXED') DEFAULT 'SAVINGS' COMMENT 'ประเภทบัญชี: ออมทรัพย์/กระแสรายวัน/ฝากประจำ',
  branchName VARCHAR(100) COMMENT 'สาขา',
  isDefault BOOLEAN DEFAULT FALSE COMMENT 'บัญชีหลัก',
  isActive BOOLEAN DEFAULT TRUE,
  sortOrder INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bankId) REFERENCES banks(id)
);

-- เพิ่ม columns ใน customer_transactions สำหรับข้อมูลเพิ่มเติม
ALTER TABLE customer_transactions
  ADD COLUMN bankAccountId INT COMMENT 'บัญชีธนาคารที่รับโอน (สำหรับ TRANSFER)',
  ADD COLUMN chequeNumber VARCHAR(50) COMMENT 'เลขที่เช็ค (สำหรับ CHEQUE)',
  ADD COLUMN chequeDate DATE COMMENT 'วันที่เช็ค (สำหรับ CHEQUE)',
  ADD COLUMN chequeBankId INT COMMENT 'ธนาคารที่ออกเช็ค (สำหรับ CHEQUE)',
  ADD FOREIGN KEY (bankAccountId) REFERENCES bank_accounts(id),
  ADD FOREIGN KEY (chequeBankId) REFERENCES banks(id);

-- Insert ธนาคารในประเทศไทย
INSERT INTO banks (code, nameTH, nameEN, swiftCode, sortOrder) VALUES
-- ธนาคารพาณิชย์ขนาดใหญ่
('KBANK', 'ธนาคารกสิกรไทย', 'Kasikornbank', 'KASITHBK', 1),
('BBL', 'ธนาคารกรุงเทพ', 'Bangkok Bank', 'BKKBTHBK', 2),
('SCB', 'ธนาคารไทยพาณิชย์', 'Siam Commercial Bank', 'SICOTHBK', 3),
('KTB', 'ธนาคารกรุงไทย', 'Krungthai Bank', 'KRTHTHBK', 4),
('BAY', 'ธนาคารกรุงศรีอยุธยา', 'Bank of Ayudhya', 'AYUDTHBK', 5),
('TTB', 'ธนาคารทหารไทยธนชาต', 'TMBThanachart Bank', 'TABORTHA', 6),

-- ธนาคารพาณิชย์ขนาดกลาง
('CIMBT', 'ธนาคารซีไอเอ็มบี ไทย', 'CIMB Thai Bank', 'UBOBTHBK', 7),
('KKP', 'ธนาคารเกียรตินาคินภัทร', 'Kiatnakin Phatra Bank', 'ABORTHA', 8),
('TISCO', 'ธนาคารทิสโก้', 'TISCO Bank', 'TFPCTHB1', 9),
('UOB', 'ธนาคารยูโอบี', 'United Overseas Bank (Thai)', 'UABORTHA', 10),
('LHBANK', 'ธนาคารแลนด์ แอนด์ เฮ้าส์', 'Land and Houses Bank', 'LAABORTHA', 11),
('ICBC', 'ธนาคารไอซีบีซี (ไทย)', 'ICBC (Thai)', 'ICBKTHBK', 12),
('SCBT', 'ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)', 'Standard Chartered Bank (Thai)', 'SCBLTHBX', 13),
('CITI', 'ธนาคารซิตี้แบงก์', 'Citibank', 'CITITHBX', 14),
('SMBC', 'ธนาคารซูมิโตโม มิตซุย แบงกิ้ง คอร์ปอเรชั่น', 'Sumitomo Mitsui Banking Corporation', 'SABORTHA', 15),
('MHCB', 'ธนาคารมิซูโฮ', 'Mizuho Bank', 'MHCBTHBK', 16),
('BOC', 'ธนาคารแห่งประเทศจีน (ไทย)', 'Bank of China (Thai)', 'BABORTHA', 17),
('HSBC', 'ธนาคารเอชเอสบีซี', 'HSBC', 'HSBCTHBK', 18),
('DB', 'ธนาคารดอยซ์แบงก์', 'Deutsche Bank', 'DEUTTHBK', 19),
('ANZ', 'ธนาคารเอเอ็นแซด (ไทย)', 'ANZ Bank (Thai)', 'ANZBTHBX', 20),
('IBJ', 'ธนาคารอินเดียน โอเวอร์ซีส์', 'Indian Overseas Bank', 'IABORTHA', 21),
('MBTC', 'ธนาคารเมกะ สากลพาณิชย์', 'Mega International Commercial Bank', 'ICBCTHBK', 22),
('RHB', 'ธนาคารอาร์เอชบี', 'RHB Bank', 'RHBBTHBK', 23),

-- ธนาคารเฉพาะกิจ
('GSB', 'ธนาคารออมสิน', 'Government Savings Bank', 'GABORTHA', 24),
('BAAC', 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร', 'Bank for Agriculture and Agricultural Cooperatives', 'BAABTHBK', 25),
('GHB', 'ธนาคารอาคารสงเคราะห์', 'Government Housing Bank', 'GHBATHBK', 26),
('EXIM', 'ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย', 'Export-Import Bank of Thailand', 'EXABORTHA', 27),
('SME', 'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย', 'Small and Medium Enterprise Development Bank of Thailand', 'SABORTHA', 28),
('ISBT', 'ธนาคารอิสลามแห่งประเทศไทย', 'Islamic Bank of Thailand', 'ISABORTHA', 29);

-- Insert บัญชีธนาคารของบริษัท (ตัวอย่าง)
INSERT INTO bank_accounts (bankId, accountNumber, accountName, accountType, branchName, isDefault, sortOrder) VALUES
((SELECT id FROM banks WHERE code = 'KBANK'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาสยามพารากอน', TRUE, 1),
((SELECT id FROM banks WHERE code = 'BBL'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาสีลม', FALSE, 2),
((SELECT id FROM banks WHERE code = 'SCB'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาเซ็นทรัลเวิลด์', FALSE, 3),
((SELECT id FROM banks WHERE code = 'BAY'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาอโศก', FALSE, 4),
((SELECT id FROM banks WHERE code = 'KTB'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขากระทรวงการคลัง', FALSE, 5),
((SELECT id FROM banks WHERE code = 'TTB'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาสุขุมวิท', FALSE, 6),
((SELECT id FROM banks WHERE code = 'CIMBT'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาเพลินจิต', FALSE, 7),
((SELECT id FROM banks WHERE code = 'KKP'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาสำนักงานใหญ่', FALSE, 8),
((SELECT id FROM banks WHERE code = 'TISCO'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาสำนักงานใหญ่', FALSE, 9),
((SELECT id FROM banks WHERE code = 'UOB'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาสยามสแควร์', FALSE, 10),
((SELECT id FROM banks WHERE code = 'GSB'), '000-0-00000-0', 'บริษัท เน็กซ์ทริป จำกัด', 'SAVINGS', 'สาขาสำนักงานใหญ่', FALSE, 11);
