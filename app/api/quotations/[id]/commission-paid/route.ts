// app/api/quotations/[id]/commission-paid/route.ts
// Mark (or unmark) a quotation's commission as paid. Server-side re-validates
// the checklist gate itself (never trust a client-computed "ready" flag) —
// commissionPaid can only be set TRUE when every ACTIVE checklist_items row
// with requiredForCommission=1 is checked for this quotation.
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const paid = !!body.commissionPaid;

    conn = await pool.getConnection();
    const quotationRows = await conn.query('SELECT id FROM quotations WHERE id = ?', [id]);
    if (!quotationRows || quotationRows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
    }

    if (paid) {
      const missing = await conn.query(
        `SELECT ci.label
         FROM checklist_items ci
         LEFT JOIN quotation_checklist_status qcs
           ON qcs.itemId = ci.id AND qcs.quotationId = ?
         WHERE ci.isActive = 1 AND ci.requiredForCommission = 1
           AND COALESCE(qcs.checked, 0) = 0`,
        [id]
      );
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `ยังไม่สามารถจ่ายคอมมิชชั่นได้ ขาดเช็คลิสต์: ${missing.map((m: any) => m.label).join(', ')}`,
          },
          { status: 409 }
        );
      }
    }

    await conn.query(
      `UPDATE quotations SET commissionPaid = ?, commissionPaidAt = ?, updatedAt = NOW() WHERE id = ?`,
      [paid, paid ? new Date() : null, id]
    );

    return NextResponse.json({ success: true, commissionPaid: paid });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating commission-paid status:', error);
    return NextResponse.json({ error: 'Failed to update commission-paid status' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
