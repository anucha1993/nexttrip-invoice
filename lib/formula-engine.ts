// lib/formula-engine.ts
// Small, safe formula expression engine — lets users define calculations via a
// text expression instead of hard-coded logic (à la Zoho Creator's "Formula
// Field" using ${Module.Field} tokens). No eval()/new Function() involved:
// hand-rolled tokenizer + recursive-descent parser + tree-walking evaluator.
//
// Supported syntax:
//   ${CODE}                        variable reference, e.g. ${SALE_TOTAL}
//   + - * / % ^                    arithmetic (^ = power)
//   ( )                            grouping
//   > >= < <= == != && ||          comparisons / boolean logic (for IF conditions)
//   unary -                        negation, e.g. -${X}
//   IF(cond, thenValue, elseValue) conditional
//   ROUND(value, decimals?)        decimals defaults to 0
//   ABS(value)
//   MIN(a, b, ...) / MAX(a, b, ...) / SUM(a, b, ...)
//
// Pure functions, no server-only APIs — safe to import from client components.

export type FormulaVariable = {
  code: string;
  label: string;
  description?: string;
};

const FUNCTION_NAMES = ['IF', 'ROUND', 'ABS', 'MIN', 'MAX', 'SUM'] as const;
type FunctionName = (typeof FUNCTION_NAMES)[number];

type Token =
  | { type: 'number'; value: number }
  | { type: 'variable'; code: string }
  | { type: 'ident'; name: string }
  | { type: 'op'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' };

export class FormulaError extends Error {}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = expr.length;

  while (i < n) {
    const ch = expr[i];

    if (/\s/.test(ch)) { i++; continue; }

    // ${CODE}
    if (ch === '$' && expr[i + 1] === '{') {
      const end = expr.indexOf('}', i + 2);
      if (end === -1) throw new FormulaError(`ไม่พบ '}' ปิดตัวแปรที่ตำแหน่ง ${i}`);
      const code = expr.slice(i + 2, end).trim();
      if (!code) throw new FormulaError(`ตัวแปรว่างเปล่าที่ตำแหน่ง ${i}`);
      tokens.push({ type: 'variable', code });
      i = end + 1;
      continue;
    }

    // Number (int/float)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let j = i;
      while (j < n && /[0-9.]/.test(expr[j])) j++;
      const raw = expr.slice(i, j);
      const value = Number(raw);
      if (Number.isNaN(value)) throw new FormulaError(`ตัวเลขไม่ถูกต้อง: '${raw}'`);
      tokens.push({ type: 'number', value });
      i = j;
      continue;
    }

    // Identifier (function name)
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z_0-9]/.test(expr[j])) j++;
      tokens.push({ type: 'ident', name: expr.slice(i, j).toUpperCase() });
      i = j;
      continue;
    }

    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma' }); i++; continue; }

    // Two-char operators
    const two = expr.slice(i, i + 2);
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    if ('+-*/%^<>'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    if (ch === '}') {
      throw new FormulaError(`พบ '}' เกินที่ตำแหน่ง ${i} — ตรวจว่าพิมพ์ } เกินมา หรือลืม \${ ไว้ข้างหน้าชื่อตัวแปรหรือไม่`);
    }
    if (ch === '{') {
      throw new FormulaError(`พบ '{' ที่ตำแหน่ง ${i} — ถ้าต้องการอ้างอิงตัวแปรต้องพิมพ์ \${ชื่อตัวแปร} (มี $ นำหน้า)`);
    }

    throw new FormulaError(`พบอักขระที่ไม่รู้จัก '${ch}' ที่ตำแหน่ง ${i}`);
  }

  return tokens;
}

