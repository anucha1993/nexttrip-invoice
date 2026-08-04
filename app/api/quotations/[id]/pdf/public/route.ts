// app/api/quotations/[id]/pdf/public/route.ts
// GET: เปิดดู/ดาวน์โหลด PDF ใบเสนอราคาแบบสาธารณะ (ไม่ต้องล็อกอิน) ผ่านลิงก์ที่มี Token
// เซ็นชื่อและมีวันหมดอายุ (สร้างจาก POST /api/quotations/[id]/share-link)
// ไม่มี requireAuth() โดยตั้งใจ — ต้องพึ่ง token เท่านั้นในการยืนยันสิทธิ์เข้าถึง

import { NextRequest, NextResponse } from 'next/server';
import { verifyQuotationShareToken } from '@/lib/quotation-share-token';
import { generateQuotationPdf } from '@/lib/pdf/quotation-pdf';

export const runtime = 'nodejs';

function errorPage(message: string) {
  return new NextResponse(
    `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8" />
      <title>ไม่สามารถเปิดไฟล์ได้</title></head>
      <body style="font-family:Tahoma,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f3f4f6;">
        <div style="text-align:center;color:#374151;">
          <h2 style="color:#dc2626;">ไม่สามารถเปิดไฟล์ได้</h2>
          <p>${message}</p>
        </div>
      </body></html>`,
    { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotationId = Number(id);
    const token = request.nextUrl.searchParams.get('token') || '';

    if (!quotationId || !(await verifyQuotationShareToken(token, quotationId))) {
      return errorPage('ลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว (ใช้งานได้ 7 วันหลังสร้าง) กรุณาขอลิงก์ใหม่');
    }

    const pdfBuffer = await generateQuotationPdf(String(quotationId));
    if (!pdfBuffer) {
      return errorPage('ไม่พบใบเสนอราคานี้');
    }
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quotation-${quotationId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating public quotation PDF:', error);
    return errorPage('เกิดข้อผิดพลาดในการสร้าง PDF');
  }
}
