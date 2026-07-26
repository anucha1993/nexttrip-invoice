// app/api/payments/verify-slip/route.ts
// POST (multipart/form-data): ตรวจสอบสลิปโอนเงินผ่าน Slip2Go
//
// ฟอร์มฟิลด์:
//   - file        (required) รูปสลิป .png/.jpg/.jpeg
//   - amount      (optional) จำนวนเงินที่คาดหวัง (ตัวเลข)
//   - amountType  (optional) 'eq' | 'gte' | 'lte' (default: 'gte')
//   - bankAccountId (optional) id ของ bank_accounts ที่จะใช้ตรวจ receiver
//
// พฤติกรรม:
//   - เรียก Slip2Go verify-slip/qr-image/info
//   - ถ้าสำเร็จ (code=200000) จะเช็คซ้ำกับ customer_transactions.slipRef ที่มีอยู่แล้ว
//   - ไม่บันทึก DB (ตัว payment save ยังคงทำที่ /api/customer-transactions ตามเดิม)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { Slip2goService } from '@/lib/services/slip2go';
import pool from '@/lib/db';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

export async function POST(req: NextRequest) {
  let conn;
  try {
    await requireAuth();

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ ok: false, error: 'กรุณาแนบไฟล์สลิป (field: file)' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ ok: false, error: 'ไฟล์ว่างเปล่า' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: 'ไฟล์ใหญ่เกิน 5MB' }, { status: 400 });
    }
    const mime = (file as File).type || '';
    if (mime && !ALLOWED_MIMES.has(mime)) {
      return NextResponse.json(
        { ok: false, error: `รองรับเฉพาะ .png/.jpg/.jpeg (พบ: ${mime})` },
        { status: 400 }
      );
    }

    const filename = (file as File).name || 'slip.png';
    const amountRaw = form.get('amount');
    const amount = amountRaw ? Number(amountRaw) : undefined;
    const amountType = (form.get('amountType') as 'eq' | 'gte' | 'lte' | null) || 'gte';
    const bankAccountId = form.get('bankAccountId')
      ? Number(form.get('bankAccountId'))
      : null;

    // โหลด receiver จาก bank_accounts (ถ้าระบุ)
    let receiverAccountName: string | undefined;
    let receiverAccountNumber: string | undefined;
    if (bankAccountId) {
      conn = await pool.getConnection();
      const rows = await conn.query(
        `SELECT accountName, accountNumber FROM bank_accounts WHERE id = ? LIMIT 1`,
        [bankAccountId]
      );
      if (rows?.[0]) {
        receiverAccountName = rows[0].accountName || undefined;
        receiverAccountNumber = rows[0].accountNumber || undefined;
      }
    }

    const svc = await Slip2goService.fromSettings();
    if (!svc.isConfigured) {
      return NextResponse.json(
        { ok: false, error: 'Slip2Go ยังไม่ได้ตั้งค่า Secret Key' },
        { status: 400 }
      );
    }

    const result = await svc.verifyByImage(file, filename, {
      amount: amount && !Number.isNaN(amount) ? amount : undefined,
      amountType,
      receiverAccountName,
      receiverAccountNumber,
    });

    if (String(result.code) !== '200000') {
      // ไม่ผ่านการตรวจ (code จาก Slip2Go อธิบายเหตุผล)
      return NextResponse.json(
        { ok: false, code: result.code, message: result.message, data: result.data ?? null },
        { status: 400 }
      );
    }

    // เช็คซ้ำใน DB
    const transRef = result.data?.transRef || null;
    if (transRef) {
      if (!conn) conn = await pool.getConnection();
      const dup = await conn.query(
        `SELECT id, transactionNumber, invoiceId, amount, paymentDate
           FROM customer_transactions
          WHERE slipRef = ?
          LIMIT 1`,
        [transRef]
      );
      if (dup?.[0]) {
        return NextResponse.json(
          {
            ok: false,
            code: 'duplicate_local',
            message: 'สลิปนี้ถูกใช้บันทึกแล้วในระบบ',
            duplicate: dup[0],
            data: result.data,
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      code: result.code,
      message: result.message,
      data: result.data,
      // ส่งค่าที่จำเป็นเพื่อให้ฝั่ง client แนบไปตอน save payment
      slip: {
        slipRef: transRef,
        slipStatusCode: result.code,
        slipData: result.data ?? null,
        slipVerifiedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/payments/verify-slip error', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
