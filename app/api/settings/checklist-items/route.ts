// app/api/settings/checklist-items/route.ts
// Admin CRUD for the global checklist-item definitions used by the
// "เช็คลิสต์ติดตามงานหลังการขาย" tab on every quotation. `requiredForCommission`
// controls which items must be checked before commission can be marked as paid
// (see app/api/quotations/[id]/checklist/route.ts and .../commission-paid/route.ts).
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  let conn;
  try {
    await requireAuth();
    conn = await pool.getConnection();
    const items = await conn.query(
      `SELECT id, parentId, label, description, sortOrder, isActive, requiredForCommission,
              autoEventKey, allowManualOverride, createdAt, updatedAt
       FROM checklist_items ORDER BY sortOrder ASC, id ASC`
    );
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching checklist items:', error);
    return NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

export async function POST(request: NextRequest) {
  let conn;
  try {
    await requireAuth();
    const body = await request.json();
    const label = (body.label || '').trim();
    if (!label) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อรายการ' }, { status: 400 });
    }

    conn = await pool.getConnection();
    const maxRows = await conn.query('SELECT COALESCE(MAX(sortOrder), 0) as maxSort FROM checklist_items');
    const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : Number(maxRows[0].maxSort) + 1;

    const result = await conn.query(
      `INSERT INTO checklist_items
         (parentId, label, description, sortOrder, isActive, requiredForCommission, autoEventKey, allowManualOverride)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.parentId ? Number(body.parentId) : null,
        label,
        body.description || null,
        sortOrder,
        body.isActive === undefined ? true : !!body.isActive,
        !!body.requiredForCommission,
        body.autoEventKey || null,
        body.allowManualOverride === undefined ? true : !!body.allowManualOverride,
      ]
    );

    const inserted = await conn.query('SELECT * FROM checklist_items WHERE id = ?', [Number(result.insertId)]);
    return NextResponse.json({ item: inserted[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error creating checklist item:', error);
    return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
