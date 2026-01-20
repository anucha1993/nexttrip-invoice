import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

// GET - List quotations with pagination and search
export async function GET(request: NextRequest) {
  console.log('📥 GET /api/quotations - Request received');
  let conn;
  try {
    // ✅ Check authentication
    const session = await requireAuth();
    console.log('✅ Authenticated user:', session.id);
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    console.log('🔍 Query params:', { page, limit, search, status });

    console.log('🔌 Getting database connection...');
    conn = await pool.getConnection();
    console.log('✅ Database connected');

    // Build WHERE clause
    let whereClause = '1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ` AND (q.quotationNumber LIKE ? OR q.tourName LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (status) {
      whereClause += ` AND q.status = ?`;
      params.push(status);
    }

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM quotations q
      LEFT JOIN customers c ON q.customerId = c.id
      WHERE ${whereClause}
    `;
    const countResult = await conn.query(countQuery, params);
    const total = Number(countResult[0].total);

    // Get data with pagination
    const dataQuery = `
      SELECT 
        q.id,
        q.quotationNumber,
        q.tourName,
        q.bookingCode,
        q.ntCode,
        q.customTourCode,
        q.departureDate,
        q.returnDate,
        q.numDays,
        nd.num_day_name as numDaysName,
        q.paxCount,
        q.grandTotal,
        q.status,
        q.paymentStatus,
        q.quotationDate,
        q.createdAt,
        q.countryId,
        q.airlineId,
        q.wholesaleId,
        q.saleId,
        c.id as customerId,
        c.name as customerName,
        c.phone as customerPhone
      FROM quotations q
      LEFT JOIN customers c ON q.customerId = c.id
      LEFT JOIN num_days nd ON q.numDays = nd.num_day_id
      WHERE ${whereClause}
      ORDER BY q.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limit, offset];
    const rows = await conn.query(dataQuery, dataParams);

    console.log('📊 Query results:', { totalRows: rows.length, total, page, limit });

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching quotations:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to fetch quotations',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    if (conn) {
      console.log('🔌 Releasing database connection');
      conn.release();
    }
  }
}

// POST - Create new quotation
export async function POST(request: NextRequest) {
  let conn;
  try {
    // ✅ Check authentication
    const session = await requireAuth();
    console.log('✅ Authenticated user creating quotation:', session.id);
    
    const body = await request.json();
    conn = await pool.getConnection();

    // Use provided quotationNumber or generate new one
    let quotationNumber = body.quotationNumber;
    
    if (!quotationNumber) {
      // Generate quotation number: QT + YY + MM + XXXX
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `QT${year}${month}`;

      // Get last number for this month
      const lastQuote = await conn.query(
        `SELECT quotationNumber FROM quotations 
         WHERE quotationNumber LIKE ? 
         ORDER BY quotationNumber DESC LIMIT 1`,
        [`${prefix}%`]
      );

      let nextNumber = 1;
      if (lastQuote.length > 0) {
        const lastNum = parseInt(lastQuote[0].quotationNumber.slice(-4));
        nextNumber = lastNum + 1;
      }

      quotationNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }
    
    const now = new Date();

    // Validate and convert foreign key IDs (convert to Number or null)
    // Note: IDs come from DB2, no need to validate against DB1 foreign keys
    const countryId = body.countryId && body.countryId !== '' ? Number(body.countryId) : null;
    const airlineId = body.airlineId && body.airlineId !== '' ? Number(body.airlineId) : null;
    const wholesaleId = body.wholesaleId && body.wholesaleId !== '' ? Number(body.wholesaleId) : null;
    const saleId = body.saleId && body.saleId !== '' ? Number(body.saleId) : null;

    // Insert quotation (id is auto-increment)
    const result = await conn.query(
      `INSERT INTO quotations (
        quotationNumber, customerId, tourName, bookingCode, ntCode, customTourCode,
        countryId, airlineId, wholesaleId, departureDate, returnDate,
        numDays, paxCount, saleId, quotationDate, validUntil,
        depositDueDate, depositAmount, fullPaymentDueDate, fullPaymentAmount,
        subtotal, discountAmount, vatExemptAmount, preTaxAmount, vatAmount,
        grandTotal, withholdingTax, hasWithholdingTax, commission, commissionNote,
        status, paymentStatus, notes, createdById,
        vatMode, preVatAmount, includeVatAmount, netPayable, noCost,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        quotationNumber,
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
        body.quotationDate || now,
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
        body.createdById || 'system',
        body.vatMode || 'EXCLUDE',
        body.preVatAmount || 0,
        body.includeVatAmount || 0,
        body.netPayable || 0,
        body.noCost || false,
      ]
    );

    // Get the inserted id
    const insertId = Number(result.insertId);

    // Insert items if provided
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        await conn.query(
          `INSERT INTO quotation_items (
            quotationId, productId, productName, quantity, unitPrice,
            amount, itemType, vatType, hasWithholdingTax, sortOrder, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            insertId,
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

    return NextResponse.json({
      success: true,
      id: insertId,
      quotationNumber,
    });
  } catch (error) {
    console.error('Error creating quotation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create quotation', details: errorMessage },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
