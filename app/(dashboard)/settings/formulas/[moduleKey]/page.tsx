'use client';

// app/(dashboard)/settings/formulas/[moduleKey]/page.tsx
// หน้าเดียวสำหรับสูตรทั้งหมดของโมดูล (กำไรสุทธิ + VAT engine ถ้ามี) — แสดงเป็น
// "รายการ" กดแถวไหนเปิด Modal แก้เฉพาะสูตรนั้น พร้อมแผงตัวแปรที่ใช้ได้โชว์ตลอด
// ไม่ต้องสลับหน้าไปมาเพื่อดูชื่อตัวแปรเหมือนเดิม (ก่อนหน้านี้แยกเป็น /vat-engine
// คนละหน้า ทำให้งงว่าต้องกลับไปดูชื่อตัวแปรที่หน้าไหน)

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Loader2, Save, Search, CheckCircle2, XCircle, ChevronRight, Sigma, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { getFormulaModule } from '@/lib/formula-modules';
import { tryEvaluateFormula } from '@/lib/formula-engine';
import type { FormulaVariable } from '@/lib/formula-engine';

const FUNCTION_SNIPPETS: { label: string; insert: string }[] = [
  { label: 'IF(...)', insert: 'IF(condition, valueIfTrue, valueIfFalse)' },
  { label: 'ROUND(...)', insert: 'ROUND(value, 2)' },
  { label: 'ABS(...)', insert: 'ABS(value)' },
  { label: 'MIN(...)', insert: 'MIN(a, b)' },
  { label: 'MAX(...)', insert: 'MAX(a, b)' },
  { label: 'SUM(...)', insert: 'SUM(a, b)' },
];

type AggregateRow = { code: string; label: string; fn: string; valueExpression: string; criteriaExpression?: string };
type StepRow = { code: string; label: string; expression: string };
type DiffRow = { code: string; label: string; computed: number; actual: number | null; diff: number | null; match: boolean };
type ModalState = { type: 'profit' } | { type: 'aggregate'; index: number } | { type: 'step'; index: number } | null;

