import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  let conn;
  try {
    conn = await pool.getConnection();
    const countries = await conn.query(
      'SELECT id, code, nameTh FROM countries ORDER BY id LIMIT 50'
    );
    return NextResponse.json({ countries });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
