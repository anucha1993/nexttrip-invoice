// lib/formula-modules.ts
// Central registry of every document type ("module") that has a configurable
// formula, plus the real fields ("variables") each module exposes. Single
// place to answer "สูตรไหนใช้ที่ไหน" and "ฟิลด์มาจากไหน": every module lists its
// own settings key, used-in page, and variable list — fields are developer-
// defined from real DB/computed values (no custom-field builder, per product
// decision: keep the field list = what actually exists in the system).
//
// Adding a new module later = add ONE entry here (+ feed its variable values
// from that document's own tab/page, same pattern as ProfitTab does for
// QUOTATION below) — the settings UI/API are 100% generic over
// FORMULA_MODULES, nothing else needs to change.

import type { AggregateFn, FormulaVariable } from './formula-engine';

export type FormulaModuleKey = 'QUOTATION' | 'INVOICE';

export type FormulaModule = {
  key: FormulaModuleKey;
  label: string;
  settingKey: string; // company_settings key this module's PROFIT expression is stored under
  defaultExpression: string;
  variables: FormulaVariable[];
  usedIn: { page: string; path: string }[];
  /** VAT-engine layer (optional): only modules with their own line-item math define this. */
  vatEngine?: VatEngineDefinition;
};

// ── VAT engine (Layer 1+2+3: row formula → aggregate → ordered document steps) ──
// Separate from the `variables`/`defaultExpression` above (which only power the
// existing single-expression "กำไรสุทธิ" formula). This layer re-derives the
// actual invoice math (VAT/withholding tax/grand total) from raw line items so
// it can be verified side-by-side against the live hardcoded calculation in
// components/quotations/quotation-form.tsx BEFORE anything switches over to it.

export type AggregateDefinition = {
  code: string;
  label: string;
  fn: AggregateFn;
  valueExpression: string; // per-row formula, e.g. ${AMOUNT}*IF(${HAS_WHT}==1,1.03,1)
  criteriaExpression?: string; // per-row boolean filter, e.g. ${IS_INCOME}==1 && ${IS_VAT}==1
};

export type FormulaStepConfig = { code: string; label: string; expression: string };

export type VatEngineDefinition = {
  settingKey: string; // separate company_settings key (never shares storage with the profit formula)
  /** Fields available per line item, used inside aggregate expressions (only if the module has line items). */
  rowVariables?: FormulaVariable[];
  /** Aggregates computed from rows BEFORE the document steps run (their `code` becomes an extra input variable). */
  defaultAggregates?: AggregateDefinition[];
  /** Flat document-level inputs fed straight from the record (toggles, rates, other-tab totals). */
  documentVariables: FormulaVariable[];
  /** Ordered, named outputs — each can reference documentVariables + aggregates + any EARLIER step's code. */
  defaultSteps: FormulaStepConfig[];
};

