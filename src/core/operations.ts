/** Sized 68000 ALU operations. Results preserve untouched data-register bits. */
export const CODE_LONG = 2;
export const CODE_WORD = 1;
export const CODE_BYTE = 0;
export const BYTE_MASK = 0xff;
export const WORD_MASK = 0xffff;
export const LONG_MASK = 0xffffffff;
export const MSB_BYTE_MASK = 0x80;
export const MSB_WORD_MASK = 0x8000;
export const MSB_LONG_MASK = 0x80000000;

export function width(size: number): number {
  if (size !== CODE_BYTE && size !== CODE_WORD && size !== CODE_LONG)
    throw new Error('Invalid size');
  return 8 * (1 << size);
}
export function maskFor(size: number): number {
  return 2 ** width(size) - 1;
}
export function unsigned(value: number, size: number): number {
  return (value & maskFor(size)) >>> 0;
}
export function signed(value: number, size: number): number {
  const shift = 32 - width(size);
  return (value << shift) >> shift;
}
export function merge(value: number, original: number, size: number): number {
  const result = (original & ~maskFor(size)) | (value & maskFor(size));
  return size === CODE_LONG ? result : result >>> 0;
}
export function logicCCR(value: number, ccr: number, size: number): number {
  const result = unsigned(value, size);
  return ((ccr & ~0x0f) | (result === 0 ? 4 : 0) | (signed(result, size) < 0 ? 8 : 0)) >>> 0;
}
function arithmeticOP(
  src: number,
  dest: number,
  ccr: number,
  size: number,
  subtract: boolean,
  extended = false
): [number, number] {
  const source = unsigned(src, size),
    destination = unsigned(dest, size);
  const x = extended ? (ccr >>> 4) & 1 : 0;
  const full = subtract ? destination - source - x : destination + source + x;
  const result = unsigned(full, size);
  const carry = subtract ? full < 0 : full > maskFor(size);
  const sign = 2 ** (width(size) - 1);
  const overflow = subtract
    ? ((destination ^ source) & (destination ^ result) & sign) !== 0
    : (~(destination ^ source) & (destination ^ result) & sign) !== 0;
  const zero = result === 0 && (!extended || (ccr & 4) !== 0);
  return [
    merge(result, dest, size),
    ((ccr & ~0x1f) |
      (carry ? 0x11 : 0) |
      (overflow ? 2 : 0) |
      (zero ? 4 : 0) |
      (result & sign ? 8 : 0)) >>>
      0,
  ];
}
export function addOP(
  src: number,
  dest: number,
  ccr: number,
  size: number,
  isSub: boolean
): [number, number] {
  return arithmeticOP(src, dest, ccr, size, isSub);
}
export function addxOP(src: number, dest: number, ccr: number, size: number): [number, number] {
  return arithmeticOP(src, dest, ccr, size, false, true);
}
export function subxOP(src: number, dest: number, ccr: number, size: number): [number, number] {
  return arithmeticOP(src, dest, ccr, size, true, true);
}
export function negOP(size: number, op: number, ccr: number): [number, number] {
  const [value, flags] = arithmeticOP(op, 0, ccr, size, true);
  return [merge(value, op, size), flags];
}
export function negxOP(size: number, op: number, ccr: number): [number, number] {
  const [value, flags] = arithmeticOP(op, 0, ccr, size, true, true);
  return [merge(value, op, size), flags];
}
export function cmpOP(src: number, dest: number, ccr: number, size: number): number {
  return (arithmeticOP(src, dest, ccr, size, true)[1] & ~0x10) | (ccr & 0x10);
}
export const cmpmOP = cmpOP;
export function moveOP(src: number, dest: number, ccr: number, size: number): [number, number] {
  return [merge(src, dest, size), logicCCR(src, ccr, size)];
}
export function tstOP(op: number, ccr: number, size: number): number {
  return logicCCR(op, ccr, size);
}
export function clrOP(size: number, op: number, ccr: number): [number, number] {
  return moveOP(0, op, ccr, size);
}
export function notOP(size: number, op: number, ccr: number): [number, number] {
  return moveOP(~op, op, ccr, size);
}
export function andOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  return moveOP(src & dest, dest, ccr, size);
}
export function orOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  return moveOP(src | dest, dest, ccr, size);
}
export function eorOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  return moveOP(src ^ dest, dest, ccr, size);
}
export function swapOP(op: number, ccr: number): [number, number] {
  const value = (op << 16) | (op >>> 16);
  return [value, logicCCR(value, ccr, CODE_LONG)];
}
export function exgOP(a: number, b: number): [number, number] {
  return [b, a];
}
export function extOP(size: number, op: number, ccr: number): [number, number] {
  if (size !== CODE_WORD && size !== CODE_LONG) throw new Error('Invalid size for EXT');
  return moveOP(signed(op, size - 1), op, ccr, size);
}

