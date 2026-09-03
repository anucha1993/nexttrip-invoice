// app/api/settings/cost-categories/[id]/route.ts
// Update/delete a single cost-category definition.
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();
    conn = await pool.getConnection();

    const existing = await conn.query('SELECT * FROM cost_categories WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'ไม่พบประเภทต้นทุนนี้' }, { status: 404 });
    }
    const current = existing[0];

    const label = body.label !== undefined ? String(body.label).trim() : undefined;
    if (label !== undefined && !label) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อประเภทต้นทุน' }, { status: 400 });
    }

    await conn.query(
      `UPDATE cost_categories SET
        label = ?,
        sortOrder = ?,
        isActive = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [
        label !== undefined ? label : current.label,
        body.sortOrder !== undefined ? Number(body.sortOrder) : current.sortOrder,
        body.isActive !== undefined ? !!body.isActive : current.isActive,
        id,
      ]
    );

    const updated = await conn.query('SELECT * FROM cost_categories WHERE id = ?', [id]);
    return NextResponse.json({ category: updated[0] });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating cost category:', error);
    return NextResponse.json({ error: 'Failed to update cost category' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn;
  try {
    await requireAuth();
    const { id } = await params;
    conn = await pool.getConnection();
    const existing = await conn.query('SELECT id FROM cost_categories WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'ไม่พบประเภทต้นทุนนี้' }, { status: 404 });
    }
    await conn.query('DELETE FROM cost_categories WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting cost category:', error);
    return NextResponse.json({ error: 'Failed to delete cost category' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
