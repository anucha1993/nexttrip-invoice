/**
 * Payment Gateway Callback Handler
 * รับ redirect กลับจากหน้า payment ของ bank / credit card
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPayment } from '@/lib/payment-gateway';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const mock = searchParams.get('mock');

  if (!paymentId) {
    return NextResponse.redirect(new URL('/payment/error?reason=no_payment_id', request.url));
  }

  const conn = await pool.getConnection();

  try {
    // หา transaction จาก paymentId
    const rows = await conn.query(
      'SELECT * FROM customer_transactions WHERE paymentGatewayId = ?',
      [paymentId]
    ) as any[];

    if (rows.length === 0) {
      return NextResponse.redirect(new URL('/payment/error?reason=transaction_not_found', request.url));
    }

    const transaction = rows[0];

    // Mock mode: simulate success for testing
    if (mock === 'true') {
      // อัพเดทเป็น confirmed
      await conn.query(`
        UPDATE customer_transactions 
        SET 
          status = 'CONFIRMED',
          confirmedAt = NOW(),
          paymentGatewayStatus = 'SUCCESSFUL',
          updatedAt = NOW()
        WHERE id = ? AND status = 'PENDING'
      `, [transaction.id]);

      // Redirect to success page
      const successUrl = transaction.quotationId
        ? `/quotations/${transaction.quotationId}/dashboard?tab=payment&success=true`
        : `/payment/success?id=${transaction.id}`;

      return NextResponse.redirect(new URL(successUrl, request.url));
    }

    // Production mode: verify with payment gateway
    const verifyResult = await verifyPayment(paymentId);

    if (verifyResult.status === 'SUCCESSFUL') {
      // อัพเดทเป็น confirmed
      await conn.query(`
        UPDATE customer_transactions 
        SET 
          status = 'CONFIRMED',
          confirmedAt = ?,
          paymentGatewayStatus = 'SUCCESSFUL',
          updatedAt = NOW()
        WHERE id = ? AND status = 'PENDING'
      `, [verifyResult.paidAt ? new Date(verifyResult.paidAt) : new Date(), transaction.id]);

      const successUrl = transaction.quotationId
        ? `/quotations/${transaction.quotationId}/dashboard?tab=payment&success=true`
        : `/payment/success?id=${transaction.id}`;

      return NextResponse.redirect(new URL(successUrl, request.url));

    } else if (verifyResult.status === 'PENDING') {
      // ยังไม่เสร็จ - redirect ไปหน้ารอ
      const pendingUrl = transaction.quotationId
        ? `/quotations/${transaction.quotationId}/dashboard?tab=payment&pending=true`
        : `/payment/pending?id=${transaction.id}`;

      return NextResponse.redirect(new URL(pendingUrl, request.url));

    } else {
      // Failed
      await conn.query(`
        UPDATE customer_transactions 
        SET 
          status = 'CANCELLED',
          paymentGatewayStatus = 'FAILED',
          note = ?,
          updatedAt = NOW()
        WHERE id = ? AND status = 'PENDING'
      `, [verifyResult.error || 'Payment failed', transaction.id]);

      return NextResponse.redirect(
        new URL(`/payment/error?reason=payment_failed&id=${transaction.id}`, request.url)
      );
    }

  } catch (error: any) {
    console.error('Error processing callback:', error);
    return NextResponse.redirect(new URL('/payment/error?reason=server_error', request.url));
  } finally {
    conn.release();
  }
}
