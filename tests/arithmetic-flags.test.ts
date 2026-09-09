import { describe, expect, it } from 'vitest';
import { Emulator } from '../src/core/emulator';
import {
  addOP, addxOP, subxOP, negOP, negxOP, cmpOP, cmpmOP,
  CODE_BYTE, CODE_WORD, CODE_LONG,
} from '../src/core/operations';

const widths = [
  { size: CODE_BYTE, max: 0xff, sign: 0x80 },
  { size: CODE_WORD, max: 0xffff, sign: 0x8000 },
  { size: CODE_LONG, max: 0xffffffff, sign: 0x80000000 },
];

describe.each(widths)('Arithmetic flags at size $size', ({ size, max, sign }) => {
  const cases = [
    { name: 'ordinary addition clears stale flags', src: 2, dest: 3, sub: false, result: 5, flags: 0 },
    { name: 'carry with nonzero result', src: max, dest: 2, sub: false, result: 1, flags: 0x11 },
    { name: 'carry with zero result', src: max, dest: 1, sub: false, result: 0, flags: 0x15 },
    { name: 'positive addition overflow', src: 1, dest: sign - 1, sub: false, result: sign, flags: 0x0a },
    { name: 'negative addition overflow to zero', src: sign, dest: sign, sub: false, result: 0, flags: 0x17 },
    { name: 'negative addition overflow to positive', src: sign, dest: sign + 1, sub: false, result: 1, flags: 0x13 },
    { name: 'negative result without overflow', src: 0, dest: sign, sub: false, result: sign, flags: 0x08 },
    { name: 'subtraction without borrow', src: 2, dest: 3, sub: true, result: 1, flags: 0 },
    { name: 'subtraction borrow', src: 1, dest: 0, sub: true, result: max, flags: 0x19 },
    { name: 'equal operands', src: max, dest: max, sub: true, result: 0, flags: 0x04 },
    { name: 'negative subtraction overflow', src: 1, dest: sign, sub: true, result: sign - 1, flags: 0x02 },
    { name: 'positive subtraction overflow', src: max, dest: sign - 1, sub: true, result: sign, flags: 0x1b },
  ];
  it.each(cases)('$name', ({ src, dest, sub, result, flags }) => {
    const [value, ccr] = addOP(src, dest, 0xff, size, sub);
    expect(value >>> 0).toBe(result);
    expect(ccr).toBe(0xe0 | flags);
  });

  it('negates the minimum signed value', () => {
    const [value, ccr] = negOP(size, sign, 0,);
    expect(value >>> 0).toBe(sign);
    expect(ccr).toBe(0x1b);
  });

  it.each([cmpOP, cmpmOP])('comparison preserves X and upper CCR bits', (compare) => {
    expect(compare(1, 0, 0xe0, size)).toBe(0xe9);
    expect(compare(0, 1, 0xff, size)).toBe(0xf0);
    expect(compare(1, 1, 0x10, size)).toBe(0x14);
  });

  it('keeps carry/borrow when maximum source plus X exceeds the width', () => {
    for (const operation of [addxOP, subxOP]) {
      const [value, ccr] = operation(max, 0, 0x14, size);
      expect(value >>> 0).toBe(0);
      expect(ccr).toBe(0x15);
    }
    expect(negxOP(size, max, 0x14)).toEqual([0, 0x15]);
  });

  it('uses original operand signs for extended overflow', () => {
    const [sum, sumCCR] = addxOP(sign - 1, 0, 0x10, size);
    expect(sum >>> 0).toBe(sign);
    expect(sumCCR).toBe(0x0a);
    const [difference, differenceCCR] = subxOP(0, sign, 0x10, size);
    expect(difference >>> 0).toBe(sign - 1);
    expect(differenceCCR).toBe(0x02);
  });

  it.each([addxOP, subxOP])('maintains cumulative Z through consecutive operations', (operation) => {
    expect(operation(0, 0, 0x04, size)).toEqual([0, 0x04]);
    const [, nonzeroCCR] = operation(0, 1, 0x04, size);
    expect(nonzeroCCR & 4).toBe(0);
    expect(operation(0, 0, nonzeroCCR, size)).toEqual([0, 0]);
    expect(operation(0, 0, 0, size)).toEqual([0, 0]);
  });

  it('applies cumulative Z and X input to NEGX', () => {
    expect(negxOP(size, 0, 4)).toEqual([0, 4]);
    expect(negxOP(size, 0, 0)).toEqual([0, 0]);
    const [value, ccr] = negxOP(size, 0, 0x14);
    expect(value >>> 0).toBe(max);
    expect(ccr).toBe(0x19);
  });
});

