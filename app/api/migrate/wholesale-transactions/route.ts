/**
 * Migration API - สร้างตาราง wholesale_transactions
 * เข้า: /api/migrate/wholesale-transactions
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
      AND TABLE_NAME = 'wholesale_transactions'
    `) as any[];

    if (checkTable.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Table wholesale_transactions already exists',
      });
    }

    // สร้างตาราง
    await conn.query(`
      CREATE TABLE wholesale_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transactionNumber VARCHAR(20) NOT NULL UNIQUE,
        transactionType ENUM('PAYMENT','REFUND') NOT NULL,
        
        quotationId INT NOT NULL,
        wholesaleId INT,
        wholesaleName VARCHAR(200),
        
        amount DECIMAL(15,2) NOT NULL,
        paymentMethod ENUM('CASH','TRANSFER','CREDIT_CARD','CHEQUE') DEFAULT 'TRANSFER',
        transactionDate DATETIME NOT NULL,
        paymentDate DATETIME NOT NULL,
        
        bankAccountId INT,
        toBankName VARCHAR(100),
        toBankAccountNo VARCHAR(50),
        toBankAccountName VARCHAR(100),
        
        chequeBankId INT,
        chequeNumber VARCHAR(50),
        chequeDate DATE,
        
        slipUrl VARCHAR(500),
        slipUploadedAt DATETIME,
        referenceNumber VARCHAR(100),
        
        refundReason VARCHAR(500),
        originalTransactionId INT,
        
        status ENUM('PENDING','CONFIRMED','CANCELLED') DEFAULT 'PENDING',
        confirmedAt DATETIME,
        confirmedById INT,
        confirmedByName VARCHAR(100),
        
        cancelledAt DATETIME,
        cancelledById INT,
        cancelledByName VARCHAR(100),
        cancelReason VARCHAR(500),
        
        notes TEXT,
        
        createdById INT,
        createdByName VARCHAR(100),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedById INT,
        updatedByName VARCHAR(100),
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (quotationId) REFERENCES quotations(id) ON DELETE RESTRICT,
        
        INDEX idx_ws_tx_quotation (quotationId),
        INDEX idx_ws_tx_wholesale (wholesaleId),
        INDEX idx_ws_tx_type (transactionType),
        INDEX idx_ws_tx_status (status),
        INDEX idx_ws_tx_date (paymentDate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    return NextResponse.json({
      success: true,
      message: 'Table wholesale_transactions created successfully',
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
    endpoint: '/api/migrate/wholesale-transactions',
    method: 'POST',
    description: 'สร้างตาราง wholesale_transactions สำหรับระบบชำระเงินให้ Wholesale',
  });
}
