import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Create wholesale_costs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS wholesale_costs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quotationId INT NOT NULL,
        wholesaleId INT,
        wholesaleName VARCHAR(200),
        costType VARCHAR(50) DEFAULT 'OTHER',
        description VARCHAR(500),
        amount DECIMAL(15,2) NOT NULL,
        notes TEXT,
        slipUrl VARCHAR(500),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdById INT,
        createdByName VARCHAR(100),
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updatedById INT,
        updatedByName VARCHAR(100),
        INDEX idx_quotationId (quotationId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Add costType column if not exists (for existing tables)
    try {
      await connection.query(`
        ALTER TABLE wholesale_costs 
        ADD COLUMN costType VARCHAR(50) DEFAULT 'OTHER' 
        AFTER wholesaleName
      `);
    } catch (alterError: unknown) {
      // Column might already exist, ignore error
      console.log('costType column might already exist:', alterError);
    }

    // Add slipUrl column if not exists (for existing tables)
    try {
      await connection.query(`
        ALTER TABLE wholesale_costs 
        ADD COLUMN slipUrl VARCHAR(500) 
        AFTER notes
      `);
    } catch (alterError: unknown) {
      // Column might already exist, ignore error
      console.log('slipUrl column might already exist:', alterError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed: wholesale_costs table created/updated with costType and slipUrl columns' 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: errorMessage 
    }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
