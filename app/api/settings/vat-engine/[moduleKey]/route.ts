// app/api/settings/vat-engine/[moduleKey]/route.ts
// CRUD สำหรับสูตร "VAT engine" (aggregate ต่อแถว + ลำดับสูตรระดับเอกสาร) ต่อโมดูล —
// เก็บแยกจาก formula_config_* (สูตรกำไรสุทธิ) เสมอ ผ่าน module.vatEngine.settingKey
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { CompanySettingService } from '@/lib/services/company-setting';
import { getFormulaModule, mergeVatEngineConfig } from '@/lib/formula-modules';
import { tryEvaluateFormula, evaluateFormulaSteps } from '@/lib/formula-engine';

export async function GET(_request: Request, { params }: { params: Promise<{ moduleKey: string }> }) {
  try {
    await requireAuth();
    const { moduleKey } = await params;
    const mod = getFormulaModule(moduleKey);
    if (!mod?.vatEngine) return NextResponse.json({ error: `โมดูล '${moduleKey}' ไม่มี VAT engine` }, { status: 404 });

    const raw = await CompanySettingService.get(mod.vatEngine.settingKey, '');
    let parsed: unknown = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }
    const config = mergeVatEngineConfig(mod, parsed);
    return NextResponse.json({ ...config, module: { key: mod.key, label: mod.label, rowVariables: mod.vatEngine.rowVariables, documentVariables: mod.vatEngine.documentVariables } });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching vat-engine config:', error);
    return NextResponse.json({ error: 'Failed to fetch vat-engine config' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ moduleKey: string }> }) {
  try {
    await requireAuth();
    const { moduleKey } = await params;
    const mod = getFormulaModule(moduleKey);
    if (!mod?.vatEngine) return NextResponse.json({ error: `โมดูล '${moduleKey}' ไม่มี VAT engine` }, { status: 404 });

    const body = await request.json();
    const aggregates = Array.isArray(body.aggregates) ? body.aggregates : [];
    const steps = Array.isArray(body.steps) ? body.steps : [];

    // Validate: every aggregate's value/criteria expression must parse against dummy row vars,
    // and running the full step pipeline (with dummy aggregates+doc vars) must not error out.
    const dummyRow = Object.fromEntries((mod.vatEngine.rowVariables || []).map((v) => [v.code, 1]));
    for (const a of aggregates) {
      const valueCheck = tryEvaluateFormula(a.valueExpression, dummyRow);
      if (!valueCheck.ok) {
        return NextResponse.json({ error: `Aggregate '${a.code}' ผิดพลาด: ${valueCheck.error}` }, { status: 400 });
      }
      if (a.criteriaExpression) {
        const critCheck = tryEvaluateFormula(a.criteriaExpression, dummyRow);
        if (!critCheck.ok) {
          return NextResponse.json({ error: `เงื่อนไขของ Aggregate '${a.code}' ผิดพลาด: ${critCheck.error}` }, { status: 400 });
        }
      }
    }

    const dummyInitial: Record<string, number> = {
      ...Object.fromEntries((mod.vatEngine.documentVariables || []).map((v) => [v.code, 1])),
      ...Object.fromEntries(aggregates.map((a: { code: string }) => [a.code, 1])),
    };
    const stepResult = evaluateFormulaSteps(steps, dummyInitial);
    if (stepResult.error) {
      return NextResponse.json({ error: `สูตรขั้น '${stepResult.error.code}' ผิดพลาด: ${stepResult.error.message}` }, { status: 400 });
    }

    const config = { aggregates, steps };
    await CompanySettingService.set(mod.vatEngine.settingKey, JSON.stringify(config));
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error saving vat-engine config:', error);
    return NextResponse.json({ error: 'Failed to save vat-engine config' }, { status: 500 });
  }
}
