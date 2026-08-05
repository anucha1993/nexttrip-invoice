// app/api/quotations/[id]/pdf/route.ts
// สร้างและคืนไฟล์ PDF ของใบเสนอราคา (render ด้วย Puppeteer จาก HTML template)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { generateQuotationPdf, logPdfError } from '@/lib/pdf/quotation-pdf';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const pdfBuffer = await generateQuotationPdf(id);
    if (!pdfBuffer) {
      return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quotation-${id}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error generating quotation PDF:', error);
    logPdfError('quotation pdf (authenticated)', error);
    // TODO: ลบ debug field นี้ทิ้งหลังจากวินิจฉัยปัญหา production เสร็จ (ชั่วคราวเท่านั้น)
    const debugMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'สร้าง PDF ไม่สำเร็จ', debug: debugMessage }, { status: 500 });
  }
}
