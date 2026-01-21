// app/api/invoices/[id]/route.ts
// API สำหรับ Get, Update, Delete Invoice

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validateInvoiceAmount, validateInvoiceItems, canCancelInvoice } from '@/lib/validations/invoice';

// GET /api/invoices/[id] - Get invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    connection = await pool.getConnection();
    
    const invoiceId = parseInt(id);
    
    // Fetch invoice with quotation details
    const invoices = await connection.query(
      `SELECT 
        i.*,
        q.quotationNumber,
        c.name as customerName,
        q.grandTotal as quotationGrandTotal
      FROM invoices i
      LEFT JOIN quotations q ON i.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      WHERE i.id = ?`,
      [invoiceId]
    );
    
    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Fetch invoice items
    const items = await connection.query(
      'SELECT * FROM invoice_items WHERE invoiceId = ? ORDER BY sortOrder',
      [invoiceId]
    );
    
    // Calculate remaining amount for this quotation
    const totals = await connection.query(
      `SELECT COALESCE(SUM(grandTotal), 0) as totalInvoiced
       FROM invoices
       WHERE quotationId = ? AND status NOT IN ('CANCELLED', 'VOIDED')`,
      [invoices[0].quotationId]
    );
    
    const quotationRemaining = parseFloat(invoices[0].quotationGrandTotal) - parseFloat(totals[0].totalInvoiced);
    
    // Convert BigInt for serialization
    const invoice = {
      ...invoices[0],
      id: Number(invoices[0].id),
      quotationId: Number(invoices[0].quotationId),
      pax: Number(invoices[0].pax),
    };
    
    return NextResponse.json({
      invoice,
      items,
      quotationRemaining,
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const invoiceId = parseInt(id);
    const body = await request.json();
    const {
      invoiceDate,
      dueDate,
      pax,
      items,
      subtotal,
      discountAmount,
      vatExemptAmount,
      preTaxAmount,
      vatAmount,
      grandTotal,
      withholdingTax,
      depositAmount,
      notes,
      status,
      updatedById,
    } = body;
    
    // Check if invoice exists
    const existing = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    if (!existing || existing.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    const invoice = existing[0];
    
    // Cannot edit cancelled/voided invoices
    if (invoice.status === 'CANCELLED' || invoice.status === 'VOIDED') {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Cannot edit cancelled or voided invoice' },
        { status: 400 }
      );
    }
    
    // Validation 1: ตรวจสอบยอดเงินไม่เกินยอดคงเหลือ
    const amountValidation = await validateInvoiceAmount(
      invoice.quotationId,
      grandTotal,
      invoiceId, // Exclude current invoice from calculation
      connection
    );
    if (!amountValidation.valid) {
      await connection.rollback();
      return NextResponse.json(
        { 
          error: amountValidation.error,
          remaining: amountValidation.remaining 
        },
        { status: 400 }
      );
    }
    
    // Skip items validation - trust the calculation from client (same as quotation)
    
    // Update invoice
    await connection.query(
      `UPDATE invoices SET
        invoiceDate = ?,
        dueDate = ?,
        pax = ?,
        subtotal = ?,
        discountAmount = ?,
        vatExemptAmount = ?,
        preTaxAmount = ?,
        vatAmount = ?,
        grandTotal = ?,
        withholdingTax = ?,
        depositAmount = ?,
        notes = ?,
        status = ?,
        updatedById = ?,
        updatedAt = NOW()
      WHERE id = ?`,
      [
        invoiceDate,
        dueDate,
        pax || 1,
        subtotal,
        discountAmount || 0,
        vatExemptAmount || 0,
        preTaxAmount,
        vatAmount,
        grandTotal,
        withholdingTax || 0,
        depositAmount || 0,
        notes || null,
        status || invoice.status,
        updatedById || null,
        invoiceId,
      ]
    );
    
    // Delete old items
    await connection.query('DELETE FROM invoice_items WHERE invoiceId = ?', [invoiceId]);
    
    // Insert new items
    for (const [index, item] of items.entries()) {
      await connection.query(
        `INSERT INTO invoice_items (
          invoiceId, productId, description, quantity, unitPrice, amount,
          itemType, vatType, hasWithholdingTax, sortOrder
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.productId || null,
          item.description,
          item.quantity,
          item.unitPrice,
          item.amount,
          item.itemType || 'INCOME',
          item.vatType || 'VAT',
          item.hasWithholdingTax || false,
          index,
        ]
      );
    }
    
    await connection.commit();
    
    // Fetch updated invoice
    const updatedInvoices = await connection.query(
      `SELECT 
        i.*,
        q.quotationNumber,
        c.name as customerName
      FROM invoices i
      LEFT JOIN quotations q ON i.quotationId = q.id
      LEFT JOIN customers c ON q.customerId = c.id
      WHERE i.id = ?`,
      [invoiceId]
    );
    
    const updatedItems = await connection.query(
      'SELECT * FROM invoice_items WHERE invoiceId = ? ORDER BY sortOrder',
      [invoiceId]
    );
    
    return NextResponse.json({
      invoice: {
        ...updatedInvoices[0],
        id: Number(updatedInvoices[0].id),
        quotationId: Number(updatedInvoices[0].quotationId),
      },
      items: updatedItems,
    });
    
  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// DELETE /api/invoices/[id] - Cancel invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const invoiceId = parseInt(id);
    
    // Check if invoice exists
    const existing = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [invoiceId]
    );
    
    if (!existing || existing.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    if (hardDelete) {
      // Hard delete - ลบออกจาก DB จริงๆ
      // ลบ invoice_items ก่อน
      await connection.query(
        'DELETE FROM invoice_items WHERE invoiceId = ?',
        [invoiceId]
      );
      
      // ลบ invoice
      await connection.query(
        'DELETE FROM invoices WHERE id = ?',
        [invoiceId]
      );
      
      await connection.commit();
      
      return NextResponse.json({
        message: 'Invoice deleted permanently',
        deleted: true,
      });
    } else {
      // Soft delete - Cancel invoice
      let cancelReason = 'ลบโดยผู้ใช้';
      let cancelledById = null;
      
      // Try to parse body if exists
      try {
        const body = await request.json();
        cancelReason = body.cancelReason || cancelReason;
        cancelledById = body.cancelledById || null;
      } catch (e) {
        // No body provided, use defaults
        console.log('No body provided for DELETE, using defaults');
      }
      
      // Validation: ตรวจสอบว่าสามารถ Cancel ได้
      const validation = await canCancelInvoice(invoiceId, connection);
      if (!validation.canCancel) {
        await connection.rollback();
        return NextResponse.json(
          { 
            error: validation.error,
            relatedDocuments: validation.relatedDocuments 
          },
          { status: 400 }
        );
      }
      
      // Update status to CANCELLED
      await connection.query(
        `UPDATE invoices SET
          status = 'CANCELLED',
          cancelledAt = NOW(),
          cancelledById = ?,
          cancelReason = ?,
          updatedAt = NOW()
        WHERE id = ?`,
        [cancelledById, cancelReason, invoiceId]
      );
      
      await connection.commit();
      
      // Fetch updated invoice
      const invoices = await connection.query(
        'SELECT * FROM invoices WHERE id = ?',
        [invoiceId]
      );
      
      return NextResponse.json({
        invoice: {
          ...invoices[0],
          id: Number(invoices[0].id),
        },
        message: 'Invoice cancelled successfully',
      });
    }
    
  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting/cancelling invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete/cancel invoice', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
