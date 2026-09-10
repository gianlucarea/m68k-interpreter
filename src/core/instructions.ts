import { CODE_BYTE as B, CODE_WORD as W, CODE_LONG as L, signed } from './operations';

export type Operand =
  | { kind: 'data' | 'address'; reg: number }
  | { kind: 'immediate' | 'absolute'; value: number }
  | { kind: 'ccr' | 'sr' }
  | { kind: 'indirect' | 'postincrement' | 'predecrement'; reg: number }
  | {
      kind: 'displacement' | 'indexed';
      reg: number | 'pc';
      displacement: number;
      index?: number;
      indexSize?: number;
      pcBase?: number;
    };

export class InstructionError extends Error {}
export function requireForm(ok: boolean, message: string): asserts ok {
  if (!ok) throw new InstructionError(message);
}
export function registerIndex(name: string): number | undefined {
  if (/^sp$/i.test(name)) return 7;
  const match = /^([ad])([0-7])$/i.exec(name);
  return match ? Number(match[2]) + (match[1].toLowerCase() === 'd' ? 8 : 0) : undefined;
}
export function splitOperands(text: string): string[] {
  if (!text.trim()) return [];
  const parts: string[] = [];
  let depth = 0,
    start = 0,
    quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (c === '(') depth++;
    if (c === ')') depth--;
    requireForm(depth >= 0, 'Unbalanced operand parentheses');
    if (c === ',' && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  requireForm(depth === 0 && !quote, 'Unbalanced operand parentheses or quotes');
  parts.push(text.slice(start).trim());
  requireForm(parts.every(Boolean), 'Missing operand');
  return parts;
}

export function expression(text: string, symbol: (name: string) => number | undefined): number {
  let remaining = text.trim();
  let value = 0,
    operation = 1;
  // Consume each signed term in order: addition and subtraction have equal precedence.
  for (;;) {
    const match = /^([+-]?)\s*('[^']'|\$[\da-f]+|0x[\da-f]+|%[01]+|\d+|[a-z_]\w*|\*)/i.exec(
      remaining
    );
    requireForm(!!match, `Invalid value: ${text}`);
    const token = match[2];
    let term: number | undefined;
    if (token.startsWith("'")) term = token.charCodeAt(1);
    else if (token.startsWith('$')) term = parseInt(token.slice(1), 16);
    else if (/^0x/i.test(token)) term = parseInt(token.slice(2), 16);
    else if (token.startsWith('%')) term = parseInt(token.slice(1), 2);
    else if (/^\d+$/.test(token)) term = Number(token);
    else term = symbol(token.toLowerCase());
    requireForm(term !== undefined, `Unknown label: ${token}`);
    requireForm(Number.isSafeInteger(term), `Value out of range: ${text}`);
    value += operation * (match[1] === '-' ? -1 : 1) * term;
    requireForm(Number.isSafeInteger(value), `Value out of range: ${text}`);
    remaining = remaining.slice(match[0].length).trimStart();
    if (!remaining) return value;
    requireForm(remaining[0] === '+' || remaining[0] === '-', `Invalid value: ${text}`);
    operation = remaining[0] === '-' ? -1 : 1;
    remaining = remaining.slice(1).trimStart();
  }
}
export function parseOperand(
  text: string,
  symbol: (name: string) => number | undefined,
  pcBase: number
): Operand {
  text = text.trim();
  const reg = registerIndex(text);
  if (reg !== undefined) return { kind: reg < 8 ? 'address' : 'data', reg };
  if (/^(ccr|sr)$/i.test(text)) return { kind: text.toLowerCase() as 'ccr' | 'sr' };
  if (text.startsWith('#')) return { kind: 'immediate', value: expression(text.slice(1), symbol) };
  let match = /^-\(\s*(a[0-7]|sp)\s*\)$/i.exec(text);
  if (match) return { kind: 'predecrement', reg: registerIndex(match[1])! };
  match = /^\(\s*(a[0-7]|sp)\s*\)\+$/i.exec(text);
  if (match) return { kind: 'postincrement', reg: registerIndex(match[1])! };
  match = /^\(\s*(a[0-7]|sp)\s*\)$/i.exec(text);
  if (match) return { kind: 'indirect', reg: registerIndex(match[1])! };
  // Both d(An,Xn.W) and (d,An,Xn.W) spellings are accepted.
  match = /^(.*?)\(([^()]*)\)$/i.exec(text);
  if (match) {
    const inside = splitOperands(match[2]);
    let displacementText = match[1].trim();
    if (inside.length >= 2 && !/^(a[0-7]|sp|pc)$/i.test(inside[0])) {
      requireForm(!displacementText, `Invalid address: ${text}`);
      displacementText = inside.shift()!;
    }
    if (/^(a[0-7]|sp|pc)$/i.test(inside[0])) {
      requireForm(inside.length <= 2, `Invalid address: ${text}`);
      const base = inside[0].toLowerCase() === 'pc' ? 'pc' : registerIndex(inside[0])!;
      let symbolic = false;
      let displacement = displacementText
        ? expression(displacementText, (name) => {
            symbolic = true;
            return symbol(name);
          })
        : 0;
      // Symbols denote target addresses. Take the signed difference on the 32-bit address ring.
      const relativeTarget = base === 'pc' && symbolic;
      if (relativeTarget) displacement = (displacement - pcBase) | 0;
      const index = inside[1] && /^([ad][0-7]|sp)(?:\.([wl]))?$/i.exec(inside[1]);
      requireForm(!inside[1] || !!index, '68000 index must be an unscaled word or long register');
      const size = index ? B : W;
      const bits = index ? 8 : 16;
      requireForm(
        displacement >= -(2 ** (bits - 1)) &&
          displacement <= 2 ** (relativeTarget ? bits - 1 : bits) - 1,
        'Displacement out of range'
      );
      return {
        kind: index ? 'indexed' : 'displacement',
        reg: base,
        pcBase: base === 'pc' ? pcBase : undefined,
        displacement: signed(displacement, size),
        index: index ? registerIndex(index[1]) : undefined,
        indexSize: index?.[2]?.toLowerCase() === 'l' ? L : W,
      };
    }
  }
  // Absolute short addresses are sign extended. Unsuffixed addresses use 32 bits.
  match = /^(?:\((.+)\)|(.+?))(?:\.([wl]))?$/i.exec(text);
  requireForm(!!match, `Invalid operand: ${text}`);
  let value = expression(match[1] ?? match[2], symbol);
  const short = match[3]?.toLowerCase() === 'w';
  requireForm(
    value >= (short ? -32768 : -2147483648) && value <= (short ? 65535 : 0xffffffff),
    'Address out of range'
  );
  value = short ? signed(value, W) >>> 0 : value >>> 0;
  return { kind: 'absolute', value };
}
export function registerList(text: string): number[] {
  const ordered: number[] = [];
  const order = (r: number) => (r >= 8 ? r - 8 : r + 8);
  for (const group of text.split('/')) {
    const pair = group
      .trim()
      .split('-')
      .map((s) => registerIndex(s.trim()));
    requireForm(
      pair.length <= 2 && pair.every((r) => r !== undefined),
      `Invalid register list: ${text}`
    );
    const first = order(pair[0]!);
    const last = order(pair[pair.length - 1]!);
    requireForm(first <= last, `Descending register range: ${group}`);
    for (let i = first; i <= last; i++) ordered.push(i < 8 ? i + 8 : i - 8);
  }
  return [...new Set(ordered)].sort((a, b) => order(a) - order(b));
}
export const isMemory = (o: Operand): boolean =>
  ['absolute', 'indirect', 'predecrement', 'postincrement', 'displacement', 'indexed'].includes(
    o.kind
  );
