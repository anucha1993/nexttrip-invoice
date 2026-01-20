-- ===================================
-- Migration: Create Invoice Tables
-- Created: 2026-01-20
-- Description: Create tables for invoice management
-- ===================================

-- ===================================
-- 1. Table: invoices
-- ===================================
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceNumber VARCHAR(20) NOT NULL UNIQUE COMMENT 'Invoice number e.g. IVN2601-0001',
  quotationId INT NOT NULL COMMENT 'FK to quotations.id',
  
  -- Document info
  invoiceDate DATE NOT NULL COMMENT 'Invoice issue date',
  dueDate DATE NULL COMMENT 'Payment due date',
  
  -- Amounts
  subtotal DECIMAL(15,2) DEFAULT 0 COMMENT 'Subtotal before VAT',
  discountAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'Discount amount',
  vatExemptAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'VAT exempt amount',
  preTaxAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'Amount before VAT',
  vatAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'VAT 7%',
  grandTotal DECIMAL(15,2) NOT NULL COMMENT 'Grand total (must not exceed quotation.grandTotal)',
  withholdingTax DECIMAL(15,2) DEFAULT 0 COMMENT 'Withholding tax 3%',
  
  -- Status
  status ENUM('DRAFT', 'ISSUED', 'PAID', 'PARTIAL_PAID', 'CANCELLED', 'VOIDED') DEFAULT 'DRAFT' COMMENT 'Invoice status',
  cancelledAt DATETIME NULL COMMENT 'Cancelled date',
  cancelledById INT NULL COMMENT 'Cancelled by user',
  cancelReason VARCHAR(500) NULL COMMENT 'Cancel reason',
  
  notes TEXT NULL COMMENT 'Notes',
  createdById INT NULL COMMENT 'Created by user ID',
  createdByName VARCHAR(100) NULL COMMENT 'Created by user name',
  updatedById INT NULL COMMENT 'Updated by user ID',
  updatedByName VARCHAR(100) NULL COMMENT 'Updated by user name',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (quotationId) REFERENCES quotations(id),
  INDEX idx_quotation (quotationId),
  INDEX idx_status (status),
  INDEX idx_invoice_number (invoiceNumber),
  INDEX idx_invoice_date (invoiceDate),
  INDEX idx_quotation_status (quotationId, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Invoices';

-- ===================================
-- 2. Table: invoice_items
-- ===================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT NOT NULL COMMENT 'FK to invoices.id',
  
  description VARCHAR(500) NOT NULL COMMENT 'Item description',
  quantity INT DEFAULT 1 COMMENT 'Quantity',
  unitPrice DECIMAL(15,2) DEFAULT 0 COMMENT 'Unit price',
  amount DECIMAL(15,2) DEFAULT 0 COMMENT 'Total amount',
  itemType ENUM('INCOME', 'DISCOUNT') DEFAULT 'INCOME' COMMENT 'Item type',
  vatType ENUM('NO_VAT', 'VAT', 'VAT_EXEMPT') DEFAULT 'NO_VAT' COMMENT 'VAT type',
  hasWithholdingTax BOOLEAN DEFAULT FALSE COMMENT 'Has withholding tax 3%',
  sortOrder INT DEFAULT 0 COMMENT 'Display order',
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
  INDEX idx_invoice (invoiceId),
  INDEX idx_sort (invoiceId, sortOrder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Invoice items';

-- ===================================
-- 3. Table: document_sequences (Running Numbers)
-- ===================================
CREATE TABLE IF NOT EXISTS document_sequences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  documentType ENUM('INVOICE', 'RECEIPT', 'TAX_INVOICE') NOT NULL COMMENT 'Document type',
  yearMonth VARCHAR(6) NOT NULL COMMENT 'Year+Month e.g. 202601',
  lastNumber INT DEFAULT 0 COMMENT 'Last issued number',
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_type_month (documentType, yearMonth)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Document running numbers';

-- ===================================
-- Insert initial data
-- ===================================

-- Create initial sequence for current month
INSERT INTO document_sequences (documentType, yearMonth, lastNumber)
VALUES 
  ('INVOICE', '2601', 0),
  ('RECEIPT', '2601', 0),
  ('TAX_INVOICE', '202601', 0)
ON DUPLICATE KEY UPDATE lastNumber = lastNumber;

-- ===================================
-- Success message
-- ===================================
SELECT 'Invoice tables created successfully!' as message;
