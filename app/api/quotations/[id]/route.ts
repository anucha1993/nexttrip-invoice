import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Get single quotation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    // Get quotation
    const quotations = await conn.query(
      `SELECT 
        q.*,
        c.code as customerCode,
        c.name as customerName,
        c.taxId as customerTaxId,
        c.email as customerEmail,
        c.phone as customerPhone,
        c.address as customerAddress,
        u.name as createdByName
      FROM quotations q
      LEFT JOIN customers c ON q.customerId = c.id
      LEFT JOIN users u ON q.createdById = u.id
      WHERE q.id = ?`,
      [id]
    );

    if (quotations.length === 0) {
      return NextResponse.json(
        { error: 'Quotation not found' },
        { status: 404 }
      );
    }

    // Get items
    const items = await conn.query(
      `SELECT 
        qi.*,
        p.name as productNameRef,
        p.calculationType,
        p.includePax
      FROM quotation_items qi
      LEFT JOIN products p ON qi.productId = p.id
      WHERE qi.quotationId = ?
      ORDER BY qi.sortOrder ASC`,
      [id]
    );

    return NextResponse.json({
      ...quotations[0],
      items,
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { error: 'Failed to fetch quotation', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// PUT - Update quotation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    const body = await request.json();
    conn = await pool.getConnection();

    // Validate and convert foreign key IDs
    const countryId = body.countryId && body.countryId !== '' ? Number(body.countryId) : null;
    const airlineId = body.airlineId && body.airlineId !== '' ? Number(body.airlineId) : null;
    const wholesaleId = body.wholesaleId && body.wholesaleId !== '' ? Number(body.wholesaleId) : null;
    const saleId = body.saleId && body.saleId !== '' ? Number(body.saleId) : null;

    // Update quotation
    await conn.query(
      `UPDATE quotations SET
        customerId = ?,
        tourName = ?,
        bookingCode = ?,
        ntCode = ?,
        customTourCode = ?,
        countryId = ?,
        airlineId = ?,
        wholesaleId = ?,
        departureDate = ?,
        returnDate = ?,
        numDays = ?,
        paxCount = ?,
        saleId = ?,
        quotationDate = ?,
        validUntil = ?,
        depositDueDate = ?,
        depositAmount = ?,
        fullPaymentDueDate = ?,
        fullPaymentAmount = ?,
        subtotal = ?,
        discountAmount = ?,
        vatExemptAmount = ?,
        preTaxAmount = ?,
        vatAmount = ?,
        grandTotal = ?,
        withholdingTax = ?,
        hasWithholdingTax = ?,
        commission = ?,
        commissionNote = ?,
        status = ?,
        paymentStatus = ?,
        notes = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [
        body.customerId,
        body.tourName,
        body.bookingCode || null,
        body.ntCode || null,
        body.customTourCode || null,
        countryId,
        airlineId,
        wholesaleId,
        body.departureDate || null,
        body.returnDate || null,
        body.numDays || null,
        body.paxCount || 0,
        saleId,
        body.quotationDate,
        body.validUntil || null,
        body.depositDueDate || null,
        body.depositAmount || 0,
        body.fullPaymentDueDate || null,
        body.fullPaymentAmount || 0,
        body.subtotal || 0,
        body.discountAmount || 0,
        body.vatExemptAmount || 0,
        body.preTaxAmount || 0,
        body.vatAmount || 0,
        body.grandTotal || 0,
        body.withholdingTax || 0,
        body.hasWithholdingTax || false,
        body.commission || 0,
        body.commissionNote || null,
        body.status || 'DRAFT',
        body.paymentStatus || 'UNPAID',
        body.notes || null,
        id,
      ]
    );

    // Update items - delete old and insert new
    if (body.items) {
      await conn.query('DELETE FROM quotation_items WHERE quotationId = ?', [id]);

      for (const item of body.items) {
        const itemId = crypto.randomUUID();
        await conn.query(
          `INSERT INTO quotation_items (
            id, quotationId, productId, productName, quantity, unitPrice,
            amount, itemType, vatType, hasWithholdingTax, sortOrder, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            itemId,
            id,
            item.productId || null,
            item.productName,
            item.quantity || 1,
            item.unitPrice || 0,
            item.amount || 0,
            item.itemType || 'INCOME',
            item.vatType || 'NO_VAT',
            item.hasWithholdingTax || false,
            item.sortOrder || 0,
          ]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating quotation:', error);
    return NextResponse.json(
      { error: 'Failed to update quotation' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}

// DELETE - Delete quotation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    conn = await pool.getConnection();

    // Delete items first (cascade should handle this but just in case)
    await conn.query('DELETE FROM quotation_items WHERE quotationId = ?', [id]);

    // Delete quotation
    await conn.query('DELETE FROM quotations WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete quotation' },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
