import { NextRequest, NextResponse } from 'next/server';
import db2 from '@/lib/db2';

// GET - List all wholesales from DB2 (tb_wholesale)
export async function GET(request: NextRequest) {
  let conn;
  try {
    conn = await db2.getConnection();

    // Query from tb_wholesale in DB2 (spgcen_web_sync)
    const query = `
      SELECT 
        id, 
        code, 
        wholesale_name_th as nameTh, 
        wholesale_name_en as nameEn
      FROM tb_wholesale 
      WHERE status = 'on'
      ORDER BY wholesale_name_th ASC
    `;

    const rows = await conn.query(query);

    // Convert BigInt to Number
    const wholesales = rows.map((row: Record<string, unknown>) => ({
      id: row.id ? Number(row.id) : null,
      code: row.code || '',
      nameTh: row.nameTh || '',
      nameEn: row.nameEn || '',
    }));

    return NextResponse.json(wholesales);
  } catch (error) {
    console.error('Error fetching wholesales from DB2:', error);
    return NextResponse.json([]);
  } finally {
    if (conn) conn.release();
  }
}