type Shift = 'asl' | 'asr' | 'lsl' | 'lsr' | 'rol' | 'ror' | 'roxl' | 'roxr';
export function shiftOP(
  kind: Shift,
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  count &= 63;
  const sign = 2 ** (width(size) - 1);
  let value = unsigned(op, size),
    x = (ccr >>> 4) & 1;
  let carry = kind.startsWith('rox') ? x : 0;
  let overflow = false;
  for (let i = 0; i < count; i++) {
    const oldSign = (value & sign) !== 0;
    if (kind.endsWith('l')) {
      carry = oldSign ? 1 : 0;
      value = unsigned(value * 2, size);
      if (kind === 'rol') value |= carry;
      if (kind === 'roxl') value |= x;
      if (kind === 'asl' && oldSign !== ((value & sign) !== 0)) overflow = true;
    } else {
      carry = value & 1;
      value >>>= 1;
      if (kind === 'asr' && oldSign) value |= sign;
      if (kind === 'ror' && carry) value |= sign;
      if (kind === 'roxr' && x) value |= sign;
    }
    if (kind !== 'rol' && kind !== 'ror') x = carry;
  }
  const flags = (logicCCR(value, ccr, size) & ~0x10) | (x << 4) | carry | (overflow ? 2 : 0);
  return [merge(value, op, size), flags >>> 0];
}
export const aslOP = (count: number, op: number, ccr: number, size: number): [number, number] =>
  shiftOP('asl', count, op, ccr, size);
export const asrOP = (count: number, op: number, ccr: number, size: number): [number, number] =>
  shiftOP('asr', count, op, ccr, size);
export const lslOP = (count: number, op: number, ccr: number, size: number): [number, number] =>
  shiftOP('lsl', count, op, ccr, size);
export const lsrOP = (count: number, op: number, ccr: number, size: number): [number, number] =>
  shiftOP('lsr', count, op, ccr, size);
export const rolOP = (count: number, op: number, ccr: number, size: number): [number, number] =>
  shiftOP('rol', count, op, ccr, size);
export const rorOP = (count: number, op: number, ccr: number, size: number): [number, number] =>
  shiftOP('ror', count, op, ccr, size);
export const roxlOP = (count: number, op: number, ccr: number, size: number): [number, number] =>
  shiftOP('roxl', count, op, ccr, size);
export const roxrOP = (count: number, op: number, ccr: number, size: number): [number, number] =>
  shiftOP('roxr', count, op, ccr, size);

function multiply(
  size: number,
  src: number,
  dest: number,
  ccr: number,
  isSigned: boolean
): [number, number] {
  if (size !== CODE_WORD) throw new Error('68000 multiply requires word operands');
  const value = isSigned
    ? signed(src, CODE_WORD) * signed(dest, CODE_WORD)
    : (src & 0xffff) * (dest & 0xffff);
  return [value >>> 0, logicCCR(value, ccr, CODE_LONG)];
}
export function mulsOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  return multiply(size, src, dest, ccr, true);
}
export function muluOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  return multiply(size, src, dest, ccr, false);
}
function divide(
  size: number,
  src: number,
  dest: number,
  ccr: number,
  isSigned: boolean
): [number, number] {
  if (size !== CODE_WORD) throw new Error('68000 divide requires a word divisor');
  const divisor = isSigned ? signed(src, CODE_WORD) : src & 0xffff;
  if (divisor === 0) throw new Error('Division by zero');
  const dividend = isSigned ? dest | 0 : dest >>> 0;
  const quotient = Math.trunc(dividend / divisor);
  if (quotient < (isSigned ? -32768 : 0) || quotient > (isSigned ? 32767 : 65535)) {
    // N/Z are undefined on overflow; keep their previous values deterministically.
    return [dest, (ccr & ~1) | 2];
  }
  const value = (((dividend % divisor) & 0xffff) << 16) | (quotient & 0xffff);
  return [value >>> 0, logicCCR(quotient, ccr, CODE_WORD)];
}
export function divsOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  return divide(size, src, dest, ccr, true);
}
export function divuOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  return divide(size, src, dest, ccr, false);
}
