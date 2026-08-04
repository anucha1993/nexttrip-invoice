// app/api/quotations/[id]/checklist/route.ts
// Per-quotation state of the post-sale follow-up checklist
// (ติดตามงานหลังการขาย). GET returns every ACTIVE checklist_items row merged
// with this quotation's checked state (defaults to unchecked if no row yet),
// plus a `commission` summary block so the UI can show whether commission is
// allowed to be paid yet (see requiredForCommission gating).
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    await requireAuth();
    const { id } = await params;
    conn = await pool.getConnection();

    const quotationRows = await conn.query(
      'SELECT id, commission, commissionNote, commissionPaid, commissionPaidAt FROM quotations WHERE id = ?',
      [id]
    );
    if (!quotationRows || quotationRows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
    }
    const quotation = quotationRows[0];

    const items = await conn.query(
      `SELECT
         ci.id, ci.parentId, ci.label, ci.description, ci.sortOrder,
         ci.requiredForCommission, ci.autoEventKey, ci.allowManualOverride,
         COALESCE(qcs.checked, 0) as checked,
         qcs.checkedAt, qcs.checkedBy, qcs.source, qcs.sourceRef
       FROM checklist_items ci
       LEFT JOIN quotation_checklist_status qcs
         ON qcs.itemId = ci.id AND qcs.quotationId = ?
       WHERE ci.isActive = 1
       ORDER BY ci.sortOrder ASC, ci.id ASC`,
      [id]
    );

    // Group headers (rows that are a parent of other rows) don't count toward
    // the commission gate themselves — only their leaf children do.
    const parentIds = new Set(items.filter((i: any) => i.parentId).map((i: any) => i.parentId));
    const leafItems = items.filter((i: any) => !parentIds.has(i.id));
    const requiredItems = leafItems.filter((i: any) => i.requiredForCommission);
    const missingRequired = requiredItems.filter((i: any) => !i.checked);
    const commissionReady = missingRequired.length === 0;

    // Nest children under their group header for the UI.
    const groups = items
      .filter((i: any) => !i.parentId)
      .map((parent: any) => ({
        ...parent,
        children: items.filter((c: any) => c.parentId === parent.id),
      }));

    return NextResponse.json({
      items,
      groups,
      commission: {
        amount: quotation.commission,
        note: quotation.commissionNote,
        paid: !!quotation.commissionPaid,
        paidAt: quotation.commissionPaidAt,
        ready: commissionReady,
        missingItems: missingRequired.map((i: any) => i.label),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching quotation checklist:', error);
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const itemId = Number(body.itemId);
    const checked = !!body.checked;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    conn = await pool.getConnection();

    const quotationRows = await conn.query('SELECT id FROM quotations WHERE id = ?', [id]);
    if (!quotationRows || quotationRows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
    }
    const itemRows = await conn.query('SELECT id FROM checklist_items WHERE id = ?', [itemId]);
    if (!itemRows || itemRows.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการเช็คลิสต์นี้' }, { status: 404 });
    }

    const checkedBy = session?.name || session?.email || null;

    await conn.query(
      `INSERT INTO quotation_checklist_status (quotationId, itemId, checked, checkedAt, checkedBy, source, sourceRef)
       VALUES (?, ?, ?, ?, ?, 'MANUAL', NULL)
       ON DUPLICATE KEY UPDATE
         checked = VALUES(checked),
         checkedAt = VALUES(checkedAt),
         checkedBy = VALUES(checkedBy),
         source = 'MANUAL',
         sourceRef = NULL,
         updatedAt = NOW()`,
      [id, itemId, checked, checked ? new Date() : null, checked ? checkedBy : null]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating quotation checklist:', error);
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