// Grammar (lowest to highest precedence):
//   expr    := logicOr
//   logicOr := logicAnd ( '||' logicAnd )*
//   logicAnd:= compare ( '&&' compare )*
//   compare := additive ( ('>'|'>='|'<'|'<='|'=='|'!=') additive )?
//   additive:= term ( ('+'|'-') term )*
//   term    := power ( ('*'|'/'|'%') power )*
//   power   := unary ( '^' unary )*
//   unary   := '-' unary | atom
//   atom    := number | variable | funcCall | '(' expr ')'
class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private next(): Token | undefined { return this.tokens[this.pos++]; }

  parseExpression(): AstNode {
    const node = this.parseLogicOr();
    if (this.pos < this.tokens.length) {
      throw new FormulaError('มีอักขระเกินหลังสูตรที่ถูกต้อง (ตรวจวงเล็บ/เครื่องหมาย)');
    }
    return node;
  }

  private parseLogicOr(): AstNode {
    let left = this.parseLogicAnd();
    while (this.peek()?.type === 'op' && (this.peek() as any).value === '||') {
      this.next();
      const right = this.parseLogicAnd();
      left = { kind: 'binary', op: '||', left, right };
    }
    return left;
  }

  private parseLogicAnd(): AstNode {
    let left = this.parseCompare();
    while (this.peek()?.type === 'op' && (this.peek() as any).value === '&&') {
      this.next();
      const right = this.parseCompare();
      left = { kind: 'binary', op: '&&', left, right };
    }
    return left;
  }

  private parseCompare(): AstNode {
    let left = this.parseAdditive();
    const t = this.peek();
    if (t?.type === 'op' && ['>', '>=', '<', '<=', '==', '!='].includes(t.value)) {
      this.next();
      const right = this.parseAdditive();
      left = { kind: 'binary', op: t.value, left, right };
    }
    return left;
  }

  private parseAdditive(): AstNode {
    let left = this.parseTerm();
    while (this.peek()?.type === 'op' && ['+', '-'].includes((this.peek() as any).value)) {
      const op = (this.next() as any).value;
      const right = this.parseTerm();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseTerm(): AstNode {
    let left = this.parsePower();
    while (this.peek()?.type === 'op' && ['*', '/', '%'].includes((this.peek() as any).value)) {
      const op = (this.next() as any).value;
      const right = this.parsePower();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parsePower(): AstNode {
    const left = this.parseUnary();
    if (this.peek()?.type === 'op' && (this.peek() as any).value === '^') {
      this.next();
      const right = this.parsePower(); // right-associative
      return { kind: 'binary', op: '^', left, right };
    }
    return left;
  }

  private parseUnary(): AstNode {
    const t = this.peek();
    if (t?.type === 'op' && t.value === '-') {
      this.next();
      return { kind: 'unaryMinus', value: this.parseUnary() };
    }
    return this.parseAtom();
  }

  private parseAtom(): AstNode {
    const t = this.next();
    if (!t) throw new FormulaError('สูตรไม่สมบูรณ์ (จบก่อนกำหนด)');

    if (t.type === 'number') return { kind: 'number', value: t.value };
    if (t.type === 'variable') return { kind: 'variable', code: t.code };

    if (t.type === 'ident') {
      const name = t.name;
      if (!(FUNCTION_NAMES as readonly string[]).includes(name)) {
        throw new FormulaError(`ไม่รู้จักฟังก์ชัน '${name}' (ใช้ได้: ${FUNCTION_NAMES.join(', ')})`);
      }
      if (this.peek()?.type !== 'lparen') {
        throw new FormulaError(`ต้องมี '(' หลังชื่อฟังก์ชัน '${name}'`);
      }
      this.next(); // consume '('
      const args: AstNode[] = [];
      if (this.peek()?.type !== 'rparen') {
        args.push(this.parseLogicOr());
        while (this.peek()?.type === 'comma') {
          this.next();
          args.push(this.parseLogicOr());
        }
      }
      if (this.peek()?.type !== 'rparen') throw new FormulaError(`ขาด ')' ปิดฟังก์ชัน '${name}'`);
      this.next(); // consume ')'
      return { kind: 'call', name: name as FunctionName, args };
    }

    if (t.type === 'lparen') {
      const inner = this.parseLogicOr();
      if (this.peek()?.type !== 'rparen') throw new FormulaError("ขาด ')' ปิดวงเล็บ");
      this.next();
      return inner;
    }

    throw new FormulaError('สูตรไม่ถูกต้อง (unexpected token)');
  }
}

type AstNode =
  | { kind: 'number'; value: number }
  | { kind: 'variable'; code: string }
  | { kind: 'unaryMinus'; value: AstNode }
  | { kind: 'binary'; op: string; left: AstNode; right: AstNode }
  | { kind: 'call'; name: FunctionName; args: AstNode[] };

function truthy(n: number): boolean { return n !== 0; }

function evalNode(node: AstNode, vars: Record<string, number>): number {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'variable': {
      const v = vars[node.code];
      if (v === undefined) throw new FormulaError(`ไม่พบตัวแปร '\${${node.code}}'`);
      return v;
    }
    case 'unaryMinus':
      return -evalNode(node.value, vars);
    case 'binary': {
      const l = evalNode(node.left, vars);
      const r = evalNode(node.right, vars);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? 0 : l / r;
        case '%': return r === 0 ? 0 : l % r;
        case '^': return Math.pow(l, r);
        case '>': return l > r ? 1 : 0;
        case '>=': return l >= r ? 1 : 0;
        case '<': return l < r ? 1 : 0;
        case '<=': return l <= r ? 1 : 0;
        case '==': return l === r ? 1 : 0;
        case '!=': return l !== r ? 1 : 0;
        case '&&': return truthy(l) && truthy(r) ? 1 : 0;
        case '||': return truthy(l) || truthy(r) ? 1 : 0;
        default: throw new FormulaError(`ตัวดำเนินการไม่รู้จัก '${node.op}'`);
      }
    }
    case 'call': {
      const { name, args } = node;
      if (name === 'IF') {
        if (args.length !== 3) throw new FormulaError('IF ต้องมี 3 อาร์กิวเมนต์: IF(เงื่อนไข, ค่าถ้าจริง, ค่าถ้าเท็จ)');
        return truthy(evalNode(args[0], vars)) ? evalNode(args[1], vars) : evalNode(args[2], vars);
      }
      if (name === 'ROUND') {
        if (args.length < 1 || args.length > 2) throw new FormulaError('ROUND ต้องมี 1-2 อาร์กิวเมนต์: ROUND(ค่า, ทศนิยม?)');
        const value = evalNode(args[0], vars);
        const decimals = args.length === 2 ? evalNode(args[1], vars) : 0;
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
      }
      if (name === 'ABS') {
        if (args.length !== 1) throw new FormulaError('ABS ต้องมี 1 อาร์กิวเมนต์');
        return Math.abs(evalNode(args[0], vars));
      }
      if (name === 'MIN' || name === 'MAX' || name === 'SUM') {
        if (args.length === 0) throw new FormulaError(`${name} ต้องมีอย่างน้อย 1 อาร์กิวเมนต์`);
        const values = args.map((a) => evalNode(a, vars));
        if (name === 'MIN') return Math.min(...values);
        if (name === 'MAX') return Math.max(...values);
        return values.reduce((a, b) => a + b, 0);
      }
      throw new FormulaError(`ไม่รู้จักฟังก์ชัน '${name}'`);
    }
    default:
      throw new FormulaError('โหนดสูตรไม่ถูกต้อง');
  }
}

/** Parses + evaluates `expression` against `variables`. Throws FormulaError on any problem. */
export function evaluateFormula(expression: string, variables: Record<string, number>): number {
  const trimmed = (expression || '').trim();
  if (!trimmed) throw new FormulaError('สูตรว่างเปล่า');
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) throw new FormulaError('สูตรว่างเปล่า');
  const ast = new Parser(tokens).parseExpression();
  const result = evalNode(ast, variables);
  if (!Number.isFinite(result)) throw new FormulaError('ผลลัพธ์ของสูตรไม่ใช่ตัวเลขที่ถูกต้อง (Infinity/NaN)');
  return result;
}

