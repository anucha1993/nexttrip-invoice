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
    `SELECT \`key\`, \`value\` FROM company_settings WHERE \`key\` LIKE 'line_oa_%' ORDER BY \`key\``
  );
  console.log(JSON.stringify(rows, null, 2));
} finally {
  conn.release();
  await pool.end();
}
