import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import db2 from '@/lib/db2';

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
        q.id, q.quotationNumber, q.customerId, q.tourName, q.bookingCode, 
        q.ntCode, q.customTourCode, q.countryId, q.airlineId, q.wholesaleId,
        q.departureDate, q.returnDate, q.numDays, q.paxCount, q.saleId,
        q.quotationDate, q.validUntil, q.depositDueDate, 
        q.depositAmount, q.fullPaymentDueDate, q.fullPaymentAmount,
        q.subtotal, q.discountAmount, q.vatExemptAmount, q.preTaxAmount, 
        q.vatAmount, q.grandTotal, q.withholdingTax, q.hasWithholdingTax, 
        q.noCost, q.commission, q.commissionNote, q.status, q.paymentStatus, 
        q.notes, q.createdById, q.vatMode, q.preVatAmount, q.includeVatAmount, 
        q.netPayable, q.createdAt, q.updatedAt,
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

    const quotation = quotations[0];
    
    // Force noCost to be included
    if (!('noCost' in quotation)) {
      console.error('❌ noCost field missing from query result!');
      quotation.noCost = 0;
    }
    
    // console.log('🔍 API GET /quotations/[id]');
    // console.log('   quotation keys:', Object.keys(quotation));
    // console.log('   noCost value:', quotation.noCost, 'type:', typeof quotation.noCost);

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

    // Get sale name from DB2 if saleId exists
    let saleName = null;
    if (quotation.saleId) {
      try {
        const saleUsers = await db2.query(
          `SELECT name FROM users WHERE id = ?`,
          [quotation.saleId]
        );
        if (saleUsers && saleUsers.length > 0) {
          saleName = saleUsers[0].name;
        }
      } catch (err) {
        console.error('Error fetching sale name from DB2:', err);
      }
    }

    // Calculate invoiced amount (exclude CANCELLED/VOIDED invoices)
    const invoicedResult = await conn.query(
      `SELECT COALESCE(SUM(grandTotal), 0) as totalInvoiced
       FROM invoices
       WHERE quotationId = ? AND status NOT IN ('CANCELLED', 'VOIDED')`,
      [id]
    );
    const totalInvoiced = parseFloat(invoicedResult[0]?.totalInvoiced || 0);
    const remainingAmount = parseFloat(quotation.grandTotal || 0) - totalInvoiced;

    const result = {
      ...quotation,
      saleName,
      items,
      totalInvoiced,
      remainingAmount,
    };
    console.log('📤 API Response - noCost:', result.noCost, 'hasWithholdingTax:', result.hasWithholdingTax);

    return NextResponse.json(result);
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
        noCost = ?,
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
        body.status || 'NEW',
        body.paymentStatus || 'UNPAID',
        body.notes || null,
        body.noCost || false,
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

// PATCH - Partial update (status only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const { id } = await params;
    const body = await request.json();
    conn = await pool.getConnection();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.paymentStatus !== undefined) {
      updates.push('paymentStatus = ?');
      values.push(body.paymentStatus);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updatedAt = NOW()');
    values.push(id);

    await conn.query(
      `UPDATE quotations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error patching quotation:', error);
    return NextResponse.json(
      { error: 'Failed to update quotation status' },
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
