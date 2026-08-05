import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// DELETE - ลบเอกสาร
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    connection = await pool.getConnection();
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await connection.query(`DELETE FROM quotation_documents WHERE id = ?`, [id]);

    return NextResponse.json({
      success: true,
      message: 'ลบเอกสารเรียบร้อย',
    });
  } catch (error) {
    console.error('Error deleting quotation document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
