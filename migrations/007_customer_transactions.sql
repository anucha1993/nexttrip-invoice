-- migrations/007_customer_transactions.sql
-- ระบบธุรกรรมการเงินลูกค้า (Customer Transactions)
-- รวมการรับเงิน (Payment) และคืนเงิน (Refund)

-- ======================================
-- 1. ตาราง customer_transactions
-- ======================================
CREATE TABLE IF NOT EXISTS customer_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transactionNumber VARCHAR(20) NOT NULL UNIQUE,
  transactionType ENUM('PAYMENT','REFUND') NOT NULL,
  
  -- อ้างอิง
  invoiceId INT NOT NULL,
  quotationId INT NOT NULL,
  
  -- ข้อมูลการเงิน
  amount DECIMAL(15,2) NOT NULL,
  paymentMethod ENUM('CASH','TRANSFER','CREDIT_CARD','CHEQUE') DEFAULT 'TRANSFER',
  paymentDate DATE NOT NULL,
  
  -- หลักฐาน
  slipUrl VARCHAR(500),
  slipUploadedAt DATETIME,
  referenceNumber VARCHAR(100),
  bankAccount VARCHAR(100),
  
  -- สำหรับ REFUND
  refundReason VARCHAR(500),
  originalTransactionId INT,
  
  -- Status: PENDING = รอยืนยัน, CONFIRMED = ยืนยันแล้ว, CANCELLED = ยกเลิก
  status ENUM('PENDING','CONFIRMED','CANCELLED') DEFAULT 'PENDING',
  confirmedAt DATETIME,
  confirmedById INT,
  confirmedByName VARCHAR(100),
  
  -- หมายเหตุ
  notes TEXT,
  
  -- Audit
  createdById INT,
  createdByName VARCHAR(100),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE RESTRICT,
  FOREIGN KEY (quotationId) REFERENCES quotations(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_transaction_invoice (invoiceId),
  INDEX idx_transaction_quotation (quotationId),
  INDEX idx_transaction_type (transactionType),
  INDEX idx_transaction_status (status),
  INDEX idx_transaction_date (paymentDate)
);

-- ======================================
-- 2. ตาราง receipts (ใบเสร็จรับเงิน)
-- ======================================
CREATE TABLE IF NOT EXISTS receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receiptNumber VARCHAR(20) NOT NULL UNIQUE,
  transactionId INT NOT NULL,
  
  -- อ้างอิง
  invoiceId INT NOT NULL,
  quotationId INT NOT NULL,
  
  -- ข้อมูล
  amount DECIMAL(15,2) NOT NULL,
  paymentMethod ENUM('CASH','TRANSFER','CREDIT_CARD','CHEQUE') DEFAULT 'TRANSFER',
  paymentDate DATE NOT NULL,
  
  -- สถานะ
  status ENUM('ISSUED','CANCELLED') DEFAULT 'ISSUED',
  cancelledAt DATETIME,
  cancelledById INT,
  cancelReason VARCHAR(500),
  
  -- Audit
  issuedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  issuedById INT,
  issuedByName VARCHAR(100),
  
  -- Foreign Keys
  FOREIGN KEY (transactionId) REFERENCES customer_transactions(id) ON DELETE RESTRICT,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_receipt_transaction (transactionId),
  INDEX idx_receipt_invoice (invoiceId),
  INDEX idx_receipt_date (paymentDate)
);

-- ======================================
-- 3. ตาราง credit_notes (ใบลดหนี้)
-- ======================================
CREATE TABLE IF NOT EXISTS credit_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creditNoteNumber VARCHAR(20) NOT NULL UNIQUE,
  transactionId INT NOT NULL,
  
  -- อ้างอิง
  invoiceId INT NOT NULL,
  quotationId INT NOT NULL,
  originalReceiptId INT,  -- ใบเสร็จที่เกี่ยวข้อง (ถ้ามี)
  
  -- ข้อมูล
  amount DECIMAL(15,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  refundDate DATE NOT NULL,
  refundMethod ENUM('CASH','TRANSFER','CREDIT_CARD','CHEQUE') DEFAULT 'TRANSFER',
  
  -- สถานะ
  status ENUM('ISSUED','CANCELLED') DEFAULT 'ISSUED',
  cancelledAt DATETIME,
  cancelledById INT,
  cancelReason VARCHAR(500),
  
  -- Audit
  issuedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  issuedById INT,
  issuedByName VARCHAR(100),
  
  -- Foreign Keys
  FOREIGN KEY (transactionId) REFERENCES customer_transactions(id) ON DELETE RESTRICT,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_creditnote_transaction (transactionId),
  INDEX idx_creditnote_invoice (invoiceId),
  INDEX idx_creditnote_date (refundDate)
);

-- ======================================
-- 4. เพิ่ม columns ใน invoices สำหรับ track ยอดชำระ
-- ======================================
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paidAmount DECIMAL(15,2) DEFAULT 0.00 COMMENT 'ยอดที่ชำระแล้ว',
ADD COLUMN IF NOT EXISTS refundedAmount DECIMAL(15,2) DEFAULT 0.00 COMMENT 'ยอดที่คืนเงิน',
ADD COLUMN IF NOT EXISTS balanceAmount DECIMAL(15,2) GENERATED ALWAYS AS (grandTotal - paidAmount + refundedAmount) STORED COMMENT 'ยอดคงเหลือ';

-- ======================================
-- วิธี Run:
-- mysql -h 103.80.48.25 -u mailfore_nexttrip_invoice -p nexttrip_invoice < migrations/007_customer_transactions.sql
-- ======================================
