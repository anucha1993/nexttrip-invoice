import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';
import type { PoolConnection } from 'mariadb';

function generateCuid() {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

// GET - รายการ Customers ทั้งหมด
export async function GET(request: NextRequest) {
  let conn;
  try {
    conn = await pool.getConnection();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    
    let query = `
      SELECT id, code, name, taxId, email, phone, fax, customerFrom, socialId, 
             address, source, contactName, contactPhone, notes, isActive, createdAt, updatedAt
      FROM customers
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (search) {
      query += ` AND (name LIKE ? OR code LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (source) {
      query += ` AND source = ?`;
      params.push(source);
    }
    
    query += ` ORDER BY createdAt DESC`;
    
    const result = await conn.query(query, params);
    // Ensure we return a proper array
    const customers = Array.isArray(result) ? result : (result.value || []);
    
    return NextResponse.json(customers);
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// GET - สร้างรหัสลูกค้าใหม่
async function generateCustomerCode(conn: PoolConnection): Promise<string> {
  const result = await conn.query(`
    SELECT code FROM customers 
    WHERE code LIKE 'CUS%' 
    ORDER BY code DESC 
    LIMIT 1
  `);
  
  if (result.length === 0) {
    return 'CUS0001';
  }
  
  const lastCode = result[0].code;
  const numPart = parseInt(lastCode.replace('CUS', ''), 10);
  const nextNum = numPart + 1;
  return `CUS${nextNum.toString().padStart(4, '0')}`;
}

// POST - สร้าง Customer ใหม่
export async function POST(request: NextRequest) {
  let conn;
  try {
    const body = await request.json();
    const { 
      customerId, customerTypeNew, // For checking if old customer or new
      name, taxId, email, phone, fax, customerFrom, socialId, 
      address, source, contactName, contactPhone, notes, isActive 
    } = body;

    conn = await pool.getConnection();

    // Case 1: Update existing customer (customerTypeNew == "customerOld" and customerId provided)
    if (customerTypeNew === 'customerOld' && customerId) {
      const now = new Date();
      await conn.query(`
        UPDATE customers 
        SET name = ?, taxId = ?, email = ?, phone = ?, fax = ?, customerFrom = ?, 
            socialId = ?, address = ?, source = ?, contactName = ?, contactPhone = ?, 
            notes = ?, isActive = ?, updatedAt = ?
        WHERE id = ?
      `, [name, taxId || null, email || null, phone || null, fax || null, 
          customerFrom || null, socialId || null, address || null, source || null,
          contactName || null, contactPhone || null, notes || null, isActive ?? true, now, customerId]);

      const customers = await conn.query('SELECT * FROM customers WHERE id = ?', [customerId]);
      return NextResponse.json(customers[0]);
    }

    // Case 2: New customer - check for duplicates (by name, email, or phone)
    let existingCustomer = null;
    
    if (customerTypeNew !== 'customerOld') {
      const checkQuery = `
        SELECT * FROM customers 
        WHERE (name = ? OR email = ? OR phone = ?)
        AND name IS NOT NULL 
        AND (email IS NOT NULL OR phone IS NOT NULL)
        LIMIT 1
      `;
      const existingCustomers = await conn.query(checkQuery, [
        name || '',
        email || '',
        phone || ''
      ]);
      
      if (existingCustomers.length > 0) {
        existingCustomer = existingCustomers[0];
      }
    }

    // Case 2a: Found duplicate - update existing customer
    if (existingCustomer) {
      const now = new Date();
      await conn.query(`
        UPDATE customers 
        SET name = ?, taxId = ?, email = ?, phone = ?, fax = ?, customerFrom = ?, 
            socialId = ?, address = ?, source = ?, contactName = ?, contactPhone = ?, 
            notes = ?, isActive = ?, updatedAt = ?
        WHERE id = ?
      `, [name, taxId || null, email || null, phone || null, fax || null, 
          customerFrom || null, socialId || null, address || null, source || null,
          contactName || null, contactPhone || null, notes || null, isActive ?? true, now, existingCustomer.id]);

      const customers = await conn.query('SELECT * FROM customers WHERE id = ?', [existingCustomer.id]);
      return NextResponse.json(customers[0]);
    }

    // Case 2b: No duplicate - create new customer with auto-generated code
    const code = await generateCustomerCode(conn);
    const id = generateCuid();
    const now = new Date();

    await conn.query(`
      INSERT INTO customers (id, code, name, taxId, email, phone, fax, customerFrom, socialId, 
                            address, source, contactName, contactPhone, notes, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, code, name, taxId || null, email || null, phone || null, fax || null, 
        customerFrom || null, socialId || null, address || null, source || null,
        contactName || null, contactPhone || null, notes || null, isActive ?? true, now, now]);

    const customers = await conn.query('SELECT * FROM customers WHERE id = ?', [id]);
    return NextResponse.json(customers[0], { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer', details: error?.message },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
