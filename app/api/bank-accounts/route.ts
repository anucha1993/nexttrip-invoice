// app/api/bank-accounts/route.ts
// API สำหรับบัญชีธนาคารของบริษัท

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
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

// POST /api/bank-accounts - Create a new bank account
export async function POST(request: NextRequest) {
  let connection;
  try {
    await requireAuth();
    const body = await request.json();

    const bankId = Number(body.bankId);
    const accountNumber = String(body.accountNumber || '').trim();
    const accountName = String(body.accountName || '').trim();
    const accountType = ['SAVINGS', 'CURRENT', 'FIXED'].includes(body.accountType)
      ? body.accountType
      : 'SAVINGS';
    const branchName = body.branchName ? String(body.branchName).trim() : null;
    const isActive = body.isActive !== false;
    const isDefault = body.isDefault === true;

    if (!bankId || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: 'กรุณาระบุธนาคาร เลขที่บัญชี และชื่อบัญชี' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    if (isDefault) {
      // มีได้แค่ 1 บัญชีที่เป็น "บัญชีหลัก" ของทั้งบริษัท (ไม่ใช่แค่ต่อธนาคารเดียว)
      await connection.query(`UPDATE bank_accounts SET isDefault = FALSE WHERE isDefault = TRUE`);
    }

    const result = await connection.query(
      `INSERT INTO bank_accounts (bankId, accountNumber, accountName, accountType, branchName, isDefault, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bankId, accountNumber, accountName, accountType, branchName, isDefault, isActive]
    );

    return NextResponse.json({ ok: true, id: Number(result.insertId) });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating bank account:', error);
    return NextResponse.json(
      { error: 'Failed to create bank account', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

