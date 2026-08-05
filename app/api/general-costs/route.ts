import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - รายการต้นทุนทั่วไป
export async function GET(request: NextRequest) {
  let connection;
  try {
    connection = await pool.getConnection();
    const { searchParams } = new URL(request.url);
    const quotationId = searchParams.get('quotationId');

    if (!quotationId) {
      return NextResponse.json({ error: 'quotationId is required' }, { status: 400 });
    }

    const costs = await connection.query(
      `SELECT gc.*,
        (SELECT COUNT(*) FROM attachments a WHERE a.entityType = 'GENERAL_COST' AND a.entityId = gc.id) as attachmentCount
       FROM general_costs gc
       WHERE gc.quotationId = ? 
       ORDER BY gc.createdAt DESC`,
      [quotationId]
    );

    // Calculate total
    const totalCost = (costs as any[]).reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    return NextResponse.json({
      costs,
      totalCost,
    });
  } catch (error) {
    console.error('Error fetching general costs:', error);
    return NextResponse.json({ error: 'Failed to fetch general costs' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST - เพิ่มต้นทุนทั่วไป
export async function POST(request: NextRequest) {
  let connection;
  try {
    connection = await pool.getConnection();
    const body = await request.json();
    const {
      quotationId,
      costType,
      description,
      amount,
      notes,
      slipUrl,
      createdById,
      createdByName,
    } = body;

    if (!quotationId || !amount) {
      return NextResponse.json({ error: 'quotationId and amount are required' }, { status: 400 });
    }

    const result = await connection.query(
      `INSERT INTO general_costs (
        quotationId, costType, description, amount, notes, slipUrl,
        createdById, createdByName, updatedById, updatedByName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quotationId,
        costType || 'OTHER',
        description || null,
        parseFloat(amount).toFixed(2),
        notes || null,
        slipUrl || null,
        createdById || null,
        createdByName || null,
        createdById || null,
        createdByName || null,
      ]
    );

    const insertId = (result as any).insertId;

    return NextResponse.json({
      success: true,
      message: 'บันทึกต้นทุนเรียบร้อย',
      costId: Number(insertId),
    });
  } catch (error) {
    console.error('Error creating general cost:', error);
    return NextResponse.json({ error: 'Failed to create general cost' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
