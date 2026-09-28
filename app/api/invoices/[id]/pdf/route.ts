// app/api/invoices/[id]/pdf/route.ts
// สร้างและคืนไฟล์ PDF ของใบแจ้งหนี้ (หรือใบกำกับภาษี ถ้ามี query ?type=tax และออกใบกำกับภาษีแล้ว)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { generateInvoicePdf } from '@/lib/pdf/document-pdf';
import { logPdfError } from '@/lib/pdf/quotation-pdf';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const asTaxInvoice = new URL(request.url).searchParams.get('type') === 'tax';
    const pdfBuffer = await generateInvoicePdf(id, asTaxInvoice);
    if (!pdfBuffer) {
      return NextResponse.json(
        { error: asTaxInvoice ? 'ไม่พบใบกำกับภาษีนี้' : 'ไม่พบใบแจ้งหนี้นี้' },
        { status: 404 }
      );
    }
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${asTaxInvoice ? 'tax-invoice' : 'invoice'}-${id}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error generating invoice PDF:', error);
    logPdfError('invoice pdf', error);
    return NextResponse.json({ error: 'สร้าง PDF ไม่สำเร็จ' }, { status: 500 });
  }
}
