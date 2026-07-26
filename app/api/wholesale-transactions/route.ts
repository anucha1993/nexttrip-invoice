// app/api/wholesale-transactions/route.ts
// API สำหรับธุรกรรมการเงิน Wholesale (Payment & Refund)

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateDocumentNumber } from '@/lib/helpers/document-number';

// GET /api/wholesale-transactions - List transactions
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const { searchParams } = new URL(request.url);
    const quotationId = searchParams.get('quotationId');
    const wholesaleId = searchParams.get('wholesaleId');
    const transactionType = searchParams.get('type'); // PAYMENT or REFUND
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Build query
    let query = `
      SELECT 
        wt.*,
        q.quotationNumber,
        q.tourName,
        c.name as customerName,
        CONCAT(b.nameTH, ' - ', ba.accountNumber) as bankAccountName
      FROM wholesale_transactions wt
      LEFT JOIN quotations q ON wt.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      LEFT JOIN bank_accounts ba ON wt.bankAccountId = ba.id
      LEFT JOIN banks b ON ba.bankId = b.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (quotationId) {
      query += ' AND wt.quotationId = ?';
      params.push(quotationId);
    }
    
    if (wholesaleId) {
      query += ' AND wt.wholesaleId = ?';
      params.push(wholesaleId);
    }
    
    if (transactionType) {
      query += ' AND wt.transactionType = ?';
      params.push(transactionType);
    }
    
    if (status) {
      query += ' AND wt.status = ?';
      params.push(status);
    }
    
    // Count total
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    
    const countResult = await connection.query(countQuery, params);
    const total = Number(countResult[0]?.total) || 0;
    
    // Add sorting and pagination
    query += ' ORDER BY wt.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const transactions = await connection.query(query, params);
    
    // Serialize
    const serializedTransactions = transactions.map((t: any) => ({
      ...t,
      id: Number(t.id),
      quotationId: Number(t.quotationId),
      wholesaleId: t.wholesaleId ? Number(t.wholesaleId) : null,
      bankAccountId: t.bankAccountId ? Number(t.bankAccountId) : null,
      chequeBankId: t.chequeBankId ? Number(t.chequeBankId) : null,
      amount: parseFloat(t.amount) || 0,
    }));
    
    return NextResponse.json({
      transactions: serializedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching wholesale transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// POST /api/wholesale-transactions - Create new transaction (Payment or Refund)
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const body = await request.json();
    const {
      transactionType,  // 'PAYMENT' or 'REFUND'
      quotationId,
      wholesaleId,
      wholesaleName,
      amount: rawAmount,
      paymentMethod,
      transactionDate,
      paymentDate,
      slipUrl,
      referenceNumber,
      // Transfer specific
      bankAccountId,
      toBankName,
      toBankAccountNo,
      toBankAccountName,
      // Cheque specific
      chequeNumber,
      chequeDate,
      chequeBankId,
      // Refund specific
      refundReason,
      originalTransactionId,
      notes,
      createdById,
      createdByName,
      autoConfirm: rawAutoConfirm,  // ถ้า true จะ confirm ทันที
    } = body;
    
    // Round amount to 2 decimal places
    const amount = Math.round(parseFloat(rawAmount) * 100) / 100;
    
    // Ensure autoConfirm is boolean
    const autoConfirm = rawAutoConfirm === true || rawAutoConfirm === 'true';
    
    // Validate required fields
    if (!transactionType || !['PAYMENT', 'REFUND'].includes(transactionType)) {
      return NextResponse.json(
        { error: 'transactionType ต้องเป็น PAYMENT หรือ REFUND' },
        { status: 400 }
      );
    }
    
    if (!quotationId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ quotationId' },
        { status: 400 }
      );
    }
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุยอดเงินที่ถูกต้อง' },
        { status: 400 }
      );
    }
    
    // Validate refund reason
    if (transactionType === 'REFUND' && !refundReason) {
      return NextResponse.json(
        { error: 'กรุณาระบุเหตุผลในการรับเงินคืน' },
        { status: 400 }
      );
    }
    
    // Get quotation info
    const quotations = await connection.query(
      `SELECT q.id, q.quotationNumber, q.tourName, q.wholesaleId
       FROM quotations q WHERE q.id = ?`,
      [quotationId]
    );
    
    if (!quotations || quotations.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบใบเสนอราคา' },
        { status: 404 }
      );
    }
    
    const quotation = quotations[0];
    // Use wholesaleName from request body, or fallback to null
    const finalWholesaleName = wholesaleName || null;
    const finalWholesaleId = wholesaleId || quotation.wholesaleId || null;
    
    // Generate transaction number
    const docType = transactionType === 'PAYMENT' ? 'WS_PAYMENT' : 'WS_REFUND';
    const transactionNumber = await generateDocumentNumber(docType, connection);
    
    // Determine initial status
    const initialStatus = autoConfirm ? 'CONFIRMED' : 'PENDING';
    const now = new Date();
    
    // Insert transaction
    const result = await connection.query(
      `INSERT INTO wholesale_transactions (
        transactionNumber, transactionType, quotationId,
        wholesaleId, wholesaleName,
        amount, paymentMethod, transactionDate, paymentDate,
        bankAccountId, toBankName, toBankAccountNo, toBankAccountName,
        chequeNumber, chequeDate, chequeBankId,
        slipUrl, slipUploadedAt, referenceNumber,
        refundReason, originalTransactionId,
        status, confirmedAt, confirmedById, confirmedByName,
        notes, createdById, createdByName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionNumber,
        transactionType,
        quotationId,
        finalWholesaleId,
        finalWholesaleName,
        amount,
        paymentMethod || 'TRANSFER',
        transactionDate || now,
        paymentDate || now,
        bankAccountId || null,
        toBankName || null,
        toBankAccountNo || null,
        toBankAccountName || null,
        chequeNumber || null,
        chequeDate || null,
        chequeBankId || null,
        slipUrl || null,
        slipUrl ? now : null,
        referenceNumber || null,
        refundReason || null,
        originalTransactionId || null,
        initialStatus,
        autoConfirm ? now : null,
        autoConfirm ? createdById : null,
        autoConfirm ? createdByName : null,
        notes || null,
        createdById || null,
        createdByName || null,
      ]
    );
    
    const insertedId = result.insertId;
    
    await connection.commit();
    
    return NextResponse.json({
      success: true,
      message: transactionType === 'PAYMENT' 
        ? `บันทึกการจ่ายเงิน ${transactionNumber} เรียบร้อย`
        : `บันทึกการรับเงินคืน ${transactionNumber} เรียบร้อย`,
      transaction: {
        id: Number(insertedId),
        transactionNumber,
        transactionType,
        amount,
        status: initialStatus,
      },
    });
  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Error creating wholesale transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