it.each([CODE_BYTE, CODE_WORD])('preserves upper destination bits at size %s', (size) => {
  expect(addOP(1, 0xabcdffff, 0, size, false)).toEqual([
    size === CODE_BYTE ? 0xabcdff00 : 0xabcd0000, 0x15,
  ]);
  expect(subxOP(0, 0xabcd0000, 0x10, size)).toEqual([
    size === CODE_BYTE ? 0xabcd00ff : 0xabcdffff, 0x19,
  ]);
});

it.each([false, true])('normalizes signed and unsigned long operands (subtraction=%s)', (sub) => {
  for (const src of [0, 2, 0x80000000, 0xffffffff]) {
    for (const dest of [0, 2, 0x80000000, 0xffffffff]) {
      const expected = addOP(src, dest, 0, CODE_LONG, sub);
      expect(addOP(src | 0, dest, 0, CODE_LONG, sub)).toEqual(expected);
      expect(addOP(src, dest | 0, 0, CODE_LONG, sub)).toEqual(expected);
      expect(addOP(src | 0, dest | 0, 0, CODE_LONG, sub)).toEqual(expected);
    }
  }
});

function run(program: string): Emulator {
  const emulator = new Emulator(program);
  let finished = false;
  for (let step = 0; step < 50 && !finished; step++) finished = emulator.emulationStep();
  expect(finished).toBe(true);
  expect(emulator.getException()).toBeUndefined();
  expect(emulator.getErrors()).toEqual([]);
  return emulator;
}

it.each(['W', 'L'])('reproduces the reported ADD.%s program with all flags', (size) => {
  const source = size === 'W' ? 'FFFF' : 'FFFFFFFF';
  const emulator = run(`MOVE.${size} #$${source}, D0\nMOVE.${size} #2, D1\nADD.${size} D0, D1\nEND`);
  expect(emulator.getRegisters()[8] >>> 0).toBe(size === 'W' ? 0xffff : 0xffffffff);
  expect(emulator.getRegisters()[9]).toBe(1);
  expect(emulator.getCCR()).toBe(0x11);
});

it.each(['ADDI.L #2, D1', 'ADDQ.L #2, D1'])('sets long carry through %s', (instruction) => {
  const emulator = run(`MOVE.L #$FFFFFFFF, D1\n${instruction}\nEND`);
  expect(emulator.getRegisters()[9]).toBe(1);
  expect(emulator.getCCR()).toBe(0x11);
});

it.each(['SUBI.L #1, D1', 'SUBQ.L #1, D1'])('sets long borrow through %s', (instruction) => {
  const emulator = run(`MOVE.L #0, D1\n${instruction}\nEND`);
  expect(emulator.getRegisters()[9] >>> 0).toBe(0xffffffff);
  expect(emulator.getCCR()).toBe(0x19);
});

it.each(['ADDX.L D0, D1', 'SUBX.L D0, D1', 'NEGX.L D0'])('retains extended carry through %s', (instruction) => {
  const emulator = run(`MOVE.L #$FFFFFFFF, D0\nMOVE.L #0, D1\nORI #$14, CCR\n${instruction}\nEND`);
  expect(emulator.getRegisters()[instruction.startsWith('NEGX') ? 8 : 9]).toBe(0);
  expect(emulator.getCCR()).toBe(0x15);
});
