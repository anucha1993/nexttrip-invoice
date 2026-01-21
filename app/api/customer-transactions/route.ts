// app/api/customer-transactions/route.ts
// API สำหรับธุรกรรมการเงินลูกค้า (Payment & Refund)

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateDocumentNumber } from '@/lib/helpers/document-number';

// GET /api/customer-transactions - List transactions
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const { searchParams } = new URL(request.url);
    const quotationId = searchParams.get('quotationId');
    const invoiceId = searchParams.get('invoiceId');
    const transactionType = searchParams.get('type'); // PAYMENT or REFUND
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Build query
    let query = `
      SELECT 
        ct.*,
        i.invoiceNumber,
        i.grandTotal as invoiceTotal,
        q.quotationNumber,
        q.tourName,
        c.name as customerName,
        r.receiptNumber,
        cn.creditNoteNumber
      FROM customer_transactions ct
      LEFT JOIN invoices i ON ct.invoiceId = i.id
      LEFT JOIN quotations q ON ct.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      LEFT JOIN receipts r ON r.transactionId = ct.id AND r.status = 'ISSUED'
      LEFT JOIN credit_notes cn ON cn.transactionId = ct.id AND cn.status = 'ISSUED'
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (quotationId) {
      query += ' AND ct.quotationId = ?';
      params.push(quotationId);
    }
    
    if (invoiceId) {
      query += ' AND ct.invoiceId = ?';
      params.push(invoiceId);
    }
    
    if (transactionType) {
      query += ' AND ct.transactionType = ?';
      params.push(transactionType);
    }
    
    if (status) {
      query += ' AND ct.status = ?';
      params.push(status);
    }
    
    // Count total
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    ).replace(/LEFT JOIN receipts[\s\S]*?LEFT JOIN credit_notes[\s\S]*?WHERE/, 'WHERE');
    
    const countResult = await connection.query(countQuery, params);
    const total = Number(countResult[0]?.total) || 0;
    
    // Add sorting and pagination
    query += ' ORDER BY ct.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const transactions = await connection.query(query, params);
    
    // Serialize
    const serializedTransactions = transactions.map((t: any) => ({
      ...t,
      id: Number(t.id),
      invoiceId: Number(t.invoiceId),
      quotationId: Number(t.quotationId),
      amount: parseFloat(t.amount) || 0,
      invoiceTotal: parseFloat(t.invoiceTotal) || 0,
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
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// POST /api/customer-transactions - Create new transaction (Payment or Refund)
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const body = await request.json();
    const {
      transactionType,  // 'PAYMENT' or 'REFUND'
      invoiceId,
      amount: rawAmount,
      paymentMethod,
      paymentDate,
      slipUrl,
      referenceNumber,
      bankAccount,
      refundReason,
      originalTransactionId,
      notes,
      createdById,
      createdByName,
      autoConfirm: rawAutoConfirm,  // ถ้า true จะ confirm ทันทีและออกเอกสาร
      // Transfer specific
      bankAccountId,
      // Cheque specific
      chequeNumber,
      chequeDate,
      chequeBankId,
    } = body;
    
    // Round amount to 2 decimal places to avoid floating point precision issues
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
    
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ invoiceId' },
        { status: 400 }
      );
    }
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุยอดเงินที่ถูกต้อง' },
        { status: 400 }
      );
    }
    
    // Get invoice info
    const invoices = await connection.query(
      `SELECT i.id, i.invoiceNumber, i.grandTotal, i.paidAmount, i.refundedAmount, 
              i.quotationId, i.status,
              q.quotationNumber 
       FROM invoices i 
       LEFT JOIN quotations q ON i.quotationId = q.id
       WHERE i.id = ?`,
      [invoiceId]
    );
    
    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบใบแจ้งหนี้' },
        { status: 404 }
      );
    }
    
    const invoice = invoices[0];
    const quotationId = invoice.quotationId;
    
    // Validate amount for PAYMENT
    if (transactionType === 'PAYMENT') {
      const balanceAmount = parseFloat(invoice.grandTotal) - parseFloat(invoice.paidAmount || 0) + parseFloat(invoice.refundedAmount || 0);
      if (amount > balanceAmount) {
        return NextResponse.json(
          { error: `ยอดชำระเกินยอดคงเหลือ (คงเหลือ: ${balanceAmount.toLocaleString()} บาท)` },
          { status: 400 }
        );
      }
    }
    
    // Validate amount for REFUND
    if (transactionType === 'REFUND') {
      const paidAmount = parseFloat(invoice.paidAmount || 0) - parseFloat(invoice.refundedAmount || 0);
      if (amount > paidAmount) {
        return NextResponse.json(
          { error: `ยอดคืนเงินเกินยอดที่ชำระ (ชำระแล้ว: ${paidAmount.toLocaleString()} บาท)` },
          { status: 400 }
        );
      }
      
      if (!refundReason) {
        return NextResponse.json(
          { error: 'กรุณาระบุเหตุผลในการคืนเงิน' },
          { status: 400 }
        );
      }
    }
    
    // Generate transaction number
    const docType = transactionType === 'PAYMENT' ? 'PAYMENT' : 'REFUND';
    const transactionNumber = await generateDocumentNumber(docType, connection);
    
    // Determine initial status - auto confirm if autoConfirm is true (has slip attached)
    const initialStatus = autoConfirm ? 'CONFIRMED' : 'PENDING';
    
    console.log('Transaction creation:', { autoConfirm, slipUrl, initialStatus });
    
    // Insert transaction with new fields
    const result = await connection.query(
      `INSERT INTO customer_transactions (
        transactionNumber, transactionType, invoiceId, quotationId,
        amount, paymentMethod, paymentDate,
        slipUrl, slipUploadedAt, referenceNumber, bankAccount,
        bankAccountId, chequeNumber, chequeDate, chequeBankId,
        refundReason, originalTransactionId,
        status, confirmedAt, confirmedById, confirmedByName,
        notes, createdById, createdByName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionNumber,
        transactionType,
        invoiceId,
        quotationId,
        amount,
        paymentMethod || 'TRANSFER',
        paymentDate || new Date().toISOString().split('T')[0],
        slipUrl || null,
        slipUrl ? new Date() : null,
        referenceNumber || null,
        bankAccount || null,
        bankAccountId || null,
        chequeNumber || null,
        chequeDate || null,
        chequeBankId || null,
        refundReason || null,
        originalTransactionId || null,
        initialStatus,
        initialStatus === 'CONFIRMED' ? new Date() : null,
        initialStatus === 'CONFIRMED' ? createdById : null,
        initialStatus === 'CONFIRMED' ? createdByName : null,
        notes || null,
        createdById || null,
        createdByName || null,
      ]
    );
    
    const transactionId = result.insertId;
    
    // If auto-confirmed, issue document and update invoice
    let documentNumber = null;
    if (initialStatus === 'CONFIRMED') {
      if (transactionType === 'PAYMENT') {
        // Issue Receipt
        const receiptNumber = await generateDocumentNumber('RECEIPT', connection);
        await connection.query(
          `INSERT INTO receipts (
            receiptNumber, transactionId, invoiceId, quotationId,
            amount, paymentMethod, paymentDate,
            issuedById, issuedByName
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            receiptNumber,
            transactionId,
            invoiceId,
            quotationId,
            amount,
            paymentMethod || 'TRANSFER',
            paymentDate || new Date().toISOString().split('T')[0],
            createdById || null,
            createdByName || null,
          ]
        );
        documentNumber = receiptNumber;
        
        // Update invoice paidAmount
        await connection.query(
          `UPDATE invoices SET 
            paidAmount = COALESCE(paidAmount, 0) + ?,
            status = CASE 
              WHEN COALESCE(paidAmount, 0) + ? >= grandTotal THEN 'PAID'
              ELSE 'PARTIAL_PAID'
            END,
            updatedAt = NOW()
           WHERE id = ?`,
          [amount, amount, invoiceId]
        );
      } else {
        // Issue Credit Note
        const creditNoteNumber = await generateDocumentNumber('CREDIT_NOTE', connection);
        await connection.query(
          `INSERT INTO credit_notes (
            creditNoteNumber, transactionId, invoiceId, quotationId,
            amount, reason, refundDate, refundMethod,
            issuedById, issuedByName
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            creditNoteNumber,
            transactionId,
            invoiceId,
            quotationId,
            amount,
            refundReason,
            paymentDate || new Date().toISOString().split('T')[0],
            paymentMethod || 'TRANSFER',
            createdById || null,
            createdByName || null,
          ]
        );
        documentNumber = creditNoteNumber;
        
        // Update invoice refundedAmount
        await connection.query(
          `UPDATE invoices SET 
            refundedAmount = COALESCE(refundedAmount, 0) + ?,
            status = CASE 
              WHEN COALESCE(paidAmount, 0) - COALESCE(refundedAmount, 0) - ? <= 0 THEN 'CANCELLED'
              WHEN COALESCE(paidAmount, 0) - COALESCE(refundedAmount, 0) - ? < grandTotal THEN 'PARTIAL_PAID'
              ELSE status
            END,
            updatedAt = NOW()
           WHERE id = ?`,
          [amount, amount, amount, invoiceId]
        );
      }
    }
    
    await connection.commit();
    
    return NextResponse.json({
      success: true,
      transaction: {
        id: Number(transactionId),
        transactionNumber,
        transactionType,
        amount,
        status: initialStatus,
        documentNumber,
      },
      message: initialStatus === 'CONFIRMED' 
        ? `บันทึก${transactionType === 'PAYMENT' ? 'การรับเงิน' : 'การคืนเงิน'}เรียบร้อย เลขที่: ${documentNumber}`
        : `บันทึกรอยืนยัน กรุณาแนบสลิปเพื่อยืนยัน`,
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกธุรกรรม', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
