import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: Get a single purchase tax record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  try {
    const { id } = await params;

    const rows = await connection.query(`
      SELECT pt.*, u.name as createdByName
      FROM purchase_taxes pt
      LEFT JOIN users u ON pt.createdBy = u.id
      WHERE pt.id = ?
    `, [id]);

    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: 'Purchase tax not found' }, { status: 404 });
    }

    return NextResponse.json((rows as any[])[0]);
  } catch (error) {
    console.error('Error fetching purchase tax:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase tax' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// PUT: Update a purchase tax record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  try {
    const { id } = await params;
    const body = await request.json();
    const {
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
      status,
      updatedBy
    } = body;

    // Calculate amounts
    const serviceAmountNum = parseFloat(serviceAmount) || 0;
    const withholdingTaxRateNum = parseFloat(withholdingTaxRate) || 3;
    const vatRateNum = parseFloat(vatRate) || 7;
    
    const withholdingTaxAmount = hasWithholdingTax 
      ? (serviceAmountNum * withholdingTaxRateNum / 100) 
      : 0;
    
    const vatAmount = serviceAmountNum * vatRateNum / 100;
    const totalAmount = serviceAmountNum + vatAmount - withholdingTaxAmount;

    // Get existing slipUrl if not provided
    const existing = await connection.query(
      'SELECT slipUrl FROM purchase_taxes WHERE id = ?',
      [id]
    );

    const finalSlipUrl = slipUrl !== undefined ? slipUrl : ((existing as any[])[0]?.slipUrl || null);

    await connection.query(`
      UPDATE purchase_taxes SET
        wholesaleId = ?,
        referenceNumber = ?,
        vendorName = ?,
        vendorTaxId = ?,
        serviceAmount = ?,
        hasWithholdingTax = ?,
        withholdingTaxRate = ?,
        withholdingTaxAmount = ?,
        vatRate = ?,
        vatAmount = ?,
        totalAmount = ?,
        taxDate = ?,
        notes = ?,
        slipUrl = ?,
        status = ?,
        updatedBy = ?
      WHERE id = ?
    `, [
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
      finalSlipUrl,
      status || 'PENDING',
      updatedBy || null,
      id
    ]);

    // Fetch updated record
    const updatedRecord = await connection.query(`
      SELECT pt.*, u.name as createdByName
      FROM purchase_taxes pt
      LEFT JOIN users u ON pt.createdBy = u.id
      WHERE pt.id = ?
    `, [id]);

    return NextResponse.json((updatedRecord as any[])[0]);
  } catch (error) {
    console.error('Error updating purchase tax:', error);
    return NextResponse.json({ error: 'Failed to update purchase tax' }, { status: 500 });
  } finally {
    connection.release();
  }
}

// DELETE: Delete a purchase tax record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await pool.getConnection();
  try {
    const { id } = await params;

    const result = await connection.query(
      'DELETE FROM purchase_taxes WHERE id = ?',
      [id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Purchase tax not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Purchase tax deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase tax:', error);
    return NextResponse.json({ error: 'Failed to delete purchase tax' }, { status: 500 });
  } finally {
    connection.release();
  }
}
