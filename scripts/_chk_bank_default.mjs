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
  const rows = await conn.query(
    `SELECT ba.id, ba.bankId, ba.accountNumber, ba.accountName, ba.isDefault, ba.isActive, b.nameTH
       FROM bank_accounts ba LEFT JOIN banks b ON ba.bankId = b.id
      ORDER BY ba.sortOrder, b.nameTH`
  );
  console.log(rows.map(r => ({ id: Number(r.id), bank: r.nameTH, accountNumber: r.accountNumber, isDefault: !!r.isDefault, isActive: !!r.isActive })));
} finally {
  conn.release();
  await pool.end();
}
