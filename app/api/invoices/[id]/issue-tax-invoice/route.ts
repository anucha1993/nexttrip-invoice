// app/api/invoices/[id]/issue-tax-invoice/route.ts
// API สำหรับออกเลขที่ใบกำกับภาษี (Tax Invoice Number) ให้กับ Invoice

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateDocumentNumber } from '@/lib/helpers/document-number';

// POST /api/invoices/[id]/issue-tax-invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    const invoiceId = parseInt(id);
    
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Check if invoice exists and get current status
    const invoices = await connection.query(
      `SELECT id, invoiceNumber, status, hasTaxInvoice, taxInvoiceNumber 
       FROM invoices WHERE id = ?`,
      [invoiceId]
    );

    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบใบแจ้งหนี้' },
        { status: 404 }
      );
    }

    const invoice = invoices[0];

    // Check if already has tax invoice
    if (invoice.hasTaxInvoice && invoice.taxInvoiceNumber) {
      return NextResponse.json(
        { error: `ใบแจ้งหนี้นี้มีใบกำกับภาษีแล้ว: ${invoice.taxInvoiceNumber}` },
        { status: 400 }
      );
    }

    // Check invoice status - only allow for valid statuses
    const allowedStatuses = ['ISSUED', 'PAID', 'PARTIAL_PAID'];
    if (!allowedStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: `ไม่สามารถออกใบกำกับภาษีได้ สถานะใบแจ้งหนี้: ${invoice.status}` },
        { status: 400 }
      );
    }

    // Get user info from request body (optional)
    let issuedById = null;
    let issuedByName = null;
    try {
      const body = await request.json();
      issuedById = body.issuedById || null;
      issuedByName = body.issuedByName || null;
    } catch {
      // No body provided, use defaults
    }

    // Generate tax invoice number
    const taxInvoiceNumber = await generateDocumentNumber('TAX_INVOICE', connection);

    // Update invoice with tax invoice info
    await connection.query(
      `UPDATE invoices SET 
        hasTaxInvoice = TRUE,
        taxInvoiceNumber = ?,
        taxInvoiceIssuedAt = NOW(),
        taxInvoiceIssuedById = ?,
        taxInvoiceIssuedByName = ?,
        updatedAt = NOW()
       WHERE id = ?`,
      [taxInvoiceNumber, issuedById, issuedByName, invoiceId]
    );

    // Get updated invoice
    const updatedInvoices = await connection.query(
      `SELECT i.*, q.quotationNumber, q.tourName, c.name as customerName
       FROM invoices i
       LEFT JOIN quotations q ON i.quotationId = q.id
       LEFT JOIN customers c ON q.customerId = c.id
       WHERE i.id = ?`,
      [invoiceId]
    );

    const updatedInvoice = updatedInvoices[0];

    return NextResponse.json({
      success: true,
      message: `ออกใบกำกับภาษีเรียบร้อย: ${taxInvoiceNumber}`,
      taxInvoiceNumber,
      invoice: {
        id: Number(updatedInvoice.id),
        invoiceNumber: updatedInvoice.invoiceNumber,
        taxInvoiceNumber: updatedInvoice.taxInvoiceNumber,
        hasTaxInvoice: Boolean(updatedInvoice.hasTaxInvoice),
        taxInvoiceIssuedAt: updatedInvoice.taxInvoiceIssuedAt,
        grandTotal: parseFloat(updatedInvoice.grandTotal) || 0,
        customerName: updatedInvoice.customerName,
        quotationNumber: updatedInvoice.quotationNumber,
        tourName: updatedInvoice.tourName,
      }
    });

  } catch (error) {
    console.error('Error issuing tax invoice:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการออกใบกำกับภาษี' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// DELETE /api/invoices/[id]/issue-tax-invoice - Cancel tax invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    const invoiceId = parseInt(id);
    
    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cancelReason = searchParams.get('reason') || 'ยกเลิกโดยผู้ใช้';

    connection = await pool.getConnection();

    // Check if invoice exists and has tax invoice
    const invoices = await connection.query(
      `SELECT id, invoiceNumber, hasTaxInvoice, taxInvoiceNumber 
       FROM invoices WHERE id = ?`,
      [invoiceId]
    );

    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบใบแจ้งหนี้' },
        { status: 404 }
      );
    }

    const invoice = invoices[0];

    if (!invoice.hasTaxInvoice) {
      return NextResponse.json(
        { error: 'ใบแจ้งหนี้นี้ยังไม่มีใบกำกับภาษี' },
        { status: 400 }
      );
    }

    // Cancel (remove) tax invoice
    await connection.query(
      `UPDATE invoices SET 
        hasTaxInvoice = FALSE,
        taxInvoiceCancelledAt = NOW(),
        taxInvoiceCancelReason = ?,
        updatedAt = NOW()
       WHERE id = ?`,
      [cancelReason, invoiceId]
    );

    return NextResponse.json({
      success: true,
      message: `ยกเลิกใบกำกับภาษี ${invoice.taxInvoiceNumber} เรียบร้อย`,
    });

  } catch (error) {
    console.error('Error cancelling tax invoice:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการยกเลิกใบกำกับภาษี' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
