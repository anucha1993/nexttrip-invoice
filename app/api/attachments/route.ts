import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const ALLOWED_ENTITY_TYPES = ['GENERAL_COST', 'WHOLESALE_COST', 'PURCHASE_TAX'];

// GET - รายการไฟล์แนบของ entity หนึ่งๆ
export async function GET(request: NextRequest) {
  let connection;
  try {
    connection = await pool.getConnection();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    const attachments = await connection.query(
      `SELECT * FROM attachments 
       WHERE entityType = ? AND entityId = ? 
       ORDER BY createdAt ASC`,
      [entityType, entityId]
    );

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST - เพิ่มไฟล์แนบ (บันทึกหลังจากอัพโหลดไฟล์ผ่าน /api/upload แล้ว)
export async function POST(request: NextRequest) {
  let connection;
  try {
    connection = await pool.getConnection();
    const body = await request.json();
    const {
      entityType,
      entityId,
      fileName,
      fileUrl,
      fileType,
      createdById,
      createdByName,
    } = body;

    if (!entityType || !ALLOWED_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
    }
    if (!entityId || !fileUrl || !fileName) {
      return NextResponse.json({ error: 'entityId, fileName and fileUrl are required' }, { status: 400 });
    }

    const result = await connection.query(
      `INSERT INTO attachments (
        entityType, entityId, fileName, fileUrl, fileType, createdById, createdByName
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        fileName,
        fileUrl,
        fileType || null,
        createdById || null,
        createdByName || null,
      ]
    );

    const insertId = (result as any).insertId;

    return NextResponse.json({
      success: true,
      attachmentId: Number(insertId),
    });
  } catch (error) {
    console.error('Error creating attachment:', error);
    return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
