/**
 * Payment Gateway Webhook Handler
 * รับ callback จาก payment gateway เมื่อมีการเปลี่ยนแปลงสถานะ
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { parseWebhookPayload, verifyWebhookSignature } from '@/lib/payment-gateway';

export async function POST(request: NextRequest) {
  const conn = await pool.getConnection();

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';

    // Verify webhook signature (skip in development)
    if (process.env.NODE_ENV === 'production') {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse payload
    const payload = parseWebhookPayload(rawBody);
    console.log('[Webhook] Received event:', payload.event, payload.data);

    const { id: paymentId, status, metadata, paidAt } = payload.data;
    const transactionId = metadata?.transactionId;

    if (!transactionId) {
      console.warn('[Webhook] No transactionId in metadata');
      return NextResponse.json({ received: true });
    }

    // อัพเดทสถานะ transaction
    switch (payload.event) {
      case 'charge.complete':
        await handlePaymentSuccess(conn, transactionId, paymentId, paidAt);
        break;

      case 'charge.failed':
        await handlePaymentFailed(conn, transactionId, paymentId, payload.data.failureMessage);
        break;

      case 'charge.expired':
        await handlePaymentExpired(conn, transactionId, paymentId);
        break;
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(
  conn: any,
  transactionId: string,
  paymentId: string,
  paidAt?: string
) {
  console.log('[Webhook] Payment successful:', transactionId);

  // อัพเดท transaction เป็น CONFIRMED
  await conn.query(`
    UPDATE customer_transactions 
    SET 
      status = 'CONFIRMED',
      confirmedAt = ?,
      paymentGatewayStatus = 'SUCCESSFUL',
      updatedAt = NOW()
    WHERE id = ? AND status = 'PENDING'
  `, [paidAt ? new Date(paidAt) : new Date(), transactionId]);

  // ดึงข้อมูล transaction
  const rows = await conn.query(
    'SELECT * FROM customer_transactions WHERE id = ?',
    [transactionId]
  ) as any[];

  if (rows.length === 0) return;

  const transaction = rows[0];

  // สร้างใบเสร็จอัตโนมัติ
  if (transaction.invoiceId) {
    const receiptId = crypto.randomUUID();
    const receiptNumber = `RC${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;

    await conn.query(`
      INSERT INTO receipts (
        id, receiptNumber, transactionId, invoiceId, quotationId,
        amount, status, issuedAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, 'ISSUED', NOW(), NOW())
    `, [
      receiptId,
      receiptNumber,
      transactionId,
      transaction.invoiceId,
      transaction.quotationId,
      transaction.amount,
    ]);

    console.log('[Webhook] Receipt created:', receiptNumber);
  }

  // อัพเดทสถานะ invoice ถ้าชำระครบ
  if (transaction.invoiceId) {
    await updateInvoiceStatus(conn, transaction.invoiceId);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  conn: any,
  transactionId: string,
  paymentId: string,
  failureMessage?: string
) {
  console.log('[Webhook] Payment failed:', transactionId, failureMessage);

  await conn.query(`
    UPDATE customer_transactions 
    SET 
      status = 'CANCELLED',
      paymentGatewayStatus = 'FAILED',
      note = ?,
      updatedAt = NOW()
    WHERE id = ? AND status = 'PENDING'
  `, [failureMessage || 'Payment failed', transactionId]);
}

/**
 * Handle expired payment
 */
async function handlePaymentExpired(
  conn: any,
  transactionId: string,
  paymentId: string
) {
  console.log('[Webhook] Payment expired:', transactionId);

  await conn.query(`
    UPDATE customer_transactions 
    SET 
      status = 'CANCELLED',
      paymentGatewayStatus = 'EXPIRED',
      note = 'Payment expired',
      updatedAt = NOW()
    WHERE id = ? AND status = 'PENDING'
  `, [transactionId]);
}

/**
 * Update invoice status based on payments
 */
async function updateInvoiceStatus(conn: any, invoiceId: string) {
  // คำนวณยอดชำระทั้งหมด
  const paymentRows = await conn.query(`
    SELECT COALESCE(SUM(amount), 0) as totalPaid
    FROM customer_transactions
    WHERE invoiceId = ? AND type = 'PAYMENT' AND status = 'CONFIRMED'
  `, [invoiceId]) as any[];

  const refundRows = await conn.query(`
    SELECT COALESCE(SUM(amount), 0) as totalRefunded
    FROM customer_transactions
    WHERE invoiceId = ? AND type = 'REFUND' AND status = 'CONFIRMED'
  `, [invoiceId]) as any[];

  // ดึงยอด invoice
  const invoiceRows = await conn.query(
    'SELECT grandTotal FROM invoices WHERE id = ?',
    [invoiceId]
  ) as any[];

  if (invoiceRows.length === 0) return;

  const grandTotal = parseFloat(invoiceRows[0].grandTotal) || 0;
  const totalPaid = parseFloat(paymentRows[0].totalPaid) || 0;
  const totalRefunded = parseFloat(refundRows[0].totalRefunded) || 0;
  const balance = grandTotal - totalPaid + totalRefunded;

  // อัพเดทสถานะ
  let newStatus = 'PENDING';
  if (balance <= 0) {
    newStatus = 'PAID';
  } else if (totalPaid > 0) {
    newStatus = 'PARTIAL';
  }

  await conn.query(
    'UPDATE invoices SET status = ?, updatedAt = NOW() WHERE id = ?',
    [newStatus, invoiceId]
  );

  console.log('[Webhook] Invoice status updated:', invoiceId, newStatus);
}
