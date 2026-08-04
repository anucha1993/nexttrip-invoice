-- migrations/019_booking_sync_status.sql
-- Booking→Quotation "wait for manual convert" staging:
-- Webhook still auto-creates the Quotation row immediately (reuses all
-- existing line-item mapping), but flags it PENDING_REVIEW until a staff
-- member reviews/edits it and clicks "แปลงเป็นใบเสนอราคา" (convert-from-booking),
-- which flips it to CONVERTED and fires the callback to tour-api.
ALTER TABLE quotations ADD COLUMN bookingId INT NULL AFTER bookingCode;
ALTER TABLE quotations ADD COLUMN bookingSyncStatus ENUM('PENDING_REVIEW','CONVERTED') NULL AFTER bookingId;
ALTER TABLE quotations ADD COLUMN bookingConvertedAt DATETIME NULL AFTER bookingSyncStatus;
CREATE INDEX idx_quotations_booking_sync_status ON quotations (bookingSyncStatus);
