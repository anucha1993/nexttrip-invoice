// app/api/bank-accounts/route.ts
// API สำหรับบัญชีธนาคารของบริษัท

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET /api/bank-accounts - List all bank accounts
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    
    let query = `
      SELECT 
        ba.id,
        ba.bankId,
        ba.accountNumber,
        ba.accountName,
        ba.accountType,
        ba.branchName,
        ba.isDefault,
        ba.isActive,
        ba.sortOrder,
        b.code as bankCode,
        b.nameTH as bankNameTH,
        b.nameEN as bankNameEN
      FROM bank_accounts ba
      LEFT JOIN banks b ON ba.bankId = b.id
    `;
    
    if (activeOnly) {
      query += ' WHERE ba.isActive = TRUE';
    }
    
    query += ' ORDER BY ba.sortOrder, b.nameTH';
    
    const accounts = await connection.query(query);
    
    // Format display name
    const accountTypeLabels: Record<string, string> = {
      'SAVINGS': 'ออมทรัพย์',
      'CURRENT': 'กระแสรายวัน',
      'FIXED': 'ฝากประจำ',
    };
    
    const formattedAccounts = accounts.map((acc: Record<string, unknown>) => {
      const accountTypeLabel = accountTypeLabels[acc.accountType as string] || acc.accountType;
      
      return {
        ...acc,
        id: Number(acc.id),
        bankId: Number(acc.bankId),
        isDefault: Boolean(acc.isDefault),
        isActive: Boolean(acc.isActive),
        displayName: `${acc.bankNameTH} / ${accountTypeLabel}`,
        fullDisplayName: `${acc.bankNameTH} - ${acc.accountNumber} (${accountTypeLabel})`,
      };
    });
    
    return NextResponse.json({
      bankAccounts: formattedAccounts,
    });
  } catch (error: any) {
    console.error('Error fetching bank accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank accounts', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
