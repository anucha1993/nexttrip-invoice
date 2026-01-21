// app/api/customer-transactions/[id]/route.ts
// API สำหรับจัดการ Transaction รายตัว

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateDocumentNumber } from '@/lib/helpers/document-number';

// GET /api/customer-transactions/[id] - Get single transaction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    const transactionId = parseInt(id);
    
    if (isNaN(transactionId)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    
    const transactions = await connection.query(
      `SELECT 
        ct.*,
        i.invoiceNumber,
        i.grandTotal as invoiceTotal,
        q.quotationNumber,
        q.tourName,
        c.name as customerName,
        r.receiptNumber,
        r.id as receiptId,
        cn.creditNoteNumber,
        cn.id as creditNoteId
      FROM customer_transactions ct
      LEFT JOIN invoices i ON ct.invoiceId = i.id
      LEFT JOIN quotations q ON ct.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      LEFT JOIN receipts r ON r.transactionId = ct.id AND r.status = 'ISSUED'
      LEFT JOIN credit_notes cn ON cn.transactionId = ct.id AND cn.status = 'ISSUED'
      WHERE ct.id = ?`,
      [transactionId]
    );

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบธุรกรรม' },
        { status: 404 }
      );
    }

    const transaction = transactions[0];

    return NextResponse.json({
      ...transaction,
      id: Number(transaction.id),
      invoiceId: Number(transaction.invoiceId),
      quotationId: Number(transaction.quotationId),
      amount: parseFloat(transaction.amount) || 0,
      invoiceTotal: parseFloat(transaction.invoiceTotal) || 0,
    });

  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// PATCH /api/customer-transactions/[id] - Confirm transaction (and issue document)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    const transactionId = parseInt(id);
    
    if (isNaN(transactionId)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, slipUrl, confirmedById, confirmedByName } = body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get transaction
    const transactions = await connection.query(
      `SELECT ct.*, i.grandTotal, i.paidAmount, i.refundedAmount
       FROM customer_transactions ct
       LEFT JOIN invoices i ON ct.invoiceId = i.id
       WHERE ct.id = ?`,
      [transactionId]
    );

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบธุรกรรม' },
        { status: 404 }
      );
    }

    const transaction = transactions[0];

    if (action === 'confirm') {
      // Confirm transaction
      if (transaction.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'ธุรกรรมนี้ไม่อยู่ในสถานะรอยืนยัน' },
          { status: 400 }
        );
      }

      // Update slip if provided
      if (slipUrl) {
        await connection.query(
          `UPDATE customer_transactions SET slipUrl = ?, slipUploadedAt = NOW() WHERE id = ?`,
          [slipUrl, transactionId]
        );
      }

      // Update status to confirmed
      await connection.query(
        `UPDATE customer_transactions SET 
          status = 'CONFIRMED',
          confirmedAt = NOW(),
          confirmedById = ?,
          confirmedByName = ?
         WHERE id = ?`,
        [confirmedById || null, confirmedByName || null, transactionId]
      );

      let documentNumber = null;
      const invoiceId = transaction.invoiceId;
      const quotationId = transaction.quotationId;
      const amount = parseFloat(transaction.amount);

      if (transaction.transactionType === 'PAYMENT') {
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
            transaction.paymentMethod,
            transaction.paymentDate,
            confirmedById || null,
            confirmedByName || null,
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
            transaction.refundReason,
            transaction.paymentDate,
            transaction.paymentMethod,
            confirmedById || null,
            confirmedByName || null,
          ]
        );
        documentNumber = creditNoteNumber;

        // Update invoice refundedAmount
        await connection.query(
          `UPDATE invoices SET 
            refundedAmount = COALESCE(refundedAmount, 0) + ?,
            updatedAt = NOW()
           WHERE id = ?`,
          [amount, invoiceId]
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: `ยืนยัน${transaction.transactionType === 'PAYMENT' ? 'การรับเงิน' : 'การคืนเงิน'}เรียบร้อย`,
        documentNumber,
      });

    } else if (action === 'cancel') {
      // Cancel transaction
      if (transaction.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'ธุรกรรมนี้ถูกยกเลิกแล้ว' },
          { status: 400 }
        );
      }

      await connection.query(
        `UPDATE customer_transactions SET status = 'CANCELLED', updatedAt = NOW() WHERE id = ?`,
        [transactionId]
      );

      // If was confirmed, need to reverse the invoice update
      if (transaction.status === 'CONFIRMED') {
        const amount = parseFloat(transaction.amount);
        const invoiceId = transaction.invoiceId;

        if (transaction.transactionType === 'PAYMENT') {
          // Reverse paidAmount
          await connection.query(
            `UPDATE invoices SET 
              paidAmount = GREATEST(COALESCE(paidAmount, 0) - ?, 0),
              status = CASE 
                WHEN GREATEST(COALESCE(paidAmount, 0) - ?, 0) <= 0 THEN 'ISSUED'
                WHEN GREATEST(COALESCE(paidAmount, 0) - ?, 0) < grandTotal THEN 'PARTIAL_PAID'
                ELSE status
              END,
              updatedAt = NOW()
             WHERE id = ?`,
            [amount, amount, amount, invoiceId]
          );

          // Cancel receipt
          await connection.query(
            `UPDATE receipts SET status = 'CANCELLED', cancelledAt = NOW() WHERE transactionId = ?`,
            [transactionId]
          );
        } else {
          // Reverse refundedAmount
          await connection.query(
            `UPDATE invoices SET 
              refundedAmount = COALESCE(refundedAmount, 0) - ?,
              updatedAt = NOW()
             WHERE id = ?`,
            [amount, invoiceId]
          );

          // Cancel credit note
          await connection.query(
            `UPDATE credit_notes SET status = 'CANCELLED', cancelledAt = NOW() WHERE transactionId = ?`,
            [transactionId]
          );
        }
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: 'ยกเลิกธุรกรรมเรียบร้อย',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// PUT /api/customer-transactions/[id] - Update transaction (edit)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    const transactionId = parseInt(id);
    
    if (isNaN(transactionId)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      amount: rawAmount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      notes,
      refundReason,
      bankAccountId,
      chequeNumber,
      chequeDate,
      chequeBankId,
      slipUrl,
      updatedById,
      updatedByName,
      confirmOnSlip,  // Flag to confirm when slip is attached
    } = body;
    
    // Round amount to 2 decimal places to avoid floating point precision issues
    const amount = Math.round(parseFloat(rawAmount) * 100) / 100;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get current transaction
    const transactions = await connection.query(
      `SELECT ct.*, i.grandTotal, i.paidAmount, i.refundedAmount
       FROM customer_transactions ct
       LEFT JOIN invoices i ON ct.invoiceId = i.id
       WHERE ct.id = ?`,
      [transactionId]
    );

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบธุรกรรม' },
        { status: 404 }
      );
    }

    const oldTransaction = transactions[0];
    const oldAmount = parseFloat(oldTransaction.amount);
    const newAmount = amount;  // Already a number from rounding above
    const amountDiff = newAmount - oldAmount;

    // Check if we should auto-confirm (PENDING + slip attached)
    const shouldAutoConfirm = oldTransaction.status === 'PENDING' && slipUrl && confirmOnSlip;

    // Update transaction
    await connection.query(
      `UPDATE customer_transactions SET 
        amount = ?,
        paymentMethod = ?,
        paymentDate = ?,
        referenceNumber = ?,
        notes = ?,
        refundReason = ?,
        bankAccountId = ?,
        chequeNumber = ?,
        chequeDate = ?,
        chequeBankId = ?,
        slipUrl = COALESCE(?, slipUrl),
        slipUploadedAt = CASE WHEN ? IS NOT NULL THEN NOW() ELSE slipUploadedAt END,
        status = CASE WHEN ? = 1 THEN 'CONFIRMED' ELSE status END,
        confirmedAt = CASE WHEN ? = 1 THEN NOW() ELSE confirmedAt END,
        confirmedById = CASE WHEN ? = 1 THEN ? ELSE confirmedById END,
        confirmedByName = CASE WHEN ? = 1 THEN ? ELSE confirmedByName END,
        updatedById = ?,
        updatedByName = ?,
        updatedAt = NOW()
       WHERE id = ?`,
      [
        newAmount,
        paymentMethod,
        paymentDate,
        referenceNumber || null,
        notes || null,
        refundReason || null,
        bankAccountId || null,
        chequeNumber || null,
        chequeDate || null,
        chequeBankId || null,
        slipUrl || null,
        slipUrl || null,
        shouldAutoConfirm ? 1 : 0,
        shouldAutoConfirm ? 1 : 0,
        shouldAutoConfirm ? 1 : 0, updatedById || null,
        shouldAutoConfirm ? 1 : 0, updatedByName || null,
        updatedById || null,
        updatedByName || null,
        transactionId,
      ]
    );
    
    // If auto-confirmed, issue document and update invoice
    if (shouldAutoConfirm) {
      const invoiceId = oldTransaction.invoiceId;
      const quotationId = oldTransaction.quotationId;
      
      if (oldTransaction.transactionType === 'PAYMENT') {
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
            newAmount,
            paymentMethod,
            paymentDate,
            updatedById || null,
            updatedByName || null,
          ]
        );
        
        // Update invoice paidAmount
        await connection.query(
          `UPDATE invoices SET 
            paidAmount = COALESCE(paidAmount, 0) + ?,
            status = CASE 
              WHEN COALESCE(paidAmount, 0) + ? >= grandTotal THEN 'PAID'
              WHEN COALESCE(paidAmount, 0) + ? > 0 THEN 'PARTIAL_PAID'
              ELSE status
            END,
            updatedAt = NOW()
           WHERE id = ?`,
          [newAmount, newAmount, newAmount, invoiceId]
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
            newAmount,
            refundReason,
            paymentDate,
            paymentMethod,
            updatedById || null,
            updatedByName || null,
          ]
        );
        
        // Update invoice refundedAmount
        await connection.query(
          `UPDATE invoices SET 
            refundedAmount = COALESCE(refundedAmount, 0) + ?,
            updatedAt = NOW()
           WHERE id = ?`,
          [newAmount, invoiceId]
        );
      }
    }

    // If CONFIRMED, need to update invoice amounts if amount changed
    if (oldTransaction.status === 'CONFIRMED' && amountDiff !== 0) {
      const invoiceId = oldTransaction.invoiceId;

      if (oldTransaction.transactionType === 'PAYMENT') {
        // Update paidAmount
        await connection.query(
          `UPDATE invoices SET 
            paidAmount = COALESCE(paidAmount, 0) + ?,
            status = CASE 
              WHEN COALESCE(paidAmount, 0) + ? >= grandTotal THEN 'PAID'
              WHEN COALESCE(paidAmount, 0) + ? > 0 THEN 'PARTIAL_PAID'
              ELSE 'ISSUED'
            END,
            updatedAt = NOW()
           WHERE id = ?`,
          [amountDiff, amountDiff, amountDiff, invoiceId]
        );

        // Update receipt
        await connection.query(
          `UPDATE receipts SET 
            amount = ?,
            paymentMethod = ?,
            paymentDate = ?,
            updatedAt = NOW()
           WHERE transactionId = ? AND status = 'ISSUED'`,
          [newAmount, paymentMethod, paymentDate, transactionId]
        );
      } else {
        // Update refundedAmount
        await connection.query(
          `UPDATE invoices SET 
            refundedAmount = COALESCE(refundedAmount, 0) + ?,
            updatedAt = NOW()
           WHERE id = ?`,
          [amountDiff, invoiceId]
        );

        // Update credit note
        await connection.query(
          `UPDATE credit_notes SET 
            amount = ?,
            reason = ?,
            refundMethod = ?,
            updatedAt = NOW()
           WHERE transactionId = ? AND status = 'ISSUED'`,
          [newAmount, refundReason, paymentMethod, transactionId]
        );
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'แก้ไขธุรกรรมเรียบร้อย',
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Error editing transaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
