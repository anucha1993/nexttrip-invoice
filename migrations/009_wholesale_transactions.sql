-- migrations/009_wholesale_transactions.sql
-- ระบบธุรกรรมการเงิน Wholesale (Wholesale Transactions)
-- รวมการจ่ายเงิน (PAYMENT) และรับเงินคืน (REFUND) กรณีโอนเกิน

-- ======================================
-- 1. ตาราง wholesale_transactions
-- ======================================
CREATE TABLE IF NOT EXISTS wholesale_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transactionNumber VARCHAR(20) NOT NULL UNIQUE,
  transactionType ENUM('PAYMENT','REFUND') NOT NULL,
  
  -- อ้างอิง
  quotationId INT NOT NULL,
  wholesaleId INT,           -- ID จาก tb_wholesale (DB2)
  wholesaleName VARCHAR(200), -- ชื่อ Wholesale (cache)
  
  -- ข้อมูลการเงิน
  amount DECIMAL(15,2) NOT NULL,
  paymentMethod ENUM('CASH','TRANSFER','CREDIT_CARD','CHEQUE') DEFAULT 'TRANSFER',
  transactionDate DATETIME NOT NULL,  -- วันที่ทำรายการ
  paymentDate DATETIME NOT NULL,      -- วันที่ชำระ/รับคืน
  
  -- ข้อมูลธนาคาร (สำหรับ TRANSFER)
  bankAccountId INT,         -- บัญชีธนาคารของเรา
  toBankName VARCHAR(100),   -- ธนาคารปลายทาง
  toBankAccountNo VARCHAR(50), -- เลขบัญชีปลายทาง
  toBankAccountName VARCHAR(100), -- ชื่อบัญชีปลายทาง
  
  -- ข้อมูลเช็ค (สำหรับ CHEQUE)
  chequeBankId INT,
  chequeNumber VARCHAR(50),
  chequeDate DATE,
  
  -- หลักฐาน
  slipUrl VARCHAR(500),
  slipUploadedAt DATETIME,
  referenceNumber VARCHAR(100),
  
  -- สำหรับ REFUND
  refundReason VARCHAR(500),
  originalTransactionId INT,
  
  -- Status: PENDING = รอยืนยัน, CONFIRMED = ยืนยันแล้ว, CANCELLED = ยกเลิก
  status ENUM('PENDING','CONFIRMED','CANCELLED') DEFAULT 'PENDING',
  confirmedAt DATETIME,
  confirmedById INT,
  confirmedByName VARCHAR(100),
  
  -- ยกเลิก
  cancelledAt DATETIME,
  cancelledById INT,
  cancelledByName VARCHAR(100),
  cancelReason VARCHAR(500),
  
  -- หมายเหตุ
  notes TEXT,
  
  -- Audit
  createdById INT,
  createdByName VARCHAR(100),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedById INT,
  updatedByName VARCHAR(100),
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (quotationId) REFERENCES quotations(id) ON DELETE RESTRICT,
  FOREIGN KEY (bankAccountId) REFERENCES bank_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (chequeBankId) REFERENCES banks(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_ws_tx_quotation (quotationId),
  INDEX idx_ws_tx_wholesale (wholesaleId),
  INDEX idx_ws_tx_type (transactionType),
  INDEX idx_ws_tx_status (status),
  INDEX idx_ws_tx_date (paymentDate)
);

-- ======================================
-- วิธี Run:
-- mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DB < migrations/009_wholesale_transactions.sql
-- ======================================