export const isPC = (o: Operand): boolean => 'reg' in o && o.reg === 'pc';
export const isData = (o: Operand): boolean =>
  o.kind === 'data' || o.kind === 'immediate' || isMemory(o);
export const isAlterable = (o: Operand): boolean => o.kind === 'data' || (isMemory(o) && !isPC(o));
export const isControl = (o: Operand): boolean =>
  isMemory(o) && o.kind !== 'predecrement' && o.kind !== 'postincrement';
export const isRegister = (o: Operand): boolean => o.kind === 'data' || o.kind === 'address';

export const conditions = [
  'hi',
  'ls',
  'cc',
  'cs',
  'ne',
  'eq',
  'vc',
  'vs',
  'pl',
  'mi',
  'ge',
  'lt',
  'gt',
  'le',
  'f',
  't',
] as const;
export function condition(name: string, ccr: number): boolean {
  const c = !!(ccr & 1),
    v = !!(ccr & 2),
    z = !!(ccr & 4),
    n = !!(ccr & 8);
  const results: Record<string, boolean> = {
    hi: !c && !z,
    ls: c || z,
    cc: !c,
    cs: c,
    ne: !z,
    eq: z,
    vc: !v,
    vs: v,
    pl: !n,
    mi: n,
    ge: n === v,
    lt: n !== v,
    gt: !z && n === v,
    le: z || n !== v,
    f: false,
    t: true,
  };
  requireForm(name in results, `Unknown condition: ${name}`);
  return results[name];
}
interface InstructionSpec {
  count: number | number[];
  sizes: string;
  defaultSize: number;
}
export const instructionSpecs: Record<string, InstructionSpec> = {};
function define(names: string, count: number | number[], sizes = 'bwl', defaultSize = W): void {
  for (const name of names.split(' ')) instructionSpecs[name] = { count, sizes, defaultSize };
}
define('move add sub addi subi addq subq addx subx cmp cmpi cmpm and andi or ori eor eori', 2);
define('clr neg negx not tst', 1);
define('adda suba cmpa movea movem movep', 2, 'wl');
define('muls mulu divs divu chk', 2, 'w');
define('ext', 1, 'wl');
define('swap', 1, 'w');
define('exg lea moveq', 2, 'l', L);
define('pea', 1, 'l', L);
define('link', 2, 'w');
define('unlk jmp jsr rtd trap stop', 1, '');
define('nop reset rte rts rtr trapv', 0, '');
define('tas', 1, 'b', B);
define('asl asr lsl lsr rol ror roxl roxr', [1, 2]);
define('bset bclr bchg btst', 2, 'bl', L);
define('bra bsr', 1, 'bws');
define('mode', 2, '', L);
for (const cc of conditions) {
  if (cc !== 'f' && cc !== 't') define(`b${cc}`, 1, 'bws');
  define(`db${cc}`, 2, 'w');
  define(`s${cc}`, 1, 'b', B);
}
export const aliases: Record<string, string> = {
  dbra: 'dbf',
  bhs: 'bcc',
  blo: 'bcs',
  dbhs: 'dbcc',
  dblo: 'dbcs',
  shs: 'scc',
  slo: 'scs',
};
