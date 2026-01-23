import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: List purchase taxes for a quotation
export async function GET(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const quotationId = searchParams.get('quotationId');

    if (!quotationId) {
      return NextResponse.json({ error: 'quotationId is required' }, { status: 400 });
    }

    const rows = await connection.query(`
      SELECT 
        pt.*,
        u.name as createdByName
      FROM purchase_taxes pt
      LEFT JOIN users u ON pt.createdBy = u.id
      WHERE pt.quotationId = ?
      ORDER BY pt.createdAt DESC
    `, [quotationId]);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching purchase taxes:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase taxes' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// POST: Create a new purchase tax record
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const {
      quotationId,
      wholesaleId,
      referenceNumber,
      vendorName,
      vendorTaxId,
      serviceAmount,
      hasWithholdingTax,
      withholdingTaxRate = 3,
      vatRate = 7,
      taxDate,
      notes,
      slipUrl,
      createdBy
    } = body;

    if (!quotationId || !referenceNumber || !serviceAmount) {
      return NextResponse.json({ 
        error: 'quotationId, referenceNumber, and serviceAmount are required' 
      }, { status: 400 });
    }

    // Calculate amounts
    const serviceAmountNum = parseFloat(serviceAmount) || 0;
    const withholdingTaxRateNum = parseFloat(withholdingTaxRate) || 3;
    const vatRateNum = parseFloat(vatRate) || 7;
    
    // ภาษี ณ ที่จ่าย (ถ้าเลือก)
    const withholdingTaxAmount = hasWithholdingTax 
      ? (serviceAmountNum * withholdingTaxRateNum / 100) 
      : 0;
    
    // ภาษีซื้อ (VAT)
    const vatAmount = serviceAmountNum * vatRateNum / 100;
    
    // สรุปยอด = ค่าบริการ + VAT - ภาษี ณ ที่จ่าย
    const totalAmount = serviceAmountNum + vatAmount - withholdingTaxAmount;

    const result = await connection.query(`
      INSERT INTO purchase_taxes (
        quotationId, wholesaleId, referenceNumber, vendorName, vendorTaxId,
        serviceAmount, hasWithholdingTax, withholdingTaxRate, withholdingTaxAmount,
        vatRate, vatAmount, totalAmount, taxDate, notes, slipUrl, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      quotationId,
      wholesaleId || null,
      referenceNumber,
      vendorName || null,
      vendorTaxId || null,
      serviceAmountNum,
      hasWithholdingTax ? 1 : 0,
      withholdingTaxRateNum,
      withholdingTaxAmount,
      vatRateNum,
      vatAmount,
      totalAmount,
      taxDate || null,
      notes || null,
      slipUrl || null,
      createdBy || null
    ]);

    const insertId = (result as any).insertId;

    // Fetch the created record
    const newRecords = await connection.query(`
      SELECT pt.*, u.name as createdByName
      FROM purchase_taxes pt
      LEFT JOIN users u ON pt.createdBy = u.id
      WHERE pt.id = ?
    `, [insertId]);

    return NextResponse.json((newRecords as any[])[0], { status: 201 });
  } catch (error) {
    console.error('Error creating purchase tax:', error);
    return NextResponse.json({ error: 'Failed to create purchase tax' }, { status: 500 });
  } finally {
    connection.release();
  }
}
