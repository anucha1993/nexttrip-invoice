import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { fetchSale, fetchWholesaler, notifyBookingInvoiceStatus } from '@/lib/services/tour-api';

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
        q.ntCode, q.customTourCode, q.tourType, q.countryId, q.airlineId, q.wholesaleId,
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
      LEFT JOIN user_accounts u ON q.createdById = u.id
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

    // Get sale name from tour-api if saleId exists
    let saleName: string | null = null;
    if (quotation.saleId) {
      const sale = await fetchSale(Number(quotation.saleId));
      if (sale) saleName = sale.name;
    }

    // Get wholesale name and taxId from tour-api if wholesaleId exists
    let wholesaleName: string | null = null;
    let wholesaleTaxId: string | null = null;
    if (quotation.wholesaleId) {
      const wholesale = await fetchWholesaler(Number(quotation.wholesaleId));
      if (wholesale) {
        wholesaleName = wholesale.nameTh || wholesale.nameEn || null;
        wholesaleTaxId = wholesale.taxId || null;
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

    // Calculate paid and refunded amounts from confirmed transactions
    const paymentResult = await conn.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN transactionType = 'PAYMENT' AND status = 'CONFIRMED' THEN amount ELSE 0 END), 0) as totalPaid,
        COALESCE(SUM(CASE WHEN transactionType = 'REFUND' AND status = 'CONFIRMED' THEN amount ELSE 0 END), 0) as totalRefunded
       FROM customer_transactions
       WHERE quotationId = ?`,
      [id]
    );
    const totalPaid = parseFloat(paymentResult[0]?.totalPaid || 0);
    const totalRefunded = parseFloat(paymentResult[0]?.totalRefunded || 0);
    // ยอดคงเหลือ = ยอด grandTotal - ชำระแล้ว + คืนเงิน
    const balanceAmount = Math.round((parseFloat(quotation.grandTotal || 0) - totalPaid + totalRefunded) * 100) / 100;

    // คำนวณ paymentStatus ที่ถูกต้องจาก totalPaid
    const grandTotal = parseFloat(quotation.grandTotal) || 0;
    let calculatedPaymentStatus = quotation.paymentStatus || 'UNPAID';
    if (grandTotal > 0) {
      const netPaid = totalPaid - totalRefunded;
      if (netPaid >= grandTotal) {
        calculatedPaymentStatus = 'PAID';
      } else if (netPaid > 0) {
        calculatedPaymentStatus = 'PARTIAL';
      } else {
        calculatedPaymentStatus = 'UNPAID';
      }
    }

    const result = {
      ...quotation,
      saleName,
      wholesaleName,
      wholesaleTaxId,
      items,
      totalInvoiced,
      remainingAmount,
      totalPaid,
      totalRefunded,
      balanceAmount,
      paymentStatus: calculatedPaymentStatus,
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
        tourType = ?,
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
        ['NORMAL', 'PROMOTION', 'FLASH_SALE'].includes(body.tourType) ? body.tourType : 'NORMAL',
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

    // ป้องกันการลบใบเสนอราคาที่มีใบแจ้งหนี้อ้างอิงอยู่แล้ว (จะทำให้ invoices.quotationId
    // กลายเป็นข้อมูลกำพร้า) — ต้องยกเลิก/ลบใบแจ้งหนี้เหล่านั้นก่อน
    const invoiceRows = await conn.query(
      'SELECT COUNT(*) as cnt FROM invoices WHERE quotationId = ?',
      [id]
    );
    const invoiceCount = Number(invoiceRows[0]?.cnt || 0);
    if (invoiceCount > 0) {
      return NextResponse.json(
        {
          error: `ไม่สามารถลบได้: มีใบแจ้งหนี้ ${invoiceCount} รายการอ้างอิงใบเสนอราคานี้อยู่ กรุณายกเลิก/ลบใบแจ้งหนี้ก่อน`,
        },
        { status: 409 }
      );
    }

    // ถ้าใบเสนอราคานี้ถูกสร้างมาจาก Booking ต้องแจ้ง tour-api ว่ายกเลิกแล้ว
    // (best-effort) เพื่อรีเซ็ตป้าย "Invoice ✓" ที่หน้า booking กลับเป็น
    // "ยังไม่ได้ส่ง" — ไม่เช่นนั้นฝั่ง booking จะค้างว่าส่งไปแล้วทั้งที่ถูกลบไปแล้ว
    const bookingRows = await conn.query(
      'SELECT bookingId, quotationNumber FROM quotations WHERE id = ? LIMIT 1',
      [id]
    );
    const bookingId = bookingRows[0]?.bookingId;
    const quotationNumber = bookingRows[0]?.quotationNumber;

    // Delete items first (cascade should handle this but just in case)
    await conn.query('DELETE FROM quotation_items WHERE quotationId = ?', [id]);

    // Delete quotation
    await conn.query('DELETE FROM quotations WHERE id = ?', [id]);

    if (bookingId != null) {
      try {
        await notifyBookingInvoiceStatus({
          bookingId: Number(bookingId),
          status: 'cancelled',
          quotationNumber,
          note: 'ใบเสนอราคาถูกลบจากระบบ Invoice',
        });
      } catch (err) {
        // ไม่ block การลบเพราะเรื่องแจ้งเตือนล้มเหลว — tour-api อาจไม่ว่างชั่วคราว
        console.error('⚠️ DELETE quotation: tour-api callback failed:', err);
      }
    }

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
