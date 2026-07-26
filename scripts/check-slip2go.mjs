// scripts/check-slip2go.mjs — ตรวจสอบว่า migration 015 ทำงานสำเร็จ
import 'dotenv/config';
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 2,
});

const conn = await pool.getConnection();
try {
  const cols = await conn.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customer_transactions'
        AND COLUMN_NAME IN ('slipRef','slipStatusCode','slipVerifiedAt','slipData')`,
    [process.env.DB_DATABASE]
  );
  console.log('columns:', cols);

  const idx = await conn.query(
    `SHOW INDEX FROM customer_transactions WHERE Key_name = 'uniq_customer_tx_slip_ref'`
  );
  console.log('unique index:', idx.length ? '✓ present' : '✗ missing');

  const settings = await conn.query(
    `SELECT \`key\`, \`value\` FROM company_settings WHERE \`key\` LIKE 'slip2go_%' ORDER BY \`key\``
  );
  console.log('settings:', settings);
} finally {
  conn.release();
  await pool.end();
}
