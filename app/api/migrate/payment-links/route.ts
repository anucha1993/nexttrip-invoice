/**
 * Migration API - สร้างตาราง payment_links
 * เข้า: /api/migrate/payment-links
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  const conn = await pool.getConnection();

  try {
    // ตรวจสอบว่าตารางมีอยู่แล้วหรือไม่
    const checkTable = await conn.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'nexttrip_invoice' 
      AND TABLE_NAME = 'payment_links'
    `) as any[];

    if (checkTable.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Table payment_links already exists',
      });
    }

    // สร้างตาราง
    await conn.query(`
      CREATE TABLE payment_links (
        id VARCHAR(36) PRIMARY KEY,
        token VARCHAR(64) UNIQUE NOT NULL,
        quotationId VARCHAR(36),
        invoiceId VARCHAR(36),
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        status ENUM('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
        expiresAt DATETIME NOT NULL,
        usedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_token (token),
        INDEX idx_quotation (quotationId),
        INDEX idx_invoice (invoiceId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    return NextResponse.json({
      success: true,
      message: 'Table payment_links created successfully',
    });

  } catch (error: any) {
    console.error('Error creating table:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create table',
        sqlState: error.sqlState,
        errno: error.errno,
      },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST method to create payment_links table',
    instructions: 'Send POST request to /api/migrate/payment-links',
  });
}
