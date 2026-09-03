// app/api/settings/cost-categories/route.ts
// Admin CRUD for the "ประเภทต้นทุน" list used by CostTab (scope=GENERAL) and
// WholesaleCostTab (scope=WHOLESALE) on the quotation dashboard, replacing the
// previously hardcoded costTypeOptions arrays. `key` is the value actually
// stored in general_costs.costType / wholesale_costs.costType (free VARCHAR,
// not a FK) — deleting a category here does not affect already-saved cost rows.
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  let conn;
  try {
    await requireAuth();
    const scope = request.nextUrl.searchParams.get('scope');
    conn = await pool.getConnection();
    const categories = scope
      ? await conn.query(
          `SELECT id, scope, \`key\`, label, isActive, sortOrder, createdAt, updatedAt
           FROM cost_categories WHERE scope = ? ORDER BY sortOrder ASC, id ASC`,
          [scope]
        )
      : await conn.query(
          `SELECT id, scope, \`key\`, label, isActive, sortOrder, createdAt, updatedAt
           FROM cost_categories ORDER BY scope ASC, sortOrder ASC, id ASC`
        );
    return NextResponse.json({ categories });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching cost categories:', error);
    return NextResponse.json({ error: 'Failed to fetch cost categories' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

export async function POST(request: NextRequest) {
  let conn;
  try {
    await requireAuth();
    const body = await request.json();
    const scope = body.scope === 'WHOLESALE' ? 'WHOLESALE' : 'GENERAL';
    const label = (body.label || '').trim();
    if (!label) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อประเภทต้นทุน' }, { status: 400 });
    }
    // สร้าง key อัตโนมัติจากภาษาไทย/อังกฤษ (ตัวพิมพ์ใหญ่ + ขีดล่าง) ถ้าไม่ได้ระบุมา
    const rawKey = (body.key || label).trim();
    const key = rawKey
      .toUpperCase()
      .replace(/[^A-Z0-9ก-๙]+/g, '_')
      .replace(/^_+|_+$/g, '') || `CUSTOM_${Date.now()}`;

    conn = await pool.getConnection();
    const existing = await conn.query(
      'SELECT id FROM cost_categories WHERE scope = ? AND `key` = ?',
      [scope, key]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'มีประเภทต้นทุนนี้อยู่แล้ว' }, { status: 409 });
    }

    const maxRows = await conn.query(
      'SELECT COALESCE(MAX(sortOrder), 0) as maxSort FROM cost_categories WHERE scope = ?',
      [scope]
    );
    const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : Number(maxRows[0].maxSort) + 1;

    const result = await conn.query(
      `INSERT INTO cost_categories (scope, \`key\`, label, isActive, sortOrder)
       VALUES (?, ?, ?, ?, ?)`,
      [scope, key, label, body.isActive === undefined ? true : !!body.isActive, sortOrder]
    );

    const inserted = await conn.query('SELECT * FROM cost_categories WHERE id = ?', [Number(result.insertId)]);
    return NextResponse.json({ category: inserted[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error creating cost category:', error);
    return NextResponse.json({ error: 'Failed to create cost category' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
