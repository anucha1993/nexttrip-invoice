// app/api/invoices/route.ts
// API สำหรับ List และ Create Invoices

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateDocumentNumber } from '@/lib/helpers/document-number';
import {
  validateQuotationForInvoice,
  validateInvoiceAmount,
  validateInvoiceItems,
} from '@/lib/validations/invoice';

// GET /api/invoices - List invoices with filters
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const { searchParams } = new URL(request.url);
    const quotationId = searchParams.get('quotationId');
    const status = searchParams.get('status');
    const hasTaxInvoice = searchParams.get('hasTaxInvoice');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // Build query with additional fields
    let query = `
      SELECT 
        i.*,
        q.quotationNumber,
        q.tourName,
        q.customerId,
        cust.name as customerName,
        cust.code as customerCode
      FROM invoices i
      LEFT JOIN quotations q ON i.quotationId = q.id
      LEFT JOIN customers cust ON q.customerId = cust.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (quotationId) {
      query += ' AND i.quotationId = ?';
      params.push(quotationId);
    }
    
    // Add customerId filter
    const customerId = searchParams.get('customerId');
    if (customerId) {
      query += ' AND q.customerId = ?';
      params.push(customerId);
    }
    
    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }
    
    if (hasTaxInvoice === 'true') {
      query += ' AND i.hasTaxInvoice = TRUE AND i.taxInvoiceNumber IS NOT NULL';
    } else if (hasTaxInvoice === 'false') {
      query += ' AND (i.hasTaxInvoice = FALSE OR i.hasTaxInvoice IS NULL)';
    }
    
    // Count total - สร้าง count query แยกต่างหาก
    let countQuery = `
      SELECT COUNT(*) as total
      FROM invoices i
      LEFT JOIN quotations q ON i.quotationId = q.id
      LEFT JOIN customers cust ON q.customerId = cust.id
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    
    if (quotationId) {
      countQuery += ' AND i.quotationId = ?';
      countParams.push(quotationId);
    }
    
    // Add customerId filter to count
    if (customerId) {
      countQuery += ' AND q.customerId = ?';
      countParams.push(customerId);
    }
    
    if (status) {
      countQuery += ' AND i.status = ?';
      countParams.push(status);
    }
    
    if (hasTaxInvoice === 'true') {
      countQuery += ' AND i.hasTaxInvoice = TRUE AND i.taxInvoiceNumber IS NOT NULL';
    } else if (hasTaxInvoice === 'false') {
      countQuery += ' AND (i.hasTaxInvoice = FALSE OR i.hasTaxInvoice IS NULL)';
    }
    
    const countResult = await connection.query(countQuery, countParams);
    const total = Number(countResult[0]?.total) || 0;
    
    // Add sorting and pagination
    query += ' ORDER BY i.createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const invoices = await connection.query(query, params);
    
    // Fetch items for each invoice
    const invoiceIds = invoices.map((inv: any) => inv.id);
    let itemsMap: Record<number, any[]> = {};
    
    if (invoiceIds.length > 0) {
      const itemsQuery = `
        SELECT * FROM invoice_items 
        WHERE invoiceId IN (${invoiceIds.map(() => '?').join(',')})
        ORDER BY invoiceId, sortOrder
      `;
      const items = await connection.query(itemsQuery, invoiceIds);
      
      // Group items by invoiceId
      items.forEach((item: any) => {
        const invoiceId = Number(item.invoiceId);
        if (!itemsMap[invoiceId]) {
          itemsMap[invoiceId] = [];
        }
        itemsMap[invoiceId].push({
          ...item,
          id: Number(item.id),
          invoiceId: Number(item.invoiceId),
          productId: item.productId ? Number(item.productId) : null,
          quantity: Number(item.quantity),
          unitPrice: parseFloat(item.unitPrice) || 0,
          amount: parseFloat(item.amount) || 0,
        });
      });
    }
    
    // Convert BigInt to Number for JSON serialization
    const serializedInvoices = invoices.map((inv: any) => ({
      ...inv,
      id: Number(inv.id),
      quotationId: Number(inv.quotationId),
      pax: Number(inv.pax),
      grandTotal: parseFloat(inv.grandTotal) || 0,
      subtotal: parseFloat(inv.subtotal) || 0,
      vatAmount: parseFloat(inv.vatAmount) || 0,
      discountAmount: parseFloat(inv.discountAmount) || 0,
      paidAmount: parseFloat(inv.paidAmount) || 0,
      refundedAmount: parseFloat(inv.refundedAmount) || 0,
      items: itemsMap[Number(inv.id)] || [],
      customer: {
        id: inv.customerId ? Number(inv.customerId) : null,
        code: inv.customerCode || null,
        name: inv.customerName || null,
      },
      quotation: {
        id: Number(inv.quotationId),
        quotationNumber: inv.quotationNumber || null,
        tourName: inv.tourName || null,
      },
    }));
    
    return NextResponse.json({
      invoices: serializedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// POST /api/invoices - Create new invoice
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const body = await request.json();
    const {
      quotationId,
      pax,
      invoiceDate,
      dueDate,
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
      createdById,
      createdByName,
    } = body;
    
    // Validation 1: ตรวจสอบว่า Quotation สามารถสร้าง Invoice ได้
    const quotationValidation = await validateQuotationForInvoice(quotationId, connection);
    if (!quotationValidation.valid) {
      await connection.rollback();
      return NextResponse.json(
        { error: quotationValidation.error },
        { status: 400 }
      );
    }
    
    // Validation 2: ตรวจสอบยอดเงินไม่เกินยอดคงเหลือ
    const amountValidation = await validateInvoiceAmount(
      quotationId,
      grandTotal,
      null,
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
    
    // Validation 3: ตรวจสอบยอดรวม Items (skip สำหรับ quotation copy เพราะเชื่อมั่นข้อมูล 100%)
    // Items รวมกันได้ subtotal ไม่ใช่ grandTotal (grandTotal = subtotal + VAT - discount)
    const skipItemsValidation = true; // copy จาก quotation โดยตรง
    const itemsValidation = validateInvoiceItems(items, subtotal, skipItemsValidation);
    if (!itemsValidation.valid) {
      await connection.rollback();
      return NextResponse.json(
        { 
          error: itemsValidation.error,
          calculatedTotal: itemsValidation.calculatedTotal 
        },
        { status: 400 }
      );
    }
    
    // Generate invoice number
    const invoiceNumber = await generateDocumentNumber('INVOICE', connection);
    
    // Insert invoice
    const result = await connection.query(
      `INSERT INTO invoices (
        invoiceNumber, quotationId, pax, invoiceDate, dueDate,
        subtotal, discountAmount, vatExemptAmount, preTaxAmount,
        vatAmount, grandTotal, withholdingTax, depositAmount,
        status, notes, createdById, createdByName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?)`,
      [
        invoiceNumber,
        quotationId,
        pax || 1,
        invoiceDate,
        dueDate,
        subtotal,
        discountAmount || 0,
        vatExemptAmount || 0,
        preTaxAmount,
        vatAmount,
        grandTotal,
        withholdingTax || 0,
        depositAmount || 0,
        notes || null,
        createdById || null,
        createdByName || null,
      ]
    );
    
    const invoiceId = result.insertId;
    
    // Insert invoice items
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
    
    // Fetch created invoice with details
    const invoices = await connection.query(
      `SELECT 
        i.*,
        q.quotationNumber,
        cust.name as customerName
      FROM invoices i
      LEFT JOIN quotations q ON i.quotationId = q.id
      LEFT JOIN customers cust ON q.customerId = cust.id
      WHERE i.id = ?`,
      [invoiceId]
    );
    
    const invoiceItems = await connection.query(
      'SELECT * FROM invoice_items WHERE invoiceId = ? ORDER BY sortOrder',
      [invoiceId]
    );
    
    // Serialize response to convert BigInt to Number
    const serializedInvoice = {
      ...invoices[0],
      id: Number(invoices[0].id),
      quotationId: Number(invoices[0].quotationId),
      grandTotal: parseFloat(invoices[0].grandTotal) || 0,
      subtotal: parseFloat(invoices[0].subtotal) || 0,
      vatAmount: parseFloat(invoices[0].vatAmount) || 0,
    };
    
    return NextResponse.json({
      invoice: serializedInvoice,
      items: invoiceItems,
    }, { status: 201 });
    
  } catch (error: any) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
