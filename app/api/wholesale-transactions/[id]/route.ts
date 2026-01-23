// app/api/wholesale-transactions/[id]/route.ts
// API สำหรับจัดการ Wholesale Transaction รายตัว

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/wholesale-transactions/[id] - Get single transaction
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
        wt.*,
        q.quotationNumber,
        q.tourName,
        c.name as customerName,
        ba.displayName as bankAccountName,
        b.nameTH as chequeBankName
      FROM wholesale_transactions wt
      LEFT JOIN quotations q ON wt.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      LEFT JOIN bank_accounts ba ON wt.bankAccountId = ba.id
      LEFT JOIN banks b ON wt.chequeBankId = b.id
      WHERE wt.id = ?`,
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
      quotationId: Number(transaction.quotationId),
      wholesaleId: transaction.wholesaleId ? Number(transaction.wholesaleId) : null,
      bankAccountId: transaction.bankAccountId ? Number(transaction.bankAccountId) : null,
      chequeBankId: transaction.chequeBankId ? Number(transaction.chequeBankId) : null,
      amount: parseFloat(transaction.amount) || 0,
    });

  } catch (error: any) {
    console.error('Error fetching wholesale transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// PUT /api/wholesale-transactions/[id] - Update transaction
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
      wholesaleId,
      wholesaleName,
      amount: rawAmount,
      paymentMethod,
      transactionDate,
      paymentDate,
      slipUrl,
      referenceNumber,
      bankAccountId,
      toBankName,
      toBankAccountNo,
      toBankAccountName,
      chequeNumber,
      chequeDate,
      chequeBankId,
      refundReason,
      notes,
      updatedById,
      updatedByName,
      confirmOnSlip,  // ถ้า true และมี slip จะ confirm
    } = body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get existing transaction
    const transactions = await connection.query(
      'SELECT * FROM wholesale_transactions WHERE id = ?',
      [transactionId]
    );

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบธุรกรรม' },
        { status: 404 }
      );
    }

    const existingTx = transactions[0];

    // Can't update if CANCELLED
    if (existingTx.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'ไม่สามารถแก้ไขธุรกรรมที่ยกเลิกแล้ว' },
        { status: 400 }
      );
    }

    const amount = rawAmount ? Math.round(parseFloat(rawAmount) * 100) / 100 : existingTx.amount;

    // Determine if should confirm based on confirmOnSlip flag
    const shouldConfirm = confirmOnSlip && slipUrl && existingTx.status === 'PENDING';
    const now = new Date();

    // Build update query
    await connection.query(
      `UPDATE wholesale_transactions SET
        wholesaleId = ?,
        wholesaleName = ?,
        amount = ?,
        paymentMethod = ?,
        transactionDate = ?,
        paymentDate = ?,
        slipUrl = ?,
        slipUploadedAt = ?,
        referenceNumber = ?,
        bankAccountId = ?,
        toBankName = ?,
        toBankAccountNo = ?,
        toBankAccountName = ?,
        chequeNumber = ?,
        chequeDate = ?,
        chequeBankId = ?,
        refundReason = ?,
        notes = ?,
        status = ?,
        confirmedAt = ?,
        confirmedById = ?,
        confirmedByName = ?,
        updatedById = ?,
        updatedByName = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [
        wholesaleId !== undefined ? wholesaleId : existingTx.wholesaleId,
        wholesaleName !== undefined ? wholesaleName : existingTx.wholesaleName,
        amount,
        paymentMethod || existingTx.paymentMethod,
        transactionDate || existingTx.transactionDate,
        paymentDate || existingTx.paymentDate,
        slipUrl !== undefined ? slipUrl : existingTx.slipUrl,
        slipUrl && !existingTx.slipUrl ? now : existingTx.slipUploadedAt,
        referenceNumber !== undefined ? referenceNumber : existingTx.referenceNumber,
        bankAccountId !== undefined ? bankAccountId : existingTx.bankAccountId,
        toBankName !== undefined ? toBankName : existingTx.toBankName,
        toBankAccountNo !== undefined ? toBankAccountNo : existingTx.toBankAccountNo,
        toBankAccountName !== undefined ? toBankAccountName : existingTx.toBankAccountName,
        chequeNumber !== undefined ? chequeNumber : existingTx.chequeNumber,
        chequeDate !== undefined ? chequeDate : existingTx.chequeDate,
        chequeBankId !== undefined ? chequeBankId : existingTx.chequeBankId,
        refundReason !== undefined ? refundReason : existingTx.refundReason,
        notes !== undefined ? notes : existingTx.notes,
        shouldConfirm ? 'CONFIRMED' : existingTx.status,
        shouldConfirm ? now : existingTx.confirmedAt,
        shouldConfirm ? updatedById : existingTx.confirmedById,
        shouldConfirm ? updatedByName : existingTx.confirmedByName,
        updatedById || null,
        updatedByName || null,
        transactionId,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'แก้ไขธุรกรรมเรียบร้อย',
      confirmed: shouldConfirm,
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Error updating wholesale transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// PATCH /api/wholesale-transactions/[id] - Confirm or Cancel transaction
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
    const { action, cancelReason, confirmedById, confirmedByName, cancelledById, cancelledByName } = body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get transaction
    const transactions = await connection.query(
      'SELECT * FROM wholesale_transactions WHERE id = ?',
      [transactionId]
    );

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบธุรกรรม' },
        { status: 404 }
      );
    }

    const transaction = transactions[0];
    const now = new Date();

    if (action === 'confirm') {
      if (transaction.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'สามารถยืนยันได้เฉพาะธุรกรรมที่รอยืนยันเท่านั้น' },
          { status: 400 }
        );
      }

      await connection.query(
        `UPDATE wholesale_transactions SET
          status = 'CONFIRMED',
          confirmedAt = ?,
          confirmedById = ?,
          confirmedByName = ?
        WHERE id = ?`,
        [now, confirmedById, confirmedByName, transactionId]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: 'ยืนยันธุรกรรมเรียบร้อย',
      });

    } else if (action === 'cancel') {
      if (transaction.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'ธุรกรรมนี้ถูกยกเลิกแล้ว' },
          { status: 400 }
        );
      }

      await connection.query(
        `UPDATE wholesale_transactions SET
          status = 'CANCELLED',
          cancelledAt = ?,
          cancelledById = ?,
          cancelledByName = ?,
          cancelReason = ?
        WHERE id = ?`,
        [now, cancelledById, cancelledByName, cancelReason, transactionId]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: 'ยกเลิกธุรกรรมเรียบร้อย',
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "confirm" or "cancel"' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Error updating wholesale transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// DELETE /api/wholesale-transactions/[id] - Hard delete (only PENDING)
export async function DELETE(
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

    // Get transaction
    const transactions = await connection.query(
      'SELECT * FROM wholesale_transactions WHERE id = ?',
      [transactionId]
    );

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบธุรกรรม' },
        { status: 404 }
      );
    }

    const transaction = transactions[0];

    if (transaction.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'สามารถลบได้เฉพาะธุรกรรมที่รอยืนยันเท่านั้น' },
        { status: 400 }
      );
    }

    await connection.query('DELETE FROM wholesale_transactions WHERE id = ?', [transactionId]);

    return NextResponse.json({
      success: true,
      message: 'ลบธุรกรรมเรียบร้อย',
    });

  } catch (error: any) {
    console.error('Error deleting wholesale transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
