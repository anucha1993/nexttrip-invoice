import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const runtime = 'nodejs';

// Generate running quotation number (QT + YY + MM + 0001)
async function generateQuotationNumber(): Promise<string> {
  const prefix = 'QT';
  const year = new Date().getFullYear().toString().slice(-2); // YY
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0'); // MM
  
  const currentPrefix = `${prefix}${year}${month}`;
  let conn;
  
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT quotationNumber FROM quotations 
       WHERE quotationNumber LIKE ? 
       ORDER BY quotationNumber DESC 
       LIMIT 1`,
      [`${currentPrefix}%`]
    );
    
    let newNumber = '0001';
    
    if (result.length > 0 && result[0].quotationNumber) {
      const lastFourDigits = result[0].quotationNumber.slice(-4);
      const incrementedNumber = parseInt(lastFourDigits, 10) + 1;
      newNumber = incrementedNumber.toString().padStart(4, '0');
    }
    
    return `${currentPrefix}${newNumber}`;
  } catch (error) {
    console.error('Error in generateQuotationNumber:', error);
    return `${currentPrefix}0001`;
  } finally {
    if (conn) conn.release();
  }
}

// Generate running booking code (BK + YY + MM + 0001)
async function generateBookingCode(): Promise<string> {
  const prefix = 'BK';
  const year = new Date().getFullYear().toString().slice(-2); // YY
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0'); // MM
  
  const currentPrefix = `${prefix}${year}${month}`;
  let conn;
  
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT bookingCode FROM quotations 
       WHERE bookingCode LIKE ? 
       ORDER BY bookingCode DESC 
       LIMIT 1`,
      [`${currentPrefix}%`]
    );
    
    let newNumber = '0001';
    
    if (result.length > 0 && result[0].bookingCode) {
      const lastFourDigits = result[0].bookingCode.slice(-4);
      const incrementedNumber = parseInt(lastFourDigits, 10) + 1;
      newNumber = incrementedNumber.toString().padStart(4, '0');
    }
    
    return `${currentPrefix}${newNumber}`;
  } catch (error) {
    console.error('Error in generateBookingCode:', error);
    return `${currentPrefix}0001`;
  } finally {
    if (conn) conn.release();
  }
}

// Generate running NT code (NT + YY + MM + 0001)
async function generateNTCode(): Promise<string> {
  const prefix = 'NT';
  const year = new Date().getFullYear().toString().slice(-2); // YY
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0'); // MM
  
  const currentPrefix = `${prefix}${year}${month}`;
  let conn;
  
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT ntCode FROM quotations 
       WHERE ntCode LIKE ? 
       ORDER BY ntCode DESC 
       LIMIT 1`,
      [`${currentPrefix}%`]
    );
    
    let newNumber = '0001';
    
    if (result.length > 0 && result[0].ntCode) {
      const lastFourDigits = result[0].ntCode.slice(-4);
      const incrementedNumber = parseInt(lastFourDigits, 10) + 1;
      newNumber = incrementedNumber.toString().padStart(4, '0');
    }
    
    return `${currentPrefix}${newNumber}`;
  } catch (error) {
    console.error('Error in generateNTCode:', error);
    return `${currentPrefix}0001`;
  } finally {
    if (conn) conn.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'quotation', 'bookingCode', or 'ntCode'
    
    if (type === 'quotation') {
      const quotationNumber = await generateQuotationNumber();
      return NextResponse.json({ quotationNumber });
    } else if (type === 'bookingCode') {
      const bookingCode = await generateBookingCode();
      return NextResponse.json({ bookingCode });
    } else if (type === 'ntCode') {
      const ntCode = await generateNTCode();
      return NextResponse.json({ ntCode });
    } else {
      // Generate all
      const [quotationNumber, bookingCode, ntCode] = await Promise.all([
        generateQuotationNumber(),
        generateBookingCode(),
        generateNTCode()
      ]);
      return NextResponse.json({ quotationNumber, bookingCode, ntCode });
    }
  } catch (error) {
    console.error('Error generating numbers:', error);
    return NextResponse.json(
      { error: 'Failed to generate numbers' },
      { status: 500 }
    );
  }
}
