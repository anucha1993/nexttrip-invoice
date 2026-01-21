-- Insert ธนาคารในประเทศไทย (with proper charset)
SET NAMES utf8mb4;

INSERT INTO banks (code, nameTH, nameEN, swiftCode, sortOrder) VALUES
-- ธนาคารพาณิชย์ขนาดใหญ่
('KBANK', 'ธนาคารกสิกรไทย', 'Kasikornbank', 'KASITHBK', 1),
('BBL', 'ธนาคารกรุงเทพ', 'Bangkok Bank', 'BKKBTHBK', 2),
('SCB', 'ธนาคารไทยพาณิชย์', 'Siam Commercial Bank', 'SICOTHBK', 3),
('KTB', 'ธนาคารกรุงไทย', 'Krungthai Bank', 'KRTHTHBK', 4),
('BAY', 'ธนาคารกรุงศรีอยุธยา', 'Bank of Ayudhya', 'AYUDTHBK', 5),
('TTB', 'ธนาคารทหารไทยธนชาต', 'TMBThanachart Bank', 'TMBKTHBK', 6),

-- ธนาคารพาณิชย์ขนาดกลาง
('CIMBT', 'ธนาคารซีไอเอ็มบี ไทย', 'CIMB Thai Bank', 'UBOBTHBK', 7),
('KKP', 'ธนาคารเกียรตินาคินภัทร', 'Kiatnakin Phatra Bank', 'ABORTHA', 8),
('TISCO', 'ธนาคารทิสโก้', 'TISCO Bank', 'TFPCTHB1', 9),
('UOB', 'ธนาคารยูโอบี', 'United Overseas Bank (Thai)', 'UOVBTHBK', 10),
('LHBANK', 'ธนาคารแลนด์ แอนด์ เฮ้าส์', 'Land and Houses Bank', 'LAABORTHA', 11),
('ICBC', 'ธนาคารไอซีบีซี (ไทย)', 'ICBC (Thai)', 'ICBKTHBK', 12),
('SCBT', 'ธนาคารสแตนดาร์ดชาร์เตอร์ด (ไทย)', 'Standard Chartered Bank (Thai)', 'SCBLTHBX', 13),
('CITI', 'ธนาคารซิตี้แบงก์', 'Citibank', 'CITITHBX', 14),
('SMBC', 'ธนาคารซูมิโตโม มิตซุย', 'Sumitomo Mitsui Banking Corporation', 'SABORTHA', 15),
('MHCB', 'ธนาคารมิซูโฮ', 'Mizuho Bank', 'MHCBTHBK', 16),
('BOC', 'ธนาคารแห่งประเทศจีน (ไทย)', 'Bank of China (Thai)', 'BKCHTHBK', 17),
('HSBC', 'ธนาคารเอชเอสบีซี', 'HSBC', 'HSBCTHBK', 18),
('DB', 'ธนาคารดอยซ์แบงก์', 'Deutsche Bank', 'DEUTTHBK', 19),
('RHB', 'ธนาคารอาร์เอชบี', 'RHB Bank', 'RHBBTHBK', 20),

-- ธนาคารเฉพาะกิจ
('GSB', 'ธนาคารออมสิน', 'Government Savings Bank', 'GABORTHA', 21),
('BAAC', 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร', 'Bank for Agriculture and Agricultural Cooperatives', 'BAABORTHA', 22),
('GHB', 'ธนาคารอาคารสงเคราะห์', 'Government Housing Bank', 'GHBATHBK', 23),
('EXIM', 'ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย', 'Export-Import Bank of Thailand', 'EXBORTHA', 24),
('SME', 'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อม', 'SME Development Bank', 'SMEBORTHA', 25),
('ISBT', 'ธนาคารอิสลามแห่งประเทศไทย', 'Islamic Bank of Thailand', 'ISBORTHA', 26);

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
