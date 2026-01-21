-- Migration: Create payment_links table
-- สำหรับเก็บ payment links ที่สร้างให้ลูกค้า

CREATE TABLE IF NOT EXISTS payment_links (
  id VARCHAR(36) PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  quotationId VARCHAR(36),
  invoiceId VARCHAR(36),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  status ENUM('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_token (token),
  INDEX idx_quotation (quotationId),
  INDEX idx_invoice (invoiceId),
  INDEX idx_status (status),
  
  FOREIGN KEY (quotationId) REFERENCES quotations(id) ON DELETE SET NULL,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
