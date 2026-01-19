import { NextRequest, NextResponse } from 'next/server';
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: '103.80.48.25',
  port: 3306,
  user: 'mailfore_nexttrip_invoice',
  password: 'G2pvPm5acsB*o_z0',
  database: 'nexttrip_invoice',
  connectionLimit: 5,
});

// GET - รายการ Permissions ทั้งหมด
export async function GET() {
  let conn;
  try {
    conn = await pool.getConnection();
    const permissions = await conn.query(`
      SELECT id, code, name, module, description, createdAt, updatedAt
      FROM permissions
      ORDER BY module ASC, name ASC
    `);

    return NextResponse.json(permissions);
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// POST - สร้าง Permission ใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, module, description } = body;

    const permission = await prisma.permission.create({
      data: {
        code,
        name,
        module,
        description,
      },
    });

    return NextResponse.json(permission, { status: 201 });
  } catch (error: any) {
    console.error('Error creating permission:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'รหัส Permission นี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    );
  }
}
