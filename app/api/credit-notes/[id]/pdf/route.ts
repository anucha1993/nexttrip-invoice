// app/api/credit-notes/[id]/pdf/route.ts
// สร้างและคืนไฟล์ PDF ของใบลดหนี้ (สำหรับเงินคืนลูกค้า)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { generateCreditNotePdf } from '@/lib/pdf/document-pdf';
import { logPdfError } from '@/lib/pdf/quotation-pdf';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const pdfBuffer = await generateCreditNotePdf(id);
    if (!pdfBuffer) {
      return NextResponse.json({ error: 'ไม่พบใบลดหนี้นี้' }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="credit-note-${id}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error generating credit note PDF:', error);
    logPdfError('credit note pdf', error);
    return NextResponse.json({ error: 'สร้าง PDF ไม่สำเร็จ' }, { status: 500 });
  }
}
