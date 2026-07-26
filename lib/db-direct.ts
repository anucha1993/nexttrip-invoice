import mariadb from 'mariadb';
import { dbConfig } from './db-config';

const pool = mariadb.createPool({
  ...dbConfig,
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
