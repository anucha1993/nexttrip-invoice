// app/api/settings/formulas/[moduleKey]/route.ts
// สูตรคำนวณของ "โมดูล" เอกสารแต่ละประเภท (ใบเสนอราคา, ใบแจ้งหนี้, ...) — ดู
// รายชื่อโมดูล/ฟิลด์ที่มีจริงได้ที่ lib/formula-modules.ts เก็บค่าใน
// company_settings ตาม module.settingKey ผ่าน CompanySettingService (ไม่ต้อง
// migration ใหม่ เพิ่มโมดูลก็ไม่ต้องแก้ route นี้)
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CompanySettingService } from '@/lib/services/company-setting';
import { getFormulaModule } from '@/lib/formula-modules';
import { tryEvaluateFormula } from '@/lib/formula-engine';

export async function GET(_request: Request, { params }: { params: Promise<{ moduleKey: string }> }) {
  try {
    await requireAuth();
    const { moduleKey } = await params;
    const mod = getFormulaModule(moduleKey);
    if (!mod) return NextResponse.json({ error: `ไม่พบโมดูล '${moduleKey}'` }, { status: 404 });

    const raw = await CompanySettingService.get(mod.settingKey, '');
    let expression = mod.defaultExpression;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.expression === 'string' && parsed.expression.trim()) {
          expression = parsed.expression;
        }
      } catch {
        // ignore malformed stored value, fall back to default
      }
    } else if (moduleKey === 'QUOTATION') {
      // One-time migration: this module used to be stored under the old
      // standalone 'profit_formula_config' key before the multi-module
      // rework — carry over whatever was saved there instead of resetting.
      const legacy = await migrateLegacyQuotationFormula();
      if (legacy) {
        expression = legacy;
        await CompanySettingService.set(mod.settingKey, JSON.stringify({ expression }));
      }
    }

    return NextResponse.json({ expression, module: mod });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching formula config:', error);
    return NextResponse.json({ error: 'Failed to fetch formula config' }, { status: 500 });
  }
}

async function migrateLegacyQuotationFormula(): Promise<string | null> {
  const raw = await CompanySettingService.get('profit_formula_config', '');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.expression === 'string' && parsed.expression.trim()) {
      return parsed.expression;
    }
    if (Array.isArray(parsed?.items)) {
      const enabled = parsed.items
        .filter((it: any) => it?.enabled)
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      let expr = '${SALE_TOTAL}';
      for (const it of enabled) expr += (it.sign === 'ADD' ? '+' : '-') + `\${${it.key}}`;
      return expr;
    }
  } catch {
    // fall through
  }
  return null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ moduleKey: string }> }) {
  try {
    await requireAuth();
    const { moduleKey } = await params;
    const mod = getFormulaModule(moduleKey);
    if (!mod) return NextResponse.json({ error: `ไม่พบโมดูล '${moduleKey}'` }, { status: 404 });

    const body = await request.json();
    const expression = typeof body.expression === 'string' ? body.expression.trim() : '';
    if (!expression) {
      return NextResponse.json({ error: 'กรุณาระบุสูตรคำนวณ' }, { status: 400 });
    }

    // Validate against dummy values for every variable this module declares, so an
    // unknown ${CODE} or a syntax error is caught before saving.
    const dummyValues = Object.fromEntries(mod.variables.map((v) => [v.code, 1]));
    const check = tryEvaluateFormula(expression, dummyValues);
    if (!check.ok) {
      return NextResponse.json({ error: `สูตรไม่ถูกต้อง: ${check.error}` }, { status: 400 });
    }

    await CompanySettingService.set(mod.settingKey, JSON.stringify({ expression }));
    return NextResponse.json({ expression, module: mod });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error saving formula config:', error);
    return NextResponse.json({ error: 'Failed to save formula config' }, { status: 500 });
  }
}
