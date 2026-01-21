-- ===================================
-- Migration: Add Tax Invoice Columns to Invoices
-- Created: 2026-01-21
-- Description: Add columns to track tax invoice in same table as invoice
-- ===================================

-- Add Tax Invoice columns to invoices table
ALTER TABLE invoices 
  ADD COLUMN hasTaxInvoice BOOLEAN DEFAULT FALSE COMMENT 'Has tax invoice been issued',
  ADD COLUMN taxInvoiceNumber VARCHAR(20) NULL COMMENT 'Tax invoice number e.g. RVN202601-0001',
  ADD COLUMN taxInvoiceIssuedAt DATETIME NULL COMMENT 'Tax invoice issued date',
  ADD COLUMN taxInvoiceIssuedById INT NULL COMMENT 'Tax invoice issued by user ID',
  ADD COLUMN taxInvoiceIssuedByName VARCHAR(100) NULL COMMENT 'Tax invoice issued by user name',
  ADD COLUMN taxInvoiceCancelledAt DATETIME NULL COMMENT 'Tax invoice cancelled date',
  ADD COLUMN taxInvoiceCancelReason VARCHAR(500) NULL COMMENT 'Tax invoice cancel reason';

-- Add index for tax invoice number
ALTER TABLE invoices ADD INDEX idx_tax_invoice_number (taxInvoiceNumber);

-- Add index for hasTaxInvoice filter
ALTER TABLE invoices ADD INDEX idx_has_tax_invoice (hasTaxInvoice);

-- Add pax column if not exists (for invoice)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pax INT DEFAULT 1 COMMENT 'Number of PAX';

-- Add depositAmount column if not exists
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS depositAmount DECIMAL(15,2) DEFAULT 0 COMMENT 'Deposit amount';

-- ===================================
-- Verification query (optional)
-- ===================================
-- SHOW COLUMNS FROM invoices WHERE Field LIKE '%taxInvoice%';
