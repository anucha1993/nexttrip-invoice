// app/api/invoices/[id]/status/route.ts
// API สำหรับ Update Invoice Status

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// PATCH /api/invoices/[id]/status - Update invoice status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    connection = await pool.getConnection();
    
    const invoiceId = parseInt(id);
    const body = await request.json();
    const { status } = body;
    
    // Validate status
    const validStatuses = ['DRAFT', 'ISSUED', 'PAID', 'PARTIAL_PAID', 'CANCELLED', 'VOIDED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }
    
    // Block manual changes to PAID/PARTIAL_PAID - these must come from actual payments
    if (status === 'PAID' || status === 'PARTIAL_PAID') {
      return NextResponse.json(
        { error: 'ไม่สามารถเปลี่ยนสถานะเป็น "ชำระแล้ว" หรือ "ชำระบางส่วน" ได้โดยตรง กรุณาบันทึกการชำระเงินจริงในระบบ' },
        { status: 400 }
      );
    }
    
    // Check if invoice exists
    const existing = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    const invoice = existing[0];
    
    // Cannot change status of cancelled/voided invoices
    if (invoice.status === 'CANCELLED' || invoice.status === 'VOIDED') {
      return NextResponse.json(
        { error: 'Cannot change status of cancelled or voided invoice' },
        { status: 400 }
      );
    }
    
    // Update status
    await connection.query(
      `UPDATE invoices SET
        status = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [status, invoiceId]
    );
    
    // If status is CANCELLED, also update cancellation fields
    if (status === 'CANCELLED') {
      await connection.query(
        `UPDATE invoices SET
          cancelledAt = NOW(),
          cancelReason = 'เปลี่ยนสถานะเป็นยกเลิก'
        WHERE id = ?`,
        [invoiceId]
      );
    }
    
    // Fetch updated invoice
    const updatedInvoices = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    return NextResponse.json({
      invoice: {
        ...updatedInvoices[0],
        id: Number(updatedInvoices[0].id),
      },
      message: 'Status updated successfully',
    });
    
  } catch (error: unknown) {
    console.error('Error updating invoice status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update invoice status', details: errorMessage },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
