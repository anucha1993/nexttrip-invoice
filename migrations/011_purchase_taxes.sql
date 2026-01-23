-- Migration: Create purchase_taxes table for managing purchase tax records
-- Created: 2026-01-23

CREATE TABLE IF NOT EXISTS purchase_taxes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quotationId INT NOT NULL,
  wholesaleId INT DEFAULT NULL COMMENT 'ID ของ Wholesale',
  referenceNumber VARCHAR(100) NOT NULL COMMENT 'เลขที่เอกสารอ้างอิง',
  vendorName VARCHAR(255) DEFAULT NULL COMMENT 'ชื่อผู้ขาย/ผู้ให้บริการ',
  vendorTaxId VARCHAR(20) DEFAULT NULL COMMENT 'เลขประจำตัวผู้เสียภาษี',
  serviceAmount DECIMAL(15,2) NOT NULL DEFAULT 0 COMMENT 'ยอดค่าบริการ (ก่อนภาษี)',
  hasWithholdingTax TINYINT(1) DEFAULT 0 COMMENT 'ต้องการออกใบหัก ณ ที่จ่ายหรือไม่',
  withholdingTaxRate DECIMAL(5,2) DEFAULT 3.00 COMMENT 'อัตราภาษี ณ ที่จ่าย (%)',
  withholdingTaxAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'ภาษี ณ ที่จ่าย',
  vatRate DECIMAL(5,2) DEFAULT 7.00 COMMENT 'อัตราภาษีมูลค่าเพิ่ม (%)',
  vatAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'ภาษีซื้อ (VAT)',
  totalAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'สรุปยอดที่ต้องจ่าย',
  taxDate DATE DEFAULT NULL COMMENT 'วันที่ใบกำกับภาษี',
  notes TEXT DEFAULT NULL COMMENT 'หมายเหตุ',
  slipUrl VARCHAR(500) DEFAULT NULL COMMENT 'ไฟล์แนบ',
  status ENUM('PENDING', 'RECORDED', 'CANCELLED') DEFAULT 'PENDING',
  createdBy INT DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedBy INT DEFAULT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (quotationId) REFERENCES quotations(id) ON DELETE CASCADE,
  INDEX idx_quotation (quotationId),
  INDEX idx_reference (referenceNumber),
  INDEX idx_status (status),
  INDEX idx_taxDate (taxDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
