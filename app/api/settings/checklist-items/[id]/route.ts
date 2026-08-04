// app/api/settings/checklist-items/[id]/route.ts
// Update/delete a single checklist-item definition.
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

    const existing = await conn.query('SELECT * FROM checklist_items WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการเช็คลิสต์นี้' }, { status: 404 });
    }
    const current = existing[0];

    const label = body.label !== undefined ? String(body.label).trim() : undefined;
    if (label !== undefined && !label) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อรายการ' }, { status: 400 });
    }

    // Explicit `!== undefined` checks (not COALESCE) so callers can clear a
    // nullable field to NULL — e.g. unset parentId to ungroup an item, or
    // clear autoEventKey to make it manual-only again.
    await conn.query(
      `UPDATE checklist_items SET
        parentId = ?,
        label = ?,
        description = ?,
        sortOrder = ?,
        isActive = ?,
        requiredForCommission = ?,
        autoEventKey = ?,
        allowManualOverride = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [
        body.parentId !== undefined ? (body.parentId ? Number(body.parentId) : null) : current.parentId,
        label !== undefined ? label : current.label,
        body.description !== undefined ? (body.description || null) : current.description,
        body.sortOrder !== undefined ? Number(body.sortOrder) : current.sortOrder,
        body.isActive !== undefined ? !!body.isActive : current.isActive,
        body.requiredForCommission !== undefined ? !!body.requiredForCommission : current.requiredForCommission,
        body.autoEventKey !== undefined ? (body.autoEventKey || null) : current.autoEventKey,
        body.allowManualOverride !== undefined ? !!body.allowManualOverride : current.allowManualOverride,
        id,
      ]
    );

    const updated = await conn.query('SELECT * FROM checklist_items WHERE id = ?', [id]);
    return NextResponse.json({ item: updated[0] });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating checklist item:', error);
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
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

    const existing = await conn.query('SELECT id FROM checklist_items WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'ไม่พบรายการเช็คลิสต์นี้' }, { status: 404 });
    }

    // Remove per-quotation checked state for this item first (no FK cascade in this app).
    await conn.query('DELETE FROM quotation_checklist_status WHERE itemId = ?', [id]);
    // Ungroup any children rather than leaving them pointing at a deleted parent.
    await conn.query('UPDATE checklist_items SET parentId = NULL WHERE parentId = ?', [id]);
    await conn.query('DELETE FROM checklist_items WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting checklist item:', error);
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
