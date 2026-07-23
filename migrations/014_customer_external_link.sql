-- Migration: link invoice customers to tour-api person/booking records
-- Created: 2026-07-21
--
-- The invoice keeps its own billing customers (tax id, address, CUS code) as
-- master, while tour-api web_members stay master for PERSON identity. These
-- columns let a customer that was pulled from tour-api (a web member) or from
-- a guest booking be linked back and de-duplicated.
--
--   externalSource = 'member'  -> externalId references web_members.id
--   externalSource = 'booking' -> externalId references bookings.id
--
-- Applied by scripts/_apply_customer_external.mjs (MariaDB supports the
-- IF NOT EXISTS guards below, so re-running is safe).

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS externalId INT DEFAULT NULL COMMENT 'tour-api web_members.id or bookings.id',
  ADD COLUMN IF NOT EXISTS externalSource VARCHAR(20) DEFAULT NULL COMMENT 'member | booking';

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_external ON customers (externalSource, externalId);
