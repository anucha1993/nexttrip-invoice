import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - รายการต้นทุน Wholesale
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
      `SELECT * FROM wholesale_costs 
       WHERE quotationId = ? 
       ORDER BY createdAt DESC`,
      [quotationId]
    );

    // Calculate total
    const totalCost = (costs as any[]).reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    return NextResponse.json({
      costs,
      totalCost,
    });
  } catch (error) {
    console.error('Error fetching wholesale costs:', error);
    return NextResponse.json({ error: 'Failed to fetch wholesale costs' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST - เพิ่มต้นทุน Wholesale
export async function POST(request: NextRequest) {
  let connection;
  try {
    connection = await pool.getConnection();
    const body = await request.json();
    const {
      quotationId,
      wholesaleId,
      wholesaleName,
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
      `INSERT INTO wholesale_costs (
        quotationId, wholesaleId, wholesaleName, costType, description, amount, notes, slipUrl,
        createdById, createdByName, updatedById, updatedByName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quotationId,
        wholesaleId || null,
        wholesaleName || null,
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
    console.error('Error creating wholesale cost:', error);
    return NextResponse.json({ error: 'Failed to create wholesale cost' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
