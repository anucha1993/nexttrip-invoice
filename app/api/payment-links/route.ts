/**
 * Payment Links API
 * สร้าง payment link สำหรับให้ลูกค้ากดชำระเงินเอง
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

/**
 * POST - สร้าง Payment Link ใหม่
 */
export async function POST(request: NextRequest) {
  const conn = await pool.getConnection();

  try {
    const body = await request.json();
    const {
      quotationId,
      invoiceId,
      amount,
      description,
      expiresInHours = 72, // default 3 วัน
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // สร้าง unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // บันทึก payment link
    const linkId = crypto.randomUUID();
    await conn.query(`
      INSERT INTO payment_links (
        id, token, quotationId, invoiceId, amount, description,
        status, expiresAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW())
    `, [
      linkId,
      token,
      quotationId || null,
      invoiceId || null,
      amount,
      description || '',
      expiresAt,
    ]);

    // ดึงข้อมูลเพิ่มเติม
    let quotation = null;
    let invoice = null;

    if (quotationId) {
      const rows = await conn.query(
        'SELECT * FROM quotations WHERE id = ?',
        [quotationId]
      ) as any[];
      quotation = rows[0] || null;
    }

    if (invoiceId) {
      const rows = await conn.query(
        'SELECT * FROM invoices WHERE id = ?',
        [invoiceId]
      ) as any[];
      invoice = rows[0] || null;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/payment/${token}`;

    return NextResponse.json({
      success: true,
      linkId,
      token,
      paymentUrl,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentUrl)}`,
      amount,
      expiresAt,
      quotation,
      invoice,
    });

  } catch (error: any) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

/**
 * GET - ดึงข้อมูล Payment Link
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const linkId = searchParams.get('linkId');

  if (!token && !linkId) {
    return NextResponse.json(
      { error: 'Token or Link ID is required' },
      { status: 400 }
    );
  }

  const conn = await pool.getConnection();

  try {
    let query = 'SELECT * FROM payment_links WHERE ';
    let params: string[] = [];

    if (token) {
      query += 'token = ?';
      params.push(token);
    } else {
      query += 'id = ?';
      params.push(linkId!);
    }

    const rows = await conn.query(query, params) as any[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    const link = rows[0];

    // Check expiry
    if (new Date(link.expiresAt) < new Date()) {
      if (link.status === 'ACTIVE') {
        await conn.query(
          'UPDATE payment_links SET status = ? WHERE id = ?',
          ['EXPIRED', link.id]
        );
        link.status = 'EXPIRED';
      }
    }

    // ดึงข้อมูลเพิ่มเติม
    let quotation = null;
    let invoice = null;

    if (link.quotationId) {
      const qRows = await conn.query(
        'SELECT * FROM quotations WHERE id = ?',
        [link.quotationId]
      ) as any[];
      quotation = qRows[0] || null;
    }

    if (link.invoiceId) {
      const iRows = await conn.query(
        'SELECT * FROM invoices WHERE id = ?',
        [link.invoiceId]
      ) as any[];
      invoice = iRows[0] || null;
    }

    return NextResponse.json({
      success: true,
      link,
      quotation,
      invoice,
    });

  } catch (error: any) {
    console.error('Error fetching payment link:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