/** Returns { ok: true } or { ok: false, error } without throwing — handy for UI validation. */
export function tryEvaluateFormula(
  expression: string,
  variables: Record<string, number>
): { ok: true; value: number } | { ok: false; error: string } {
  try {
    return { ok: true, value: evaluateFormula(expression, variables) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'สูตรไม่ถูกต้อง' };
  }
}

/** Extracts every `${CODE}` referenced in an expression, without evaluating it. */
export function extractVariableCodes(expression: string): string[] {
  const codes = new Set<string>();
  const re = /\$\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expression || '')) !== null) {
    codes.add(m[1].trim());
  }
  return Array.from(codes);
}

// ─────────────────────────────────────────────────────────────────────────
// Row aggregation — for documents with line items (e.g. quotation_items).
// Lets a "field" be defined as an aggregate (SUM/AVG/MAX/MIN/COUNT) over a
// per-row formula, optionally filtered by a per-row boolean criteria formula.
// Mirrors Zoho Creator's "Aggregate Field" (subform field + function +
// criteria), built on top of the same scalar evaluateFormula() above.
// ─────────────────────────────────────────────────────────────────────────

export type AggregateFn = 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'COUNT';

/** Reduces `rows` (each a flat variable map) into one number. Throws FormulaError on bad expressions. */
export function aggregateRows(
  rows: Record<string, number>[],
  valueExpression: string,
  fn: AggregateFn,
  criteriaExpression?: string
): number {
  const values: number[] = [];
  for (const row of rows) {
    if (criteriaExpression && criteriaExpression.trim()) {
      const include = evaluateFormula(criteriaExpression, row);
      if (!include) continue; // 0 = false
    }
    values.push(evaluateFormula(valueExpression, row));
  }
  if (fn === 'COUNT') return values.length;
  if (values.length === 0) return 0;
  switch (fn) {
    case 'SUM': return values.reduce((a, b) => a + b, 0);
    case 'AVG': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'MAX': return Math.max(...values);
    case 'MIN': return Math.min(...values);
    default: throw new FormulaError(`ไม่รู้จักฟังก์ชันรวมยอด '${fn}'`);
  }
}

