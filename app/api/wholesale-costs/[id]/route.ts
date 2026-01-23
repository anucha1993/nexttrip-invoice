import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - รายละเอียดต้นทุน
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    connection = await pool.getConnection();
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const costs = await connection.query(
      `SELECT * FROM wholesale_costs WHERE id = ?`,
      [id]
    );

    if (!costs || (costs as any[]).length === 0) {
      return NextResponse.json({ error: 'Cost not found' }, { status: 404 });
    }

    return NextResponse.json((costs as any[])[0]);
  } catch (error) {
    console.error('Error fetching wholesale cost:', error);
    return NextResponse.json({ error: 'Failed to fetch wholesale cost' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// PUT - แก้ไขต้นทุน
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    connection = await pool.getConnection();
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();

    const {
      costType,
      description,
      amount,
      notes,
      slipUrl,
      updatedById,
      updatedByName,
    } = body;

    if (!amount) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 });
    }

    await connection.query(
      `UPDATE wholesale_costs SET
        costType = ?,
        description = ?,
        amount = ?,
        notes = ?,
        slipUrl = COALESCE(?, slipUrl),
        updatedById = ?,
        updatedByName = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [
        costType || 'OTHER',
        description || null,
        parseFloat(amount).toFixed(2),
        notes || null,
        slipUrl,
        updatedById || null,
        updatedByName || null,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'แก้ไขต้นทุนเรียบร้อย',
    });
  } catch (error) {
    console.error('Error updating wholesale cost:', error);
    return NextResponse.json({ error: 'Failed to update wholesale cost' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// DELETE - ลบต้นทุน
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    connection = await pool.getConnection();
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await connection.query(`DELETE FROM wholesale_costs WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: 'ลบต้นทุนเรียบร้อย',
    });
  } catch (error) {
    console.error('Error deleting wholesale cost:', error);
    return NextResponse.json({ error: 'Failed to delete wholesale cost' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
