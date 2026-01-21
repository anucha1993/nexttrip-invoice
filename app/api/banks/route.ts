// app/api/banks/route.ts
// API สำหรับรายชื่อธนาคาร

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/banks - List all banks
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    
    let query = `
      SELECT id, code, nameTH, nameEN, swiftCode, isActive, sortOrder
      FROM banks
    `;
    
    if (activeOnly) {
      query += ' WHERE isActive = TRUE';
    }
    
    query += ' ORDER BY sortOrder, nameTH';
    
    const banks = await connection.query(query);
    
    return NextResponse.json({
      banks: banks.map((b: any) => ({
        ...b,
        id: Number(b.id),
        isActive: Boolean(b.isActive),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