export function tryAggregateRows(
  rows: Record<string, number>[],
  valueExpression: string,
  fn: AggregateFn,
  criteriaExpression?: string
): { ok: true; value: number } | { ok: false; error: string } {
  try {
    return { ok: true, value: aggregateRows(rows, valueExpression, fn, criteriaExpression) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'สูตรรวมยอดไม่ถูกต้อง' };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Ordered formula steps — a named "spreadsheet-like" pipeline where each
// step's expression can reference any variable computed by an earlier step
// (plus the initial variables/aggregates). Lets a document's derived fields
// (e.g. PRE_VAT_AMOUNT → VAT_AMOUNT → GRAND_TOTAL) be expressed as separate,
// individually-editable formulas instead of one giant expression.
// ─────────────────────────────────────────────────────────────────────────

export type FormulaStepDef = { code: string; expression: string };

/** Evaluates `steps` in order, feeding each prior result forward. Stops at the first error. */
export function evaluateFormulaSteps(
  steps: FormulaStepDef[],
  initialVariables: Record<string, number>
): { values: Record<string, number>; error: { code: string; message: string } | null } {
  const values: Record<string, number> = { ...initialVariables };
  for (const step of steps) {
    const result = tryEvaluateFormula(step.expression, values);
    if (!result.ok) {
      return { values, error: { code: step.code, message: result.error } };
    }
    values[step.code] = result.value;
  }
  return { values, error: null };
}
