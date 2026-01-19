import { NextRequest, NextResponse } from 'next/server';
import db2 from '@/lib/db2';

// GET - List all airlines from DB2 (tb_travel_type)
export async function GET(request: NextRequest) {
  let conn;
  try {
    conn = await db2.getConnection();

    // Query from tb_travel_type in DB2 (spgcen_web_sync)
    const query = `
      SELECT 
        id, 
        code, 
        travel_name as name
      FROM tb_travel_type 
      WHERE status = 'on'
      ORDER BY travel_name ASC
    `;

    const rows = await conn.query(query);

    // Convert BigInt to Number
    const airlines = rows.map((row: Record<string, unknown>) => ({
      id: row.id ? Number(row.id) : null,
      code: row.code || '',
      name: row.name || '',
    }));

    return NextResponse.json(airlines);
  } catch (error) {
    console.error('Error fetching airlines from DB2:', error);
    return NextResponse.json([]);
  } finally {
    if (conn) conn.release();
  }
}