// ── ช่องพิมพ์สูตร + ปุ่มแทรกตัวแปร/ฟังก์ชัน + ค่าทดสอบแก้ได้ + preview ผลลัพธ์ (ใช้ซ้ำในทุก Modal) ──
function ExpressionEditor({
  value, onChange, variables, sampleValues, onSampleValuesChange,
}: {
  value: string;
  onChange: (v: string) => void;
  variables: FormulaVariable[];
  sampleValues: Record<string, number>;
  onSampleValuesChange: (next: Record<string, number>) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPosRef = useRef<number | null>(null);

  const insertAtCursor = (text: string) => {
    onChange(
      (() => {
        const prev = value;
        const rawPos = cursorPosRef.current;
        const pos = rawPos === null ? prev.length : Math.min(Math.max(rawPos, 0), prev.length);
        const next = prev.slice(0, pos) + text + prev.slice(pos);
        const newPos = pos + text.length;
        cursorPosRef.current = newPos;
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (el) { el.focus(); el.setSelectionRange(newPos, newPos); }
        });
        return next;
      })()
    );
  };

  const preview = tryEvaluateFormula(value, sampleValues);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => { onChange(e.target.value); cursorPosRef.current = e.target.selectionStart; }}
            onSelect={(e) => { cursorPosRef.current = e.currentTarget.selectionStart; }}
            onClick={(e) => { cursorPosRef.current = e.currentTarget.selectionStart; }}
            onKeyUp={(e) => { cursorPosRef.current = e.currentTarget.selectionStart; }}
            rows={3}
            spellCheck={false}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:border-blue-400 outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {FUNCTION_SNIPPETS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => insertAtCursor(f.insert)}
                className="px-2 py-1 text-xs font-mono bg-gray-100 hover:bg-gray-200 rounded border border-gray-200"
              >
                {f.label}
              </button>
            ))}
          </div>
          {preview.ok ? (
            <div className="text-sm bg-green-50 border border-green-200 rounded-lg p-2.5 text-green-800">
              ผลลัพธ์ตัวอย่าง: <strong>{preview.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          ) : (
            <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2.5 text-red-700">{preview.error}</div>
          )}
        </div>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          <p className="text-[11px] text-gray-400">กดชื่อเพื่อแทรก, กรอกค่าทดสอบด้านขวาเพื่อดูผลลัพธ์</p>
          {variables.map((v) => (
            <div key={v.code} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300">
              <button
                type="button"
                onClick={() => insertAtCursor(`\${${v.code}}`)}
                className="flex-1 min-w-0 text-left hover:bg-blue-50 rounded"
              >
                <span className="block text-xs font-mono text-blue-700 truncate">${'{'}{v.code}{'}'}</span>
                <span className="block text-[11px] text-gray-500 truncate">{v.label}</span>
              </button>
              <input
                type="number"
                value={sampleValues[v.code] ?? 0}
                onChange={(e) => onSampleValuesChange({ ...sampleValues, [v.code]: parseFloat(e.target.value) || 0 })}
                className="w-16 shrink-0 border border-gray-200 rounded px-1 py-1 text-xs text-right"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── รายการแบบแถว กดแล้วเปิด Modal ──
function ListRow({ title, subtitle, code, onClick }: { title: string; subtitle?: string; code: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
    >
      <div className="min-w-0">
        <p className="font-medium text-sm text-gray-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-gray-500 font-mono truncate">{subtitle}</p>}
      </div>
      <span className="flex items-center gap-2 shrink-0">
        <span className="font-mono text-[11px] text-blue-700">${'{'}{code}{'}'}</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </span>
    </button>
  );
}

export default function FormulaModuleSettingsPage({ params }: { params: Promise<{ moduleKey: string }> }) {
  const { moduleKey } = use(params);
  const mod = getFormulaModule(moduleKey);

  const [loading, setLoading] = useState(true);
  const [profitExpression, setProfitExpression] = useState(mod?.defaultExpression ?? '');
  const [aggregates, setAggregates] = useState<AggregateRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState('');

  const [recordId, setRecordId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [diff, setDiff] = useState<DiffRow[] | null>(null);

  useEffect(() => {
    if (!mod) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const requests: Promise<void>[] = [
        fetch(`/api/settings/formulas/${moduleKey}`).then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (typeof data.expression === 'string' && data.expression.trim()) setProfitExpression(data.expression);
          }
        }),
      ];
      if (mod?.vatEngine) {
        requests.push(
          fetch(`/api/settings/vat-engine/${moduleKey}`).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              setAggregates(data.aggregates || []);
              setSteps(data.steps || []);
            }
          })
        );
      }
      await Promise.all(requests);
    } catch (e) {
      console.error('Error loading formula config:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!mod) {
    return (
      <div className="space-y-4">
        <Link href="/settings/formulas" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </Link>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          ไม่พบโมดูล &apos;{moduleKey}&apos;
        </div>
      </div>
    );
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const saveProfit = async (expression: string) => {
    const res = await fetch(`/api/settings/formulas/${moduleKey}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expression }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, error: data.error || 'บันทึกไม่สำเร็จ' };
    setProfitExpression(data.expression || expression);
    return { ok: true as const };
  };

  const saveVatEngine = async (nextAggregates: AggregateRow[], nextSteps: StepRow[]) => {
    const res = await fetch(`/api/settings/vat-engine/${moduleKey}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aggregates: nextAggregates, steps: nextSteps }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, error: data.error || 'บันทึกไม่สำเร็จ' };
    setAggregates(data.aggregates || nextAggregates);
    setSteps(data.steps || nextSteps);
    return { ok: true as const };
  };

  const handleVerify = async () => {
    if (!recordId.trim()) return;
    setVerifying(true);
    setVerifyError('');
    setDiff(null);
    try {
      const res = await fetch(`/api/settings/vat-engine/${moduleKey}/verify?id=${encodeURIComponent(recordId.trim())}`);
      const data = await res.json();
      if (res.ok) setDiff(data.diff || []);
      else setVerifyError(data.error || 'ทดสอบไม่สำเร็จ');
    } catch (e) {
      console.error('Error verifying vat-engine config:', e);
      setVerifyError('ทดสอบไม่สำเร็จ');
    } finally {
      setVerifying(false);
    }
  };

  const fmt = (n: number | null) => (n === null ? '-' : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  // ตัวแปรทั้งหมดที่มีในโมดูลนี้ (โชว์เป็นแผงอ้างอิงตลอดหน้า ไม่ต้องสลับหน้าไปดู)
  // dedupe ด้วย code — บาง code ซ้ำข้ามชั้นได้ (เช่น WITHHOLDING_TAX เป็นทั้งตัวแปร
  // กำไรสุทธิ และชื่อ step ผลลัพธ์ของ VAT engine) เก็บตัวแรกที่เจอไว้พอ
  const allVariablesRaw: FormulaVariable[] = [
    ...mod.variables,
    ...(mod.vatEngine?.rowVariables || []),
    ...(mod.vatEngine?.documentVariables || []),
    ...aggregates.map((a) => ({ code: a.code, label: a.label, description: `Aggregate (${a.fn})` })),
    ...steps.map((s) => ({ code: s.code, label: s.label, description: 'ผลลัพธ์ขั้นก่อนหน้า' })),
  ];
  const allVariables = Array.from(new Map(allVariablesRaw.map((v) => [v.code, v])).values());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings/formulas" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            สูตรคำนวณ — {mod.label}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">กดรายการเพื่อแก้สูตรนั้นๆ — ดูชื่อตัวแปรทั้งหมดได้ในแผงขวามือตลอดเวลา</p>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <strong>สูตรของโมดูลนี้ถูกใช้ที่หน้า/ฟอร์ม:</strong>
        <ul className="list-disc list-inside mt-1 space-y-0.5">
          {mod.usedIn.map((u) => (
            <li key={u.path}>{u.page} <span className="font-mono text-gray-400">({u.path})</span></li>
          ))}
        </ul>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลด...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><h3 className="font-semibold text-gray-900">กำไรสุทธิ</h3></CardHeader>
              <CardContent>
                <ListRow title="สูตรกำไรสุทธิ" subtitle={profitExpression} code="NET_PROFIT" onClick={() => setModal({ type: 'profit' })} />
              </CardContent>
            </Card>

            {mod.vatEngine && (
              <>
                {mod.vatEngine.rowVariables && aggregates.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Sigma className="w-4 h-4" /> Aggregate ต่อแถว</h3>
                      <p className="text-xs text-gray-500 mt-1">รวมยอดจากรายการสินค้า (เช่น รายการที่ติ๊ก VAT) ก่อนนำไปคำนวณระดับเอกสาร</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {aggregates.map((a, idx) => (
                        <ListRow key={a.code} title={a.label} subtitle={`${a.fn}(${a.valueExpression})`} code={a.code} onClick={() => setModal({ type: 'aggregate', index: idx })} />
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ListOrdered className="w-4 h-4" /> ลำดับสูตรระดับเอกสาร</h3>
                    <p className="text-xs text-gray-500 mt-1">รันตามลำดับ แต่ละขั้นอ้างอิงผลลัพธ์ของขั้นก่อนหน้าได้</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {steps.map((s, idx) => (
                      <ListRow key={s.code} title={`${idx + 1}. ${s.label}`} subtitle={s.expression} code={s.code} onClick={() => setModal({ type: 'step', index: idx })} />
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><h3 className="font-semibold text-gray-900">ทดสอบเทียบของจริง</h3></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 max-w-xs">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {moduleKey === 'QUOTATION' ? 'เลข ID ใบเสนอราคา' : 'เลข ID ใบแจ้งหนี้'}
                        </label>
                        <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} placeholder="เช่น 123" />
                      </div>
                      <Button onClick={handleVerify} disabled={verifying || !recordId.trim()}>
                        <Search className="w-4 h-4 mr-2" />
                        {verifying ? 'กำลังตรวจ...' : 'เปรียบเทียบ'}
                      </Button>
                    </div>
                    {verifyError && <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">{verifyError}</div>}
                    {diff && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 text-left">
                              <th className="px-3 py-2 font-medium">ฟิลด์</th>
                              <th className="px-3 py-2 font-medium text-right">สูตรใหม่คำนวณได้</th>
                              <th className="px-3 py-2 font-medium text-right">ค่าจริงในระบบ</th>
                              <th className="px-3 py-2 font-medium text-right">ผลต่าง</th>
                              <th className="px-3 py-2 font-medium text-center">ตรงกัน?</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {diff.map((d) => (
                              <tr key={d.code} className={!d.match ? 'bg-red-50' : ''}>
                                <td className="px-3 py-2">{d.label} <span className="text-xs text-gray-400 font-mono">${'{'}{d.code}{'}'}</span></td>
                                <td className="px-3 py-2 text-right font-mono">{fmt(d.computed)}</td>
                                <td className="px-3 py-2 text-right font-mono">{fmt(d.actual)}</td>
                                <td className="px-3 py-2 text-right font-mono">{fmt(d.diff)}</td>
                                <td className="px-3 py-2 text-center">
                                  {d.match ? <CheckCircle2 className="w-4 h-4 text-green-600 inline" /> : <XCircle className="w-4 h-4 text-red-600 inline" />}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* แผงตัวแปรอ้างอิง — โชว์ตลอด ไม่ต้องสลับหน้าไปดู */}
          <div className="space-y-4">
            <Card className="lg:sticky lg:top-4">
              <CardHeader><h3 className="font-semibold text-gray-900">ตัวแปรทั้งหมดของโมดูลนี้</h3></CardHeader>
              <CardContent className="space-y-1.5 max-h-[70vh] overflow-y-auto">
                {allVariables.map((v) => (
                  <div key={v.code} className="px-2.5 py-1.5 rounded-lg border border-gray-100 bg-gray-50">
                    <p className="font-mono text-xs text-blue-700">${'{'}{v.code}{'}'}</p>
                    <p className="text-[11px] text-gray-500">{v.label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">{toast}</div>}

      {/* ── Modal: แก้สูตรกำไรสุทธิ ── */}
      <Modal isOpen={modal?.type === 'profit'} onClose={() => setModal(null)} title="แก้ไขสูตรกำไรสุทธิ" size="lg">
        {modal?.type === 'profit' && (
          <ProfitModalBody
            initial={profitExpression}
            variables={mod.variables}
            onCancel={() => setModal(null)}
            onSave={async (expr) => {
              const result = await saveProfit(expr);
              if (result.ok) { showToast('บันทึกแล้ว'); setModal(null); }
              return result;
            }}
          />
        )}
      </Modal>

      {/* ── Modal: แก้ Aggregate ── */}
      <Modal isOpen={modal?.type === 'aggregate'} onClose={() => setModal(null)} title="แก้ไข Aggregate" size="lg">
        {modal?.type === 'aggregate' && mod.vatEngine && (
          <AggregateModalBody
            initial={aggregates[modal.index]}
            rowVariables={mod.vatEngine.rowVariables || []}
            onCancel={() => setModal(null)}
            onSave={async (updated) => {
              const next = aggregates.map((a, i) => (i === modal.index ? updated : a));
              const result = await saveVatEngine(next, steps);
              if (result.ok) { showToast('บันทึกแล้ว'); setModal(null); }
              return result;
            }}
          />
        )}
      </Modal>

      {/* ── Modal: แก้สูตรขั้น ── */}
      <Modal isOpen={modal?.type === 'step'} onClose={() => setModal(null)} title="แก้ไขสูตรขั้น" size="lg">
        {modal?.type === 'step' && mod.vatEngine && (
          <StepModalBody
            initial={steps[modal.index]}
            variables={[
              ...(mod.vatEngine.documentVariables || []),
              ...aggregates.map((a) => ({ code: a.code, label: a.label })),
              ...steps.filter((_, i) => i !== modal.index).map((s) => ({ code: s.code, label: s.label })),
            ]}
            onCancel={() => setModal(null)}
            onSave={async (updated) => {
              const next = steps.map((s, i) => (i === modal.index ? updated : s));
              const result = await saveVatEngine(aggregates, next);
              if (result.ok) { showToast('บันทึกแล้ว'); setModal(null); }
              return result;
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function ProfitModalBody({
  initial, variables, onSave, onCancel,
}: {
  initial: string;
  variables: FormulaVariable[];
  onSave: (expr: string) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [expr, setExpr] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sampleValues, setSampleValues] = useState<Record<string, number>>(
    Object.fromEntries(variables.map((v) => [v.code, 0]))
  );

  return (
    <div className="space-y-4">
      <ExpressionEditor value={expr} onChange={setExpr} variables={variables} sampleValues={sampleValues} onSampleValuesChange={setSampleValues} />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>ยกเลิก</Button>
        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError('');
            const result = await onSave(expr);
            if (!result.ok) setError(result.error || 'บันทึกไม่สำเร็จ');
            setSaving(false);
          }}
        >
          <Save className="w-4 h-4 mr-2" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </div>
  );
}

function AggregateModalBody({
  initial, rowVariables, onSave, onCancel,
}: {
  initial: AggregateRow;
  rowVariables: FormulaVariable[];
  onSave: (updated: AggregateRow) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [row, setRow] = useState<AggregateRow>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sampleValues, setSampleValues] = useState<Record<string, number>>(
    Object.fromEntries(rowVariables.map((v) => [v.code, 1]))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input value={row.label} onChange={(e) => setRow((r) => ({ ...r, label: e.target.value }))} className="flex-1" />
        <select value={row.fn} onChange={(e) => setRow((r) => ({ ...r, fn: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm">
          {['SUM', 'AVG', 'MAX', 'MIN', 'COUNT'].map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">สูตรค่าต่อแถว (value)</p>
        <ExpressionEditor value={row.valueExpression} onChange={(v) => setRow((r) => ({ ...r, valueExpression: v }))} variables={rowVariables} sampleValues={sampleValues} onSampleValuesChange={setSampleValues} />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">เงื่อนไขกรองแถว (criteria, ว่าง = ทุกแถว)</p>
        <ExpressionEditor value={row.criteriaExpression || ''} onChange={(v) => setRow((r) => ({ ...r, criteriaExpression: v }))} variables={rowVariables} sampleValues={sampleValues} onSampleValuesChange={setSampleValues} />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>ยกเลิก</Button>
        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError('');
            const result = await onSave(row);
            if (!result.ok) setError(result.error || 'บันทึกไม่สำเร็จ');
            setSaving(false);
          }}
        >
          <Save className="w-4 h-4 mr-2" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </div>
  );
}

function StepModalBody({
  initial, variables, onSave, onCancel,
}: {
  initial: StepRow;
  variables: FormulaVariable[];
  onSave: (updated: StepRow) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [row, setRow] = useState<StepRow>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sampleValues, setSampleValues] = useState<Record<string, number>>(
    Object.fromEntries(variables.map((v) => [v.code, 1]))
  );

  return (
    <div className="space-y-4">
      <Input value={row.label} onChange={(e) => setRow((r) => ({ ...r, label: e.target.value }))} />
      <ExpressionEditor value={row.expression} onChange={(v) => setRow((r) => ({ ...r, expression: v }))} variables={variables} sampleValues={sampleValues} onSampleValuesChange={setSampleValues} />
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onCancel}>ยกเลิก</Button>
        <Button
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError('');
            const result = await onSave(row);
            if (!result.ok) setError(result.error || 'บันทึกไม่สำเร็จ');
            setSaving(false);
          }}
        >
          <Save className="w-4 h-4 mr-2" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </div>
  );
}