export const FORMULA_MODULES: Record<FormulaModuleKey, FormulaModule> = {
  QUOTATION: {
    key: 'QUOTATION',
    label: 'ใบเสนอราคา',
    settingKey: 'formula_config_quotation',
    defaultExpression: '${SALE_TOTAL}-${WHOLESALE_COST}-${GENERAL_COST}',
    variables: [
      { code: 'SALE_TOTAL', label: 'รายได้จากลูกค้า (ยอดใบเสนอราคา)', description: 'quotation.grandTotal' },
      { code: 'WHOLESALE_COST', label: 'ต้นทุนโฮลเซลล์รวม', description: 'ผลรวมจากแท็บต้นทุนโฮลเซลล์' },
      { code: 'GENERAL_COST', label: 'ต้นทุนทั่วไปรวม', description: 'ผลรวมจากแท็บต้นทุนทั่วไป' },
      { code: 'COMMISSION', label: 'ค่าคอมมิชชั่นพนักงานขาย', description: 'quotation.commission' },
      { code: 'WITHHOLDING_TAX', label: 'ภาษีหัก ณ ที่จ่าย (ลูกค้าหักไว้)', description: 'quotation.withholdingTax' },
      // ตัวแปรเพิ่มเติม — ตรงกับช่อง "สรุปยอด" ในหน้าแก้ไขใบเสนอราคา (/quotations/[id]/edit)
      { code: 'SUBTOTAL', label: 'ยอดรวมก่อนส่วนลด/ภาษี', description: 'quotation.subtotal' },
      { code: 'DISCOUNT_AMOUNT', label: 'ส่วนลด', description: 'quotation.discountAmount' },
      { code: 'VAT_EXEMPT_AMOUNT', label: 'ยอดรวมยกเว้นภาษี (Vat-Exempted)', description: 'quotation.vatExemptAmount' },
      { code: 'PRE_TAX_AMOUNT', label: 'ราคาสุทธิสินค้าที่เสียภาษี (Pre-Tax)', description: 'quotation.preTaxAmount' },
      { code: 'PRE_VAT_AMOUNT', label: 'ราคาก่อนภาษีมูลค่าเพิ่ม (Pre-VAT)', description: 'quotation.preVatAmount' },
      { code: 'VAT_AMOUNT', label: 'ภาษีมูลค่าเพิ่ม VAT 7%', description: 'quotation.vatAmount' },
      { code: 'INCLUDE_VAT_AMOUNT', label: 'ราคารวมภาษีมูลค่าเพิ่ม (Include VAT)', description: 'quotation.includeVatAmount' },
      { code: 'NET_PAYABLE', label: 'ยอดสุทธิที่ต้องชำระ (หลังหักภาษี ณ ที่จ่าย)', description: 'quotation.netPayable' },
    ],
    usedIn: [
      { page: 'ใบเสนอราคา (Quotation Dashboard) → แท็บ "สรุปกำไร-ขาดทุน"', path: '/quotations/[id]/dashboard' },
    ],
    vatEngine: {
      settingKey: 'vat_engine_config_quotation',
      rowVariables: [
        { code: 'QTY', label: 'จำนวน', description: 'quotation_items.quantity' },
        { code: 'UNIT_PRICE', label: 'ราคา/หน่วย', description: 'quotation_items.unitPrice' },
        { code: 'AMOUNT', label: 'รวม (ต่อแถว)', description: 'quotation_items.amount' },
        { code: 'HAS_WHT', label: 'ติ๊ก "3%" (หัก ณ ที่จ่ายต่อแถว)', description: 'quotation_items.hasWithholdingTax ? 1 : 0' },
        { code: 'IS_VAT', label: 'ติ๊ก "Vat"', description: "quotation_items.vatType === 'VAT' ? 1 : 0" },
        { code: 'IS_INCOME', label: 'เป็นแถวรายได้', description: "quotation_items.itemType === 'INCOME' ? 1 : 0" },
        { code: 'IS_DISCOUNT', label: 'เป็นแถวส่วนลด', description: "quotation_items.itemType === 'DISCOUNT' ? 1 : 0" },
      ],
      defaultAggregates: [
        {
          code: 'SUM_VAT_INCOME', label: 'ยอดรวมแถวรายได้ที่ติ๊ก VAT', fn: 'SUM',
          valueExpression: '${AMOUNT}*IF(${HAS_WHT}==1,1.03,1)',
          criteriaExpression: '${IS_INCOME}==1 && ${IS_VAT}==1',
        },
        {
          code: 'SUM_NONVAT_INCOME', label: 'ยอดรวมแถวรายได้ที่ไม่ติ๊ก VAT', fn: 'SUM',
          valueExpression: '${AMOUNT}*IF(${HAS_WHT}==1,1.03,1)',
          criteriaExpression: '${IS_INCOME}==1 && ${IS_VAT}==0',
        },
        {
          code: 'SUM_DISCOUNT', label: 'ยอดรวมส่วนลด', fn: 'SUM',
          valueExpression: '${AMOUNT}',
          criteriaExpression: '${IS_DISCOUNT}==1',
        },
      ],
      documentVariables: [
        { code: 'VAT_MODE_INCLUDE', label: 'โหมด VAT Include (1) / Exclude (0)', description: "quotation.vatMode === 'INCLUDE' ? 1 : 0" },
        { code: 'HAS_DOC_WHT', label: 'ติ๊กหัก ณ ที่จ่าย 3% ระดับเอกสาร', description: 'quotation.hasWithholdingTax ? 1 : 0' },
        { code: 'VAT_RATE', label: 'อัตรา VAT', description: 'ค่าคงที่ 0.07 (ปรับได้)' },
        { code: 'DOC_WHT_RATE', label: 'อัตราหัก ณ ที่จ่ายระดับเอกสาร', description: 'ค่าคงที่ 0.03 (ปรับได้)' },
      ],
      defaultSteps: [
        { code: 'VAT_EXEMPT_AMOUNT', label: 'ยอดรวมยกเว้นภาษี', expression: '${SUM_NONVAT_INCOME}' },
        { code: 'PRE_TAX_AMOUNT', label: 'ราคาสุทธิสินค้าที่เสียภาษี', expression: '${SUM_VAT_INCOME}' },
        { code: 'DISCOUNT_AMOUNT', label: 'ส่วนลด', expression: '${SUM_DISCOUNT}' },
        {
          code: 'PRE_VAT_AMOUNT', label: 'ราคาก่อนภาษีมูลค่าเพิ่ม',
          expression: 'IF(${PRE_TAX_AMOUNT}==0,0,IF(${VAT_MODE_INCLUDE}==1,(${PRE_TAX_AMOUNT}-${DISCOUNT_AMOUNT})*100/107,IF(${DISCOUNT_AMOUNT}<${PRE_TAX_AMOUNT},${PRE_TAX_AMOUNT}-${DISCOUNT_AMOUNT},0)))',
        },
        { code: 'VAT_AMOUNT', label: 'ภาษีมูลค่าเพิ่ม', expression: '${PRE_VAT_AMOUNT}*${VAT_RATE}' },
        { code: 'INCLUDE_VAT_AMOUNT', label: 'ราคารวมภาษีมูลค่าเพิ่ม', expression: '${PRE_VAT_AMOUNT}+${VAT_AMOUNT}' },
        {
          code: 'GRAND_TOTAL', label: 'จำนวนเงินรวมทั้งสิ้น',
          expression: 'IF(${PRE_TAX_AMOUNT}==0,${VAT_EXEMPT_AMOUNT}-${DISCOUNT_AMOUNT},${VAT_EXEMPT_AMOUNT}+${INCLUDE_VAT_AMOUNT})',
        },
        { code: 'SUBTOTAL', label: 'ยอดรวมก่อนส่วนลด/ภาษี', expression: '${PRE_TAX_AMOUNT}+${VAT_EXEMPT_AMOUNT}' },
        {
          code: 'WITHHOLDING_TAX', label: 'ภาษีหัก ณ ที่จ่าย',
          expression: 'IF(${HAS_DOC_WHT}==1,${PRE_VAT_AMOUNT}*${DOC_WHT_RATE},0)',
        },
        { code: 'NET_PAYABLE', label: 'ยอดสุทธิที่ต้องชำระ', expression: '${GRAND_TOTAL}-${WITHHOLDING_TAX}' },
      ],
    },
  },

  INVOICE: {
    key: 'INVOICE',
    label: 'ใบแจ้งหนี้ / ใบกำกับภาษี',
    settingKey: 'formula_config_invoice',
    defaultExpression: '${Q_GRAND_TOTAL}',
    variables: [
      { code: 'Q_GRAND_TOTAL', label: 'ยอดรวมของใบเสนอราคาต้นทาง', description: 'quotation.grandTotal' },
    ],
    usedIn: [
      { page: 'ออกใบแจ้งหนี้ จากใบเสนอราคา', path: '/quotations/[id] → InvoiceModal' },
    ],
    vatEngine: {
      // ไม่มี rowVariables/aggregates — Invoice ไม่มีรายการสินค้าเป็นของตัวเอง แค่ตัดสัดส่วน
      // (ratio) จากยอดที่คำนวณไว้แล้วของใบเสนอราคาต้นทาง (ดู components/invoices/invoice-modal.tsx)
      settingKey: 'vat_engine_config_invoice',
      documentVariables: [
        { code: 'Q_GRAND_TOTAL', label: 'Grand Total ของใบเสนอราคา', description: 'quotation.grandTotal' },
        { code: 'Q_SUBTOTAL', label: 'Subtotal ของใบเสนอราคา', description: 'quotation.subtotal' },
        { code: 'Q_DISCOUNT_AMOUNT', label: 'ส่วนลดของใบเสนอราคา', description: 'quotation.discountAmount' },
        { code: 'Q_VAT_EXEMPT_AMOUNT', label: 'ยอดยกเว้นภาษีของใบเสนอราคา', description: 'quotation.vatExemptAmount' },
        { code: 'Q_PRE_TAX_AMOUNT', label: 'ราคาสุทธิที่เสียภาษีของใบเสนอราคา', description: 'quotation.preTaxAmount' },
        { code: 'Q_VAT_AMOUNT', label: 'VAT ของใบเสนอราคา', description: 'quotation.vatAmount' },
        { code: 'Q_WITHHOLDING_TAX', label: 'หัก ณ ที่จ่ายของใบเสนอราคา', description: 'quotation.withholdingTax' },
        { code: 'TOTAL_INVOICED', label: 'ยอดที่เคยออกใบแจ้งหนี้ไปแล้ว', description: 'SUM(invoices.grandTotal) ที่ไม่ถูกยกเลิก' },
      ],
      defaultSteps: [
        {
          code: 'GRAND_TOTAL', label: 'Grand Total ของใบแจ้งหนี้นี้',
          expression: 'IF(${TOTAL_INVOICED}>0,${Q_GRAND_TOTAL}-${TOTAL_INVOICED},${Q_GRAND_TOTAL})',
        },
        { code: 'RATIO', label: 'สัดส่วนที่ตัดจากใบเสนอราคา', expression: 'IF(${Q_GRAND_TOTAL}==0,1,${GRAND_TOTAL}/${Q_GRAND_TOTAL})' },
        { code: 'SUBTOTAL', label: 'Subtotal', expression: '${Q_SUBTOTAL}*${RATIO}' },
        { code: 'DISCOUNT_AMOUNT', label: 'ส่วนลด', expression: '${Q_DISCOUNT_AMOUNT}*${RATIO}' },
        { code: 'VAT_EXEMPT_AMOUNT', label: 'ยอดยกเว้นภาษี', expression: '${Q_VAT_EXEMPT_AMOUNT}*${RATIO}' },
        { code: 'PRE_TAX_AMOUNT', label: 'ราคาสุทธิที่เสียภาษี', expression: '${Q_PRE_TAX_AMOUNT}*${RATIO}' },
        { code: 'VAT_AMOUNT', label: 'ภาษีมูลค่าเพิ่ม', expression: '${Q_VAT_AMOUNT}*${RATIO}' },
        { code: 'WITHHOLDING_TAX', label: 'หัก ณ ที่จ่าย', expression: '${Q_WITHHOLDING_TAX}*${RATIO}' },
      ],
    },
  },

  // Add the next module here when its document type is ready in the system, e.g.:
  //   RECEIPT:     { label: 'ใบเสร็จรับเงิน', ... }
  //   CREDIT_NOTE: { label: 'ใบลดหนี้', ... }
  //   DEBIT_NOTE:  { label: 'ใบเพิ่มหนี้', ... }  — ยังไม่มีเอกสารประเภทนี้ในระบบ ต้องสร้างก่อนถึงเพิ่มสูตรได้
};

