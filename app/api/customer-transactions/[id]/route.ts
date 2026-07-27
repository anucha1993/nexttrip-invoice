// app/api/customer-transactions/[id]/route.ts
// API สำหรับจัดการ Transaction รายตัว

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateDocumentNumber } from '@/lib/helpers/document-number';
import { LineOaService } from '@/lib/services/line-oa';

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

// DELETE /api/customer-transactions/[id] - Hard delete (ลบถาวรออกจาก DB จริงๆ)
// ต่างจาก PATCH action=cancel (ยกเลิก/soft delete) ที่แค่เปลี่ยนสถานะเป็น CANCELLED แล้วยังอยู่ในตาราง
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
    await connection.beginTransaction();

    const transactions = await connection.query(
      `SELECT ct.*, i.grandTotal, i.paidAmount, i.refundedAmount, i.invoiceNumber,
              q.quotationNumber, c.name as customerName
       FROM customer_transactions ct
       LEFT JOIN invoices i ON ct.invoiceId = i.id
       LEFT JOIN quotations q ON i.quotationId = q.id
       LEFT JOIN customers c ON q.customerId = c.id
       WHERE ct.id = ?`,
      [transactionId]
    );

    if (!transactions || transactions.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'ไม่พบธุรกรรม' },
        { status: 404 }
      );
    }

    const transaction = transactions[0];

    // ถ้าธุรกรรมนี้เคยยืนยันแล้ว (มีผลต่อยอดใน invoice) ต้อง reverse ยอดก่อนลบถาวร
    // มิฉะนั้นยอดชำระ/คงเหลือของ invoice จะผิดหลังลบ
    if (transaction.status === 'CONFIRMED') {
      const amount = parseFloat(transaction.amount);
      const invoiceId = transaction.invoiceId;

      if (transaction.transactionType === 'PAYMENT') {
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
      } else {
        await connection.query(
          `UPDATE invoices SET 
            refundedAmount = GREATEST(COALESCE(refundedAmount, 0) - ?, 0),
            updatedAt = NOW()
           WHERE id = ?`,
          [amount, invoiceId]
        );
      }
    }

    // ลบเอกสารที่ผูกกับ transaction นี้ก่อน (receipts/credit_notes มี FK ON DELETE RESTRICT)
    await connection.query(`DELETE FROM receipts WHERE transactionId = ?`, [transactionId]);
    await connection.query(`DELETE FROM credit_notes WHERE transactionId = ?`, [transactionId]);

    // ลบ transaction จริง
    await connection.query(`DELETE FROM customer_transactions WHERE id = ?`, [transactionId]);

    await connection.commit();

    // แจ้งเตือน LINE OA แบบ best-effort — ส่งทุกครั้งที่ลบรายการถาวร (ข้อความเท่านั้น ไม่แนบรูป)
    try {
      const lineSvc = await LineOaService.fromSettings();
      const lineCfg = await LineOaService.loadConfig();
      if (lineCfg.enabled && lineSvc.isConfigured) {
        const text = LineOaService.buildSlipText({
          transactionType: transaction.transactionType,
          transactionNumber: transaction.transactionNumber,
          amount: parseFloat(transaction.amount),
          referenceNumber: transaction.referenceNumber || null,
          customerName: transaction.customerName || null,
          quotationNumber: transaction.quotationNumber || null,
          invoiceNumber: transaction.invoiceNumber || null,
          notes: transaction.notes || null,
          action: 'DELETE',
        });
        await lineSvc.pushSlipNotification({ imageUrl: '', text });
      }
    } catch (lineErr) {
      console.error('LINE OA delete notification failed:', lineErr);
    }

    return NextResponse.json({
      success: true,
      message: 'ลบธุรกรรมเรียบร้อยแล้ว (ถาวร)',
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Error hard-deleting transaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบ', details: error.message },
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
      `SELECT ct.*, i.grandTotal, i.paidAmount, i.refundedAmount, i.invoiceNumber,
              q.quotationNumber, c.name as customerName
       FROM customer_transactions ct
       LEFT JOIN invoices i ON ct.invoiceId = i.id
       LEFT JOIN quotations q ON i.quotationId = q.id
       LEFT JOIN customers c ON q.customerId = c.id
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

      // แจ้งเตือน LINE OA แบบ best-effort — ส่งทุกครั้งที่ยกเลิกรายการ
      try {
        const lineSvc = await LineOaService.fromSettings();
        const lineCfg = await LineOaService.loadConfig();
        if (lineCfg.enabled && lineSvc.isConfigured) {
          const text = LineOaService.buildSlipText({
            transactionType: transaction.transactionType,
            transactionNumber: transaction.transactionNumber,
            amount: parseFloat(transaction.amount),
            referenceNumber: transaction.referenceNumber || null,
            customerName: transaction.customerName || null,
            quotationNumber: transaction.quotationNumber || null,
            invoiceNumber: transaction.invoiceNumber || null,
            notes: transaction.notes || null,
            action: 'CANCEL',
          });
          // ยกเลิกรายการ: ส่งเฉพาะข้อความ ไม่แนบรูปสลิป (รูปส่งเฉพาะตอนเพิ่มรายการใหม่เท่านั้น)
          await lineSvc.pushSlipNotification({ imageUrl: '', text });
        }
      } catch (lineErr) {
        console.error('LINE OA cancel notification failed:', lineErr);
      }

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
      slipRef,
      slipStatusCode,
      slipData,
      updatedById,
      updatedByName,
      confirmOnSlip,  // Flag to confirm when slip is attached
      // ข้อมูลผู้โอน (ปกติเติมอัตโนมัติจาก slipData.sender)
      senderName,
      senderBankName,
      senderAccountNumber,
    } = body;
    
    // Round amount to 2 decimal places to avoid floating point precision issues
    const amount = Math.round(parseFloat(rawAmount) * 100) / 100;

    // เลขที่อ้างอิง (Ref) - ตัดช่องว่างหัวท้าย
    const referenceNumberTrimmed = typeof referenceNumber === 'string' ? referenceNumber.trim() : referenceNumber;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get current transaction
    const transactions = await connection.query(
      `SELECT ct.*, i.grandTotal, i.paidAmount, i.refundedAmount, i.invoiceNumber,
              q.quotationNumber, c.name as customerName
       FROM customer_transactions ct
       LEFT JOIN invoices i ON ct.invoiceId = i.id
       LEFT JOIN quotations q ON i.quotationId = q.id
       LEFT JOIN customers c ON q.customerId = c.id
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

    // ความปลอดภัย: รายการที่เคยตรวจสอบสลิปผ่าน API มาแล้ว (มี slipRef/slipStatusCode เดิม) ต้อง "ล็อก"
    // เลขที่อ้างอิง/ผู้โอน ห้ามแก้ไขผ่านการ Edit อีก แม้ client จะส่งค่าอื่นมาก็ตาม (ยกเว้นกรณีตรวจสอบสลิปใหม่ในคำขอนี้)
    const wasAlreadyApiVerified = !!(oldTransaction.slipRef || oldTransaction.slipStatusCode);
    const sd: any = slipData || null;
    let finalReferenceNumber: string | null;
    let finalSenderName: string | null;
    let finalSenderBankName: string | null;
    let finalSenderAccountNumber: string | null;
    if (sd) {
      // มีการตรวจสอบสลิปใหม่มาพร้อมคำขอนี้ — ใช้ข้อมูลจากผลตรวจสอบเสมอ
      finalReferenceNumber = slipRef || referenceNumberTrimmed || null;
      finalSenderName = sd.sender?.account?.name || null;
      finalSenderBankName = sd.sender?.bank?.name || sd.sender?.bank?.id || null;
      finalSenderAccountNumber = sd.sender?.account?.bank?.account || sd.sender?.account?.proxy?.account || null;
    } else if (wasAlreadyApiVerified) {
      // เคยตรวจสอบผ่าน API มาก่อนแล้ว และคำขอนี้ไม่ได้แนบผลตรวจสอบใหม่ — คงค่าเดิมไว้ ห้ามแก้ไข
      finalReferenceNumber = oldTransaction.referenceNumber;
      finalSenderName = oldTransaction.senderName;
      finalSenderBankName = oldTransaction.senderBankName;
      finalSenderAccountNumber = oldTransaction.senderAccountNumber;
    } else {
      // ไม่เคยตรวจสอบผ่าน API — กรอกเองได้ตามปกติ
      finalReferenceNumber = referenceNumberTrimmed || null;
      finalSenderName = senderName || null;
      finalSenderBankName = senderBankName || null;
      finalSenderAccountNumber = senderAccountNumber || null;
    }

    // Ref (เลขที่อ้างอิง) จำเป็นสำหรับการรับเงินผ่านโอนเงิน และห้ามซ้ำกับรายการอื่นเด็ดขาด
    if (oldTransaction.transactionType === 'PAYMENT' && (paymentMethod || 'TRANSFER') === 'TRANSFER') {
      if (!finalReferenceNumber) {
        return NextResponse.json(
          { error: 'กรุณาระบุเลขที่อ้างอิง (Ref) สำหรับการโอนเงิน' },
          { status: 400 }
        );
      }
      const dupRef = await connection.query(
        `SELECT id, transactionNumber FROM customer_transactions WHERE referenceNumber = ? AND status != 'CANCELLED' AND id != ? LIMIT 1`,
        [finalReferenceNumber, transactionId]
      );
      if (dupRef?.[0]) {
        return NextResponse.json(
          { error: `เลขที่อ้างอิง (Ref) "${finalReferenceNumber}" ถูกใช้ไปแล้ว (รายการ ${dupRef[0].transactionNumber})` },
          { status: 409 }
        );
      }
    }

    // Check if we should auto-confirm (PENDING + slip attached)
    const shouldAutoConfirm = oldTransaction.status === 'PENDING' && slipUrl && confirmOnSlip;

    // Update transaction
    await connection.query(
      `UPDATE customer_transactions SET 
        amount = ?,
        paymentMethod = ?,
        paymentDate = ?,
        referenceNumber = ?,
        senderName = ?,
        senderBankName = ?,
        senderAccountNumber = ?,
        notes = ?,
        refundReason = ?,
        bankAccountId = ?,
        chequeNumber = ?,
        chequeDate = ?,
        chequeBankId = ?,
        slipUrl = COALESCE(?, slipUrl),
        slipUploadedAt = CASE WHEN ? IS NOT NULL THEN NOW() ELSE slipUploadedAt END,
        slipRef = COALESCE(?, slipRef),
        slipStatusCode = COALESCE(?, slipStatusCode),
        slipVerifiedAt = CASE WHEN ? IS NOT NULL THEN NOW() ELSE slipVerifiedAt END,
        slipData = COALESCE(?, slipData),
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
        finalReferenceNumber,
        finalSenderName,
        finalSenderBankName,
        finalSenderAccountNumber,
        notes || null,
        refundReason || null,
        bankAccountId || null,
        chequeNumber || null,
        chequeDate || null,
        chequeBankId || null,
        slipUrl || null,
        slipUrl || null,
        slipRef || null,
        slipStatusCode || null,
        slipRef || null,
        slipData ? JSON.stringify(slipData) : null,
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

    // แจ้งเตือน LINE OA แบบ best-effort — ส่งทุกครั้งที่มีการแก้ไขรายการ (แนบรูปสลิปถ้ามี ไม่ว่าจะเพิ่งอัปโหลดใหม่หรือมีอยู่เดิม)
    try {
      const lineSvc = await LineOaService.fromSettings();
      const lineCfg = await LineOaService.loadConfig();
      if (lineCfg.enabled && lineSvc.isConfigured) {
        const text = LineOaService.buildSlipText({
          transactionType: oldTransaction.transactionType,
          transactionNumber: oldTransaction.transactionNumber,
          amount: newAmount,
          referenceNumber: referenceNumberTrimmed || null,
          customerName: oldTransaction.customerName || null,
          quotationNumber: oldTransaction.quotationNumber || null,
          invoiceNumber: oldTransaction.invoiceNumber || null,
          notes: notes || null,
          action: 'EDIT',
        });
        // แก้ไขรายการ: ส่งเฉพาะข้อความ ไม่แนบรูปสลิป (รูปส่งเฉพาะตอนเพิ่มรายการใหม่เท่านั้น)
        await lineSvc.pushSlipNotification({ imageUrl: '', text });
      }
    } catch (lineErr) {
      console.error('LINE OA edit notification failed:', lineErr);
    }

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
