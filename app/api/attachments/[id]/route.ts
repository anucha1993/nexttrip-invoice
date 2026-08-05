import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// DELETE - ลบไฟล์แนบ
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    connection = await pool.getConnection();
    const resolvedParams = await params;
    const id = resolvedParams.id;

    await connection.query(`DELETE FROM attachments WHERE id = ?`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
