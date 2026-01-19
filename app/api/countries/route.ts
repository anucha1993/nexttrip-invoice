import { NextRequest, NextResponse } from 'next/server';
import db2 from '@/lib/db2';

// GET - List all countries from DB2 (tb_country)
export async function GET(request: NextRequest) {
  let conn;
  try {
    conn = await db2.getConnection();

    // Query from tb_country in DB2 (spgcen_web_sync)
    const query = `
      SELECT 
        id, 
        iso2 as code, 
        country_name_th as nameTh, 
        country_name_en as nameEn
      FROM tb_country 
      WHERE status = 'on'
      ORDER BY country_name_th ASC
    `;

    const rows = await conn.query(query);

    // Convert BigInt to Number
    const countries = rows.map((row: Record<string, unknown>) => ({
      id: row.id ? Number(row.id) : null,
      code: row.code || '',
      nameTh: row.nameTh || '',
      nameEn: row.nameEn || '',
    }));

    return NextResponse.json(countries);
  } catch (error) {
    console.error('Error fetching countries from DB2:', error);
    return NextResponse.json([]);
  } finally {
    if (conn) conn.release();
  }
}
