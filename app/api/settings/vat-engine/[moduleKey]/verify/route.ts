// app/api/settings/vat-engine/[moduleKey]/verify/route.ts
// เครื่องมือ "ทดสอบเทียบของจริง" — ดึงข้อมูลจริงของ record 1 รายการ (quotation หรือ
// invoice) มารันผ่าน VAT engine (aggregate ต่อแถว + ลำดับสูตร) แล้วเทียบผลลัพธ์กับ
// ค่าที่ระบบเดิม (hardcode ใน quotation-form.tsx / invoice-modal.tsx) คำนวณและบันทึกไว้
// จริงใน DB — ไม่แก้ไขข้อมูลใดๆ ใช้สำหรับตรวจสอบก่อนตัดสินใจสลับไปใช้สูตรนี้จริง
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import pool from '@/lib/db';
import { CompanySettingService } from '@/lib/services/company-setting';
import { getFormulaModule, mergeVatEngineConfig } from '@/lib/formula-modules';
import { tryAggregateRows, evaluateFormulaSteps } from '@/lib/formula-engine';

type DiffRow = { code: string; label: string; computed: number; actual: number | null; diff: number | null; match: boolean };

export async function GET(request: Request, { params }: { params: Promise<{ moduleKey: string }> }) {
  let conn;
  try {
    await requireAuth();
    const { moduleKey } = await params;
    const mod = getFormulaModule(moduleKey);
    if (!mod?.vatEngine) return NextResponse.json({ error: `โมดูล '${moduleKey}' ไม่มี VAT engine` }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');
    if (!recordId) return NextResponse.json({ error: 'กรุณาระบุ id ของ record' }, { status: 400 });

    const raw = await CompanySettingService.get(mod.vatEngine.settingKey, '');
    let parsed: unknown = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }
    const config = mergeVatEngineConfig(mod, parsed);

    conn = await pool.getConnection();

    if (moduleKey === 'QUOTATION') {
      const quotations = await conn.query('SELECT * FROM quotations WHERE id = ?', [recordId]);
      if (quotations.length === 0) return NextResponse.json({ error: 'ไม่พบใบเสนอราคานี้' }, { status: 404 });
      const quotation = quotations[0];

      const items = await conn.query('SELECT * FROM quotation_items WHERE quotationId = ?', [recordId]);
      const rows = items.map((it: any) => ({
        QTY: Number(it.quantity) || 0,
        UNIT_PRICE: parseFloat(it.unitPrice) || 0,
        AMOUNT: parseFloat(it.amount) || 0,
        HAS_WHT: it.hasWithholdingTax ? 1 : 0,
        IS_VAT: it.vatType === 'VAT' ? 1 : 0,
        IS_INCOME: it.itemType === 'INCOME' ? 1 : 0,
        IS_DISCOUNT: it.itemType === 'DISCOUNT' ? 1 : 0,
      }));

      const aggregateValues: Record<string, number> = {};
      for (const a of config.aggregates) {
        const result = tryAggregateRows(rows, a.valueExpression, a.fn, a.criteriaExpression);
        if (!result.ok) {
          return NextResponse.json({ error: `Aggregate '${a.code}' คำนวณไม่ได้: ${result.error}` }, { status: 400 });
        }
        aggregateValues[a.code] = result.value;
      }

      const initialVariables: Record<string, number> = {
        ...aggregateValues,
        VAT_MODE_INCLUDE: quotation.vatMode === 'INCLUDE' ? 1 : 0,
        HAS_DOC_WHT: quotation.hasWithholdingTax ? 1 : 0,
        VAT_RATE: 0.07,
        DOC_WHT_RATE: 0.03,
      };
      const stepResult = evaluateFormulaSteps(config.steps, initialVariables);
      if (stepResult.error) {
        return NextResponse.json({ error: `สูตรขั้น '${stepResult.error.code}' คำนวณไม่ได้: ${stepResult.error.message}` }, { status: 400 });
      }

      // code (step ผลลัพธ์) → ชื่อคอลัมน์จริงใน quotations เพื่อเทียบ
      const actualColumnByCode: Record<string, string> = {
        VAT_EXEMPT_AMOUNT: 'vatExemptAmount',
        PRE_TAX_AMOUNT: 'preTaxAmount',
        DISCOUNT_AMOUNT: 'discountAmount',
        PRE_VAT_AMOUNT: 'preVatAmount',
        VAT_AMOUNT: 'vatAmount',
        INCLUDE_VAT_AMOUNT: 'includeVatAmount',
        GRAND_TOTAL: 'grandTotal',
        SUBTOTAL: 'subtotal',
        WITHHOLDING_TAX: 'withholdingTax',
        NET_PAYABLE: 'netPayable',
      };

      const diff: DiffRow[] = config.steps.map((s) => {
        const computed = Math.round((stepResult.values[s.code] ?? 0) * 100) / 100;
        const column = actualColumnByCode[s.code];
        const actualRaw = column ? quotation[column] : null;
        const actual = actualRaw !== null && actualRaw !== undefined ? Math.round(parseFloat(actualRaw) * 100) / 100 : null;
        const diffVal = actual !== null ? Math.round((computed - actual) * 100) / 100 : null;
        return { code: s.code, label: s.label, computed, actual, diff: diffVal, match: actual !== null && Math.abs(diffVal ?? 1) < 0.01 };
      });

      return NextResponse.json({ recordId, aggregateValues, diff });
    }

    if (moduleKey === 'INVOICE') {
      const invoices = await conn.query('SELECT * FROM invoices WHERE id = ?', [recordId]);
      if (invoices.length === 0) return NextResponse.json({ error: 'ไม่พบใบแจ้งหนี้นี้' }, { status: 404 });
      const invoice = invoices[0];
      if (!invoice.quotationId) return NextResponse.json({ error: 'ใบแจ้งหนี้นี้ไม่ได้ผูกกับใบเสนอราคา' }, { status: 400 });

      const quotations = await conn.query('SELECT * FROM quotations WHERE id = ?', [invoice.quotationId]);
      if (quotations.length === 0) return NextResponse.json({ error: 'ไม่พบใบเสนอราคาต้นทาง' }, { status: 404 });
      const quotation = quotations[0];

      // ยอดที่เคยออกใบแจ้งหนี้ไปแล้ว "ก่อน" ใบนี้ (ไม่รวมตัวเอง, ไม่รวมที่ถูกยกเลิก)
      const prior = await conn.query(
        `SELECT COALESCE(SUM(grandTotal), 0) as total FROM invoices
         WHERE quotationId = ? AND id != ? AND status NOT IN ('CANCELLED', 'VOIDED') AND createdAt < ?`,
        [invoice.quotationId, recordId, invoice.createdAt]
      );
      const totalInvoiced = parseFloat(prior[0]?.total || 0);

      const initialVariables: Record<string, number> = {
        Q_GRAND_TOTAL: parseFloat(quotation.grandTotal) || 0,
        Q_SUBTOTAL: parseFloat(quotation.subtotal) || 0,
        Q_DISCOUNT_AMOUNT: parseFloat(quotation.discountAmount) || 0,
        Q_VAT_EXEMPT_AMOUNT: parseFloat(quotation.vatExemptAmount) || 0,
        Q_PRE_TAX_AMOUNT: parseFloat(quotation.preTaxAmount) || 0,
        Q_VAT_AMOUNT: parseFloat(quotation.vatAmount) || 0,
        Q_WITHHOLDING_TAX: parseFloat(quotation.withholdingTax) || 0,
        TOTAL_INVOICED: totalInvoiced,
      };
      const stepResult = evaluateFormulaSteps(config.steps, initialVariables);
      if (stepResult.error) {
        return NextResponse.json({ error: `สูตรขั้น '${stepResult.error.code}' คำนวณไม่ได้: ${stepResult.error.message}` }, { status: 400 });
      }

      const actualColumnByCode: Record<string, string> = {
        GRAND_TOTAL: 'grandTotal',
        SUBTOTAL: 'subtotal',
        DISCOUNT_AMOUNT: 'discountAmount',
        VAT_EXEMPT_AMOUNT: 'vatExemptAmount',
        PRE_TAX_AMOUNT: 'preTaxAmount',
        VAT_AMOUNT: 'vatAmount',
        WITHHOLDING_TAX: 'withholdingTax',
      };

      const diff: DiffRow[] = config.steps.map((s) => {
        const computed = Math.round((stepResult.values[s.code] ?? 0) * 100) / 100;
        const column = actualColumnByCode[s.code];
        const actualRaw = column ? invoice[column] : null;
        const actual = actualRaw !== null && actualRaw !== undefined ? Math.round(parseFloat(actualRaw) * 100) / 100 : null;
        const diffVal = actual !== null ? Math.round((computed - actual) * 100) / 100 : null;
        return { code: s.code, label: s.label, computed, actual, diff: diffVal, match: actual !== null && Math.abs(diffVal ?? 1) < 0.01 };
      });

      return NextResponse.json({ recordId, aggregateValues: { TOTAL_INVOICED: totalInvoiced }, diff });
    }

    return NextResponse.json({ error: `โมดูล '${moduleKey}' ยังไม่รองรับการทดสอบเทียบ` }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error verifying vat-engine config:', error);
    return NextResponse.json({ error: 'Failed to verify', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
