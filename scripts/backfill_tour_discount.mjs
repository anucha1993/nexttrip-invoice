// scripts/backfill_tour_discount.mjs
//
// One-off backfill: fills in tourDiscountLabel/tourDiscountPercent on
// quotations that were auto-created from a booking BEFORE those 2 columns
// existed (migration 022). New bookings already get these fields via the
// webhook; this script only needs to run ONCE for the old rows.
//
// Requires tour-api's new read-only lookup route:
//   GET /api/integrations/bookings/{id}/tour-discount
//
// Usage: node scripts/backfill_tour_discount.mjs [--dry-run]
import 'dotenv/config';
import mariadb from 'mariadb';

const TOUR_API_URL = process.env.TOUR_API_URL;
const TOUR_API_TOKEN = process.env.TOUR_API_TOKEN;
const dryRun = process.argv.includes('--dry-run');

if (!TOUR_API_URL || !TOUR_API_TOKEN) {
  console.error('TOUR_API_URL / TOUR_API_TOKEN not configured in .env');
  process.exit(1);
}

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 2,
});

async function fetchTourDiscount(bookingId) {
  const base = TOUR_API_URL.replace(/\/+$/, '');
  const res = await fetch(`${base}/integrations/bookings/${bookingId}/tour-discount`, {
    headers: {
      Authorization: `Bearer ${TOUR_API_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'unknown error');
  }
  return json.data;
}

const conn = await pool.getConnection();
try {
  const rows = await conn.query(
    `SELECT id, quotationNumber, bookingId, tourType
       FROM quotations
      WHERE bookingId IS NOT NULL
        AND tourType IN ('PROMOTION', 'FLASH_SALE')
        AND tourDiscountLabel IS NULL
        AND tourDiscountPercent IS NULL`
  );

  console.log(`Found ${rows.length} quotation(s) needing backfill.${dryRun ? ' (dry-run)' : ''}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const data = await fetchTourDiscount(row.bookingId);
      if (data.tourDiscountLabel === null && data.tourDiscountPercent === null) {
        console.log(`- ${row.quotationNumber} (booking ${row.bookingId}): no discount data on tour-api, skipping`);
        skipped++;
        continue;
      }
      console.log(
        `- ${row.quotationNumber} (booking ${row.bookingId}): label="${data.tourDiscountLabel ?? ''}" percent=${data.tourDiscountPercent ?? ''}`
      );
      if (!dryRun) {
        await conn.query(
          `UPDATE quotations SET tourDiscountLabel = ?, tourDiscountPercent = ? WHERE id = ?`,
          [data.tourDiscountLabel, data.tourDiscountPercent, row.id]
        );
      }
      updated++;
    } catch (err) {
      console.error(`- ${row.quotationNumber} (booking ${row.bookingId}): FAILED - ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} failed=${failed}${dryRun ? ' (dry-run, no writes made)' : ''}`);
} finally {
  conn.release();
  await pool.end();
}
