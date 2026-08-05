-- migrations/022_tour_discount_detail.sql
-- Adds the actual promo detail (name + discount %) alongside the existing
-- tourType tag (see 020_checklist_and_tour_type.sql), so the UI can show
-- "โปรไฟไหม้ Flash Sale -20%" / "โปรส่วนลด 12%" instead of a generic label.
-- Populated by tour-api's SendBookingToInvoice webhook payload
-- (tour.tourDiscountLabel / tour.tourDiscountPercent), same as tourType.

ALTER TABLE quotations ADD COLUMN tourDiscountLabel VARCHAR(150) NULL AFTER tourType;
ALTER TABLE quotations ADD COLUMN tourDiscountPercent DECIMAL(5,2) NULL AFTER tourDiscountLabel;
