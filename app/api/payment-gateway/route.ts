/**
 * Payment Gateway API - Create Payment
 * สร้าง payment request และ return QR code / redirect URL
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createPayment } from '@/lib/payment-gateway';
import type { PaymentMethod } from '@/lib/payment-gateway/types';

export async function POST(request: NextRequest) {
  const conn = await pool.getConnection();

  try {
    const body = await request.json();
    const {
      quotationId,
      invoiceId,
      amount,
      method, // PROMPTPAY, CREDIT_CARD, MOBILE_BANKING
      customerName,
      customerEmail,
      customerPhone,
      bankCode, // for mobile/internet banking
    } = body;

    // Validate
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    if (!method) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Get base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // สร้าง pending transaction ในระบบก่อน
    const transactionId = crypto.randomUUID();
    
    await conn.query(`
      INSERT INTO customer_transactions (
        id, quotationId, invoiceId, type, method, amount, 
        status, paymentGatewayMethod, createdAt
      ) VALUES (?, ?, ?, 'PAYMENT', 'GATEWAY', ?, 'PENDING', ?, NOW())
    `, [
      transactionId,
      quotationId || null,
      invoiceId || null,
      amount,
      method,
    ]);

    // เรียก Payment Gateway
    const paymentResponse = await createPayment({
      amount,
      currency: 'THB',
      method: method as PaymentMethod,
      description: invoiceId 
        ? `ชำระค่าใบแจ้งหนี้ ${invoiceId}` 
        : `ชำระค่าบริการ`,
      returnUrl: `${baseUrl}/api/payment-gateway/callback`,
      webhookUrl: `${baseUrl}/api/payment-gateway/webhook`,
      metadata: {
        quotationId,
        invoiceId,
        transactionId,
      },
      customer: {
        name: customerName || 'Customer',
        email: customerEmail || '',
        phone: customerPhone,
      },
    });

    if (!paymentResponse.success) {
      // Rollback transaction
      await conn.query(
        'DELETE FROM customer_transactions WHERE id = ?',
        [transactionId]
      );

      return NextResponse.json(
        { error: paymentResponse.error?.message || 'Failed to create payment' },
        { status: 500 }
      );
    }

    // อัพเดท transaction ด้วย payment gateway ID
    await conn.query(`
      UPDATE customer_transactions 
      SET paymentGatewayId = ?, paymentGatewayRef = ?
      WHERE id = ?
    `, [paymentResponse.paymentId, paymentResponse.reference, transactionId]);

    return NextResponse.json({
      success: true,
      transactionId,
      paymentId: paymentResponse.paymentId,
      status: paymentResponse.status,
      method: paymentResponse.method,
      amount: paymentResponse.amount,
      // PromptPay
      qrCodeUrl: paymentResponse.qrCodeUrl,
      qrCodeData: paymentResponse.qrCodeData,
      // Credit Card / Banking
      redirectUrl: paymentResponse.authorizeUrl || paymentResponse.bankRedirectUrl,
      expiresAt: paymentResponse.expiresAt,
      reference: paymentResponse.reference,
    });

  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

/**
 * GET - ตรวจสอบสถานะ payment
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transactionId');
  const paymentId = searchParams.get('paymentId');

  if (!transactionId && !paymentId) {
    return NextResponse.json(
      { error: 'Transaction ID or Payment ID is required' },
      { status: 400 }
    );
  }

  const conn = await pool.getConnection();

  try {
    let query = 'SELECT * FROM customer_transactions WHERE ';
    let params: string[] = [];

    if (transactionId) {
      query += 'id = ?';
      params.push(transactionId);
    } else {
      query += 'paymentGatewayId = ?';
      params.push(paymentId!);
    }

    const rows = await conn.query(query, params) as any[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const transaction = rows[0];

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      paymentId: transaction.paymentGatewayId,
      status: transaction.status,
      amount: transaction.amount,
      method: transaction.paymentGatewayMethod,
      paidAt: transaction.confirmedAt,
    });

  } catch (error: any) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
