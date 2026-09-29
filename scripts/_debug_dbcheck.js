require('dotenv').config();
const mariadb = require('mariadb');

(async () => {
  try {
    const conn = await mariadb.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      connectTimeout: 8000,
    });
    console.log('✅ Connected OK');
    const rows2 = await conn.query('SELECT USER() as me, @@max_user_connections as max_conn');
    console.log(rows2);
    await conn.end();
  } catch (err) {
    console.log('❌ Connection FAILED');
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
  }
})();
