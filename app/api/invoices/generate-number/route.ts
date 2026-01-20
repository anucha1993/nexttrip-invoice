// app/api/invoices/generate-number/route.ts
// API สำหรับ Generate Invoice Number

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateDocumentNumber } from '@/lib/helpers/document-number';

export async function GET() {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const invoiceNumber = await generateDocumentNumber('INVOICE', connection);
    
    return NextResponse.json({ invoiceNumber });
  } catch (error: any) {
    console.error('Error generating invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice number', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
