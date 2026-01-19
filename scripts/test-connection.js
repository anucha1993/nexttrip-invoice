const mariadb = require('mariadb');

async function testConnection() {
  console.log('Testing database connection...');
  
  const pool = mariadb.createPool({
    host: '103.80.48.25',
    port: 3306,
    user: 'mailfore_nexttrip_invoice',
    password: 'G2pvPm5acsB*o_z0',
    database: 'nexttrip_invoice',
    connectionLimit: 5,
    acquireTimeout: 30000,
    connectTimeout: 10000,
  });

  try {
    console.log('Attempting to get connection...');
    const conn = await pool.getConnection();
    console.log('✅ Connection successful!');
    
    const rows = await conn.query('SELECT COUNT(*) as count FROM users');
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
