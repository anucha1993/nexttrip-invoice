// app/api/quotations/[id]/duplicate/route.ts
// POST: ทำใบเสนอราคาซ้ำ (duplicate) — คัดลอกข้อมูลทัวร์/ราคา/รายการสินค้าจากใบเสนอราคาเดิม
// มาสร้างเป็นใบเสนอราคาใหม่ (เลขที่ใหม่, สถานะ/การชำระเงินรีเซ็ตเป็นค่าเริ่มต้น)

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const session = await requireAuth();
    const { id } = await params;

    conn = await pool.getConnection();

    const rows = await conn.query('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
    }
    const src = rows[0];

    const items = await conn.query(
      `SELECT productId, productName, quantity, unitPrice, amount, itemType, vatType, hasWithholdingTax, sortOrder
       FROM quotation_items WHERE quotationId = ? ORDER BY sortOrder ASC`,
      [id]
    );

    // สร้างเลขที่ใบเสนอราคาใหม่: QT + YY + MM + XXXX (เหมือน POST /api/quotations)
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `QT${year}${month}`;
    const lastQuote = await conn.query(
      `SELECT quotationNumber FROM quotations WHERE quotationNumber LIKE ? ORDER BY quotationNumber DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let nextNumber = 1;
    if (lastQuote.length > 0) {
      const lastNum = parseInt(lastQuote[0].quotationNumber.slice(-4));
      nextNumber = lastNum + 1;
    }
    const quotationNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

    const result = await conn.query(
      `INSERT INTO quotations (
        quotationNumber, customerId, tourName, ntCode, customTourCode, tourType,
        countryId, airlineId, wholesaleId, departureDate, returnDate,
        numDays, paxCount, saleId, quotationDate, validUntil,
        depositDueDate, depositAmount, fullPaymentDueDate, fullPaymentAmount,
        subtotal, discountAmount, vatExemptAmount, preTaxAmount, vatAmount,
        grandTotal, withholdingTax, hasWithholdingTax, commission, commissionNote,
        status, paymentStatus, notes, createdById,
        vatMode, preVatAmount, includeVatAmount, netPayable, noCost,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        quotationNumber,
        src.customerId,
        src.tourName,
        src.ntCode,
        src.customTourCode,
        src.tourType || 'NORMAL',
        src.countryId,
        src.airlineId,
        src.wholesaleId,
        src.departureDate,
        src.returnDate,
        src.numDays,
        src.paxCount || 0,
        src.saleId,
        now, // quotationDate = วันนี้
        null, // validUntil — ให้ผู้ใช้กำหนดใหม่
        null, // depositDueDate — ให้ผู้ใช้กำหนดใหม่
        src.depositAmount || 0,
        null, // fullPaymentDueDate — ให้ผู้ใช้กำหนดใหม่
        src.fullPaymentAmount || 0,
        src.subtotal || 0,
        src.discountAmount || 0,
        src.vatExemptAmount || 0,
        src.preTaxAmount || 0,
        src.vatAmount || 0,
        src.grandTotal || 0,
        src.withholdingTax || 0,
        src.hasWithholdingTax || false,
        src.commission || 0,
        src.commissionNote,
        'NEW', // status — เริ่มต้นใหม่เป็นร่างเสมอ
        'UNPAID', // paymentStatus — ยังไม่มีการชำระเงินสำหรับใบใหม่
        src.notes,
        session.userId || 'system',
        src.vatMode || 'EXCLUDE',
        src.preVatAmount || 0,
        src.includeVatAmount || 0,
        src.netPayable || 0,
        src.noCost || false,
      ]
    );

    const newId = Number(result.insertId);

    for (const item of items) {
      await conn.query(
        `INSERT INTO quotation_items (
          quotationId, productId, productName, quantity, unitPrice,
          amount, itemType, vatType, hasWithholdingTax, sortOrder, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          newId,
          item.productId,
          item.productName,
          item.quantity || 1,
          item.unitPrice || 0,
          item.amount || 0,
          item.itemType || 'INCOME',
          item.vatType || 'NO_VAT',
          item.hasWithholdingTax || false,
          item.sortOrder || 0,
        ]
      );
    }

    return NextResponse.json({ success: true, id: newId, quotationNumber });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error duplicating quotation:', error);
    return NextResponse.json({ error: 'ทำใบเสนอราคาซ้ำไม่สำเร็จ' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
