import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - ดึงข้อมูล Product ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    const products = await conn.query(`
      SELECT id, name, price, calculationType, includePax, isActive, createdAt, updatedAt
      FROM products
      WHERE id = ?
    `, [id]);

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบรายการสินค้า/บริการ' },
        { status: 404 }
      );
    }

    return NextResponse.json(products[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// PUT - แก้ไข Product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price, calculationType, includePax, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อรายการ' },
        { status: 400 }
      );
    }

    conn = await pool.getConnection();

    // Check if exists
    const existing = await conn.query('SELECT id FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบรายการสินค้า/บริการ' },
        { status: 404 }
      );
    }

    const now = new Date();

    await conn.query(`
      UPDATE products 
      SET name = ?, price = ?, calculationType = ?, includePax = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `, [name, price || 0, calculationType || 'INCOME', includePax ? 1 : 0, isActive ? 1 : 0, now, id]);

    // Get updated product
    const products = await conn.query('SELECT * FROM products WHERE id = ?', [id]);

    return NextResponse.json(products[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// DELETE - ลบ Product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    // Check if exists
    const existing = await conn.query('SELECT id FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบรายการสินค้า/บริการ' },
        { status: 404 }
      );
    }

    await conn.query('DELETE FROM products WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
