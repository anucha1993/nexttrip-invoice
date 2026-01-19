import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - List all num days
export async function GET() {
  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(`
      SELECT 
        num_day_id as id,
        num_day_total as total,
        num_day_name as name
      FROM num_days
      ORDER BY num_day_total ASC, num_day_id ASC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching num days:', error);
    return NextResponse.json(
      { error: 'Failed to fetch num days' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
