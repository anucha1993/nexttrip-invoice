import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: '103.80.48.25',
  port: 3306,
  user: 'mailfore_nexttrip_invoice',
  password: 'G2pvPm5acsB*o_z0',
  database: 'nexttrip_invoice',
  connectionLimit: 10,
  acquireTimeout: 30000,
  connectTimeout: 10000,
});

export async function query(sql: string, params: any[] = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

export default pool;