export const FORMULA_MODULE_LIST: FormulaModule[] = Object.values(FORMULA_MODULES);

export function getFormulaModule(key: string): FormulaModule | undefined {
  return FORMULA_MODULES[key as FormulaModuleKey];
}

// ── Persisted VAT-engine config (aggregates + steps), merged with defaults ──
export type SavedVatEngineConfig = {
  aggregates: AggregateDefinition[];
  steps: FormulaStepConfig[];
};

/** Merges a saved {aggregates, steps} blob with the module's defaults by `code`, so newly
 *  added defaults show up for everyone and previously-edited expressions are preserved. */
export function mergeVatEngineConfig(mod: FormulaModule, raw: unknown): SavedVatEngineConfig {
  const def = mod.vatEngine;
  if (!def) return { aggregates: [], steps: [] };

  const savedAggregatesByCode = new Map<string, Partial<AggregateDefinition>>(
    (isRecord(raw) && Array.isArray(raw.aggregates) ? raw.aggregates : []).map((a: any) => [a.code, a])
  );
  const aggregates = (def.defaultAggregates || []).map((a) => {
    const s = savedAggregatesByCode.get(a.code);
    if (!s) return a;
    return {
      code: a.code,
      label: typeof s.label === 'string' && s.label.trim() ? s.label : a.label,
      fn: (s.fn as AggregateFn) || a.fn,
      valueExpression: typeof s.valueExpression === 'string' && s.valueExpression.trim() ? s.valueExpression : a.valueExpression,
      criteriaExpression: typeof s.criteriaExpression === 'string' ? s.criteriaExpression : a.criteriaExpression,
    };
  });

  const savedStepsByCode = new Map<string, Partial<FormulaStepConfig>>(
    (isRecord(raw) && Array.isArray(raw.steps) ? raw.steps : []).map((s: any) => [s.code, s])
  );
  const steps = def.defaultSteps.map((s) => {
    const saved = savedStepsByCode.get(s.code);
    if (!saved) return s;
    return {
      code: s.code,
      label: typeof saved.label === 'string' && saved.label.trim() ? saved.label : s.label,
      expression: typeof saved.expression === 'string' && saved.expression.trim() ? saved.expression : s.expression,
    };
  });

  return { aggregates, steps };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
