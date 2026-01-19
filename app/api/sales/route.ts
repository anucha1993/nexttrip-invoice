import { NextResponse } from 'next/server';
import db2 from '@/lib/db2';

// GET - List all sales from DB2 (users table)
export async function GET() {
  let conn;
  try {
    conn = await db2.getConnection();

    // role = 2 คือ sales staff, status = 'active' คือ active
    const rows = await conn.query(`
      SELECT 
        id, 
        name,
        email,
        phone
      FROM users 
      WHERE status = 'active' AND role = 2
      ORDER BY name ASC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

