import 'dotenv/config';
import mariadb from 'mariadb';

// Applies migrations/014_customer_external_link.sql:
// adds customers.externalId + customers.externalSource and the unique index
// linking invoice customers back to tour-api records. Idempotent.

const statements = [
  `ALTER TABLE customers
     ADD COLUMN IF NOT EXISTS externalId INT DEFAULT NULL COMMENT 'tour-api web_members.id or bookings.id',
     ADD COLUMN IF NOT EXISTS externalSource VARCHAR(20) DEFAULT NULL COMMENT 'member | booking'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_external ON customers (externalSource, externalId)`,
];

async function main() {
  const conn = await mariadb.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  try {
    for (const sql of statements) {
      await conn.query(sql);
      console.log('OK:', sql.split('\n')[0].trim());
    }
    const cols = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers'
         AND COLUMN_NAME IN ('externalId','externalSource')`,
      [process.env.DB_DATABASE]
    );
    console.log('customers external columns present:', cols.map((c) => c.COLUMN_NAME));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
