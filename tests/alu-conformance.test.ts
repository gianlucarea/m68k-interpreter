import { describe, expect, it } from 'vitest';
import { Emulator } from '../src/core/emulator';
import * as alu from '../src/core/operations';

// Closed-form BigInt oracle, independent of the production per-bit shift loop.
function expectedShift(
  kind: string,
  bits: number,
  raw: number,
  count: number,
  flags: number
): [number, number] {
  const width = BigInt(bits),
    mask = (1n << width) - 1n,
    sign = 1n << (width - 1n);
  const value = BigInt(raw >>> 0) & mask,
    n = BigInt(count & 63);
  let result = value,
    x = (flags >> 4) & 1,
    carry = 0,
    overflow = false;
  if (kind === 'ROL' || kind === 'ROR') {
    const r = n % width;
    result =
      kind === 'ROL'
        ? ((value << r) | (value >> (width - r))) & mask
        : ((value >> r) | (value << (width - r))) & mask;
    if (n) carry = Number(kind === 'ROL' ? result & 1n : (result >> (width - 1n)) & 1n);
  } else if (kind === 'ROXL' || kind === 'ROXR') {
    // Append X below the data field and rotate the combined bit string.
    const wide = width + 1n,
      extended = (value << 1n) | BigInt(x),
      extendedMask = (1n << wide) - 1n;
    const r = n % wide;
    const rotated =
      kind === 'ROXL'
        ? ((extended << r) | (extended >> (wide - r))) & extendedMask
        : ((extended >> r) | (extended << (wide - r))) & extendedMask;
    result = rotated >> 1n;
    carry = Number(rotated & 1n);
    x = carry;
  } else if (n > 0n) {
    if (kind.endsWith('L')) {
      result = (value << n) & mask;
      carry = n <= width ? Number((value >> (width - n)) & 1n) : 0;
      if (kind === 'ASL') {
        const signed = value & sign ? value - (1n << width) : value;
        const full = signed << n;
        overflow = full < -sign || full >= sign;
      }
    } else {
      carry =
        n <= width ? Number((value >> (n - 1n)) & 1n) : kind === 'ASR' && !!(value & sign) ? 1 : 0;
      const signed = kind === 'ASR' && value & sign ? value - (1n << width) : value;
      result = (signed >> n) & mask;
    }
    x = carry;
  }
  const output = ((BigInt(raw >>> 0) & ~mask) | result) & 0xffffffffn;
  return [
    Number(output),
    (flags & ~31) |
      (x * 16) |
      (result & sign ? 8 : 0) |
      (result === 0n ? 4 : 0) |
      (overflow ? 2 : 0) |
      carry,
  ];
}
const shifts = ['ASL', 'ASR', 'LSL', 'LSR', 'ROL', 'ROR', 'ROXL', 'ROXR'] as const;
describe('Shift/rotate boundaries and bit preservation', () => {
  for (const [size, bits, suffix] of [
    [0, 8, 'B'],
    [1, 16, 'W'],
    [2, 32, 'L'],
  ] as const) {
    it.each(shifts)(`%s.${suffix} matches an independent oracle at boundary counts`, (name) => {
      for (const value of [
        0, 1, 2, 0x7f, 0x80, 0x7fff, 0x8000, 0x7fffffff, 0x80000000, 0xffffffff, 0xabcd8081,
      ]) {
        for (const count of [0, 1, 2, 7, 8, 9, 15, 16, 17, 31, 32, 33, 63, 64]) {
          for (const flags of [0, 0x10, 0x1f]) {
            const result = alu.shiftOP(
              name.toLowerCase() as Parameters<typeof alu.shiftOP>[0],
              count,
              value,
              flags,
              size
            );
            expect(
              [result[0] >>> 0, result[1]],
              `${name}.${suffix} value=${value} count=${count} CCR=${flags}`
            ).toEqual(expectedShift(name, bits, value, count, flags));
          }
        }
      }
    });
  }
  it.each(shifts)('%s memory form shifts a word once with one address update', (name) => {
    const e = new Emulator(
      `MOVEA.L #$2000,A0\nMOVE.W #$8001,(A0)\nMOVE.W #$1F,CCR\n${name} (A0)+\nEND`
    );
    let done = false;
    for (let i = 0; i < 20 && !done; i++) done = e.emulationStep();
    expect(done).toBe(true);
    expect(e.getErrors()).toEqual([]);
    const [value, flags] = expectedShift(name, 16, 0x8001, 1, 0x1f);
    expect(e.readWord(8192)).toBe(value);
    expect(e.getCCR()).toBe(flags);
    expect(e.getRegisters()[0]).toBe(8194);
  });
  it.each(shifts)(
    '%s register counts use the low six bits and may alias the destination',
    (name) => {
      const e = new Emulator(`${name}.W D0,D0\nEND`);
      e.getRegisters()[8] = 0xabcd0041;
      e.setSR(0x2010);
      e.emulationStep();
      expect(e.getErrors()).toEqual([]);
      expect([e.getRegisters()[8] >>> 0, e.getCCR()]).toEqual(
        expectedShift(name, 16, 0xabcd0041, 1, 0x10)
      );
    }
  );
});

describe('Extended arithmetic against mathematical signed/unsigned bounds', () => {
  for (const [size, bits] of [
    [0, 8],
    [1, 16],
    [2, 32],
  ] as const) {
    it(`ADD/SUB/ADDX/SUBX at ${bits} bits`, () => {
      const modulus = 2 ** bits,
        sign = modulus / 2;
      const values = [0, 1, 2, sign - 1, sign, sign + 1, modulus - 2, modulus - 1];
      for (const source of values)
        for (const dest of values)
          for (const extended of [false, true])
            for (const subtract of [false, true])
              for (const flags of [0, 4, 16, 20]) {
                const x = extended && flags & 16 ? 1 : 0;
                const signedSource = source >= sign ? source - modulus : source,
                  signedDest = dest >= sign ? dest - modulus : dest;
                const full = subtract ? dest - source - x : dest + source + x;
                const signedFull = subtract
                  ? signedDest - signedSource - x
                  : signedDest + signedSource + x;
                const value = ((full % modulus) + modulus) % modulus;
                const carry = full < 0 || full >= modulus;
                const overflow = signedFull < -sign || signedFull >= sign;
                const zero = value === 0 && (!extended || !!(flags & 4));
                const expected =
                  (carry ? 17 : 0) | (overflow ? 2 : 0) | (zero ? 4 : 0) | (value >= sign ? 8 : 0);
                const result = extended
                  ? (subtract ? alu.subxOP : alu.addxOP)(source, dest, flags, size)
                  : alu.addOP(source, dest, flags, size, subtract);
                expect([result[0] >>> 0, result[1]]).toEqual([value, expected]);
              }
    });
  }
});
