require('dotenv').config();
const mariadb = require('mariadb');

async function testConnection() {
  console.log('Testing database connection...');
  
  const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: 5,
    acquireTimeout: 30000,
    connectTimeout: 10000,
  });

  try {
    console.log('Attempting to get connection...');
    const conn = await pool.getConnection();
    console.log('✅ Connection successful!');
    
    const rows = await conn.query('SELECT COUNT(*) as count FROM user_accounts');
    console.log('User count:', rows[0].count);
    
    conn.release();
    await pool.end();
    
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    await pool.end();
  }
}

testConnection();
