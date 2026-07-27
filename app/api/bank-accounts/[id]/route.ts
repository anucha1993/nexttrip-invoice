// app/api/bank-accounts/[id]/route.ts
// PUT: แก้ไขบัญชีธนาคารของบริษัท (เลขที่บัญชี/ชื่อบัญชี/สาขา/ประเภท/เปิด-ปิดใช้งาน)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import pool from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    await requireAuth();
    const { id } = await params;
    const accountId = Number(id);
    if (!accountId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (typeof body.accountNumber === 'string') {
      fields.push('accountNumber = ?');
      values.push(body.accountNumber.trim());
    }
    if (typeof body.accountName === 'string') {
      fields.push('accountName = ?');
      values.push(body.accountName.trim());
    }
    if (typeof body.branchName === 'string') {
      fields.push('branchName = ?');
      values.push(body.branchName.trim() || null);
    }
    if (['SAVINGS', 'CURRENT', 'FIXED'].includes(body.accountType)) {
      fields.push('accountType = ?');
      values.push(body.accountType);
    }
    if (typeof body.isActive === 'boolean') {
      fields.push('isActive = ?');
      values.push(body.isActive);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลให้บันทึก' }, { status: 400 });
    }

    connection = await pool.getConnection();

    if (body.isDefault === true) {
      // มีได้แค่ 1 บัญชีที่เป็น "บัญชีหลัก" ของทั้งบริษัท (ไม่ใช่แค่ต่อธนาคารเดียว)
      await connection.query(`UPDATE bank_accounts SET isDefault = FALSE WHERE isDefault = TRUE`);
      fields.push('isDefault = ?');
      values.push(true);
    } else if (body.isDefault === false) {
      fields.push('isDefault = ?');
      values.push(false);
    }

    values.push(accountId);
    await connection.query(
      `UPDATE bank_accounts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error updating bank account:', error);
    return NextResponse.json(
      { error: 'Failed to update bank account', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
