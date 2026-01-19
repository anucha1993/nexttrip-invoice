import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - รายการ Products ทั้งหมด
export async function GET(request: NextRequest) {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const calculationType = searchParams.get('calculationType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const offset = (page - 1) * limit;
    
    let whereClause = ' WHERE 1=1';
    const params: string[] = [];
    
    if (search) {
      whereClause += ` AND name LIKE ?`;
      params.push(`%${search}%`);
    }
    
    if (calculationType) {
      whereClause += ` AND calculationType = ?`;
      params.push(calculationType);
    }
    
    // Count total
    const countResult = await conn.query(
      `SELECT COUNT(*) as total FROM products ${whereClause}`,
      params
    );
    const total = Number(countResult[0].total);
    
    // Get paginated data
    const query = `
      SELECT id, name, calculationType, includePax, isActive, createdAt, updatedAt
      FROM products
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    
    const products = await conn.query(query, [...params, limit, offset]);
    
    return NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// POST - สร้าง Product ใหม่
export async function POST(request: NextRequest) {
  let conn;
  try {
    const body = await request.json();
    const { name, price, calculationType, includePax } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อรายการ' },
        { status: 400 }
      );
    }

    conn = await pool.getConnection();
    const now = new Date();

    const result = await conn.query(`
      INSERT INTO products (name, price, calculationType, includePax, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, price || 0, calculationType || 'INCOME', includePax ? 1 : 0, 1, now, now]);

    // Get created product
    const products = await conn.query('SELECT * FROM products WHERE id = ?', [Number(result.insertId)]);

    return NextResponse.json(products[0], { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
