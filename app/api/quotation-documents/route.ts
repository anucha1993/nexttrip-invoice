import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - รายการเอกสารของใบเสนอราคา
export async function GET(request: NextRequest) {
  let connection;
  try {
    connection = await pool.getConnection();
    const { searchParams } = new URL(request.url);
    const quotationId = searchParams.get('quotationId');

    if (!quotationId) {
      return NextResponse.json({ error: 'quotationId is required' }, { status: 400 });
    }

    const documents = await connection.query(
      `SELECT * FROM quotation_documents 
       WHERE quotationId = ? 
       ORDER BY createdAt DESC`,
      [quotationId]
    );

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching quotation documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST - เพิ่มเอกสาร (บันทึกหลังจากอัพโหลดไฟล์ผ่าน /api/upload แล้ว)
export async function POST(request: NextRequest) {
  let connection;
  try {
    connection = await pool.getConnection();
    const body = await request.json();
    const {
      quotationId,
      category,
      fileName,
      fileUrl,
      fileType,
      notes,
      createdById,
      createdByName,
    } = body;

    if (!quotationId || !fileUrl || !fileName) {
      return NextResponse.json({ error: 'quotationId, fileName and fileUrl are required' }, { status: 400 });
    }

    const result = await connection.query(
      `INSERT INTO quotation_documents (
        quotationId, category, fileName, fileUrl, fileType, notes, createdById, createdByName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quotationId,
        category || 'OTHER',
        fileName,
        fileUrl,
        fileType || null,
        notes || null,
        createdById || null,
        createdByName || null,
      ]
    );

    const insertId = (result as any).insertId;

    return NextResponse.json({
      success: true,
      message: 'บันทึกเอกสารเรียบร้อย',
      documentId: Number(insertId),
    });
  } catch (error) {
    console.error('Error creating quotation document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
