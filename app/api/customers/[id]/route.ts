import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - ดึงข้อมูล Customer ตาม ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    const customers = await conn.query(`
      SELECT id, code, name, taxId, email, phone, fax, customerFrom, socialId, 
             address, source, contactName, contactPhone, notes, isActive, createdAt, updatedAt
      FROM customers WHERE id = ?
    `, [id]);

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get quotation count
    const quotationCount = await conn.query(
      'SELECT COUNT(*) as count FROM quotations WHERE customerId = ?', [id]
    );
    
    // Get invoice count
    const invoiceCount = await conn.query(
      'SELECT COUNT(*) as count FROM invoices WHERE customerId = ?', [id]
    );

    const customer = {
      ...customers[0],
      _count: {
        quotations: Number(quotationCount[0].count),
        invoices: Number(invoiceCount[0].count),
      }
    };

    return NextResponse.json(customer);
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// PUT - แก้ไข Customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      code, name, taxId, email, phone, fax, customerFrom, socialId, 
      address, source, contactName, contactPhone, notes, isActive 
    } = body;

    conn = await pool.getConnection();

    // Check if code exists for other customers
    const existing = await conn.query('SELECT id FROM customers WHERE code = ? AND id != ?', [code, id]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'รหัสลูกค้านี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }

    const now = new Date();

    await conn.query(`
      UPDATE customers SET 
        code = ?, name = ?, taxId = ?, email = ?, phone = ?, fax = ?, 
        customerFrom = ?, socialId = ?, address = ?, source = ?, 
        contactName = ?, contactPhone = ?, notes = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `, [code, name, taxId || null, email || null, phone || null, fax || null,
        customerFrom || null, socialId || null, address || null, source || null,
        contactName || null, contactPhone || null, notes || null, isActive, now, id]);

    // Get updated customer
    const customers = await conn.query('SELECT * FROM customers WHERE id = ?', [id]);

    return NextResponse.json(customers[0]);
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// DELETE - ลบ Customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    // Check if customer has quotations or invoices
    const quotationCount = await conn.query(
      'SELECT COUNT(*) as count FROM quotations WHERE customerId = ?', [id]
    );
    const invoiceCount = await conn.query(
      'SELECT COUNT(*) as count FROM invoices WHERE customerId = ?', [id]
    );

    const totalDocs = Number(quotationCount[0].count) + Number(invoiceCount[0].count);
    if (totalDocs > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบได้ เนื่องจากมีเอกสารที่เกี่ยวข้อง ${totalDocs} รายการ` },
        { status: 400 }
      );
    }

    await conn.query('DELETE FROM customers WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
