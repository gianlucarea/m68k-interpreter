import { describe, expect, it } from 'vitest';
import { Emulator } from '../src/core/emulator';

interface Setup {
  registers?: Record<number, number>;
  memory?: Record<number, number>;
  ccr?: number;
}
function machine(instruction: string, setup: Setup = {}): Emulator {
  const memory = Object.entries(setup.memory ?? {})
    .map(([address, byte]) => `MOVE.B #${byte},${address}`)
    .join('\n');
  const emulator = new Emulator(
    `ORG $1000\n${memory}\nMOVE.W #${setup.ccr ?? 0},CCR\n${instruction}\nEND`
  );
  emulator.getRegisters()[7] = 0x8000;
  for (const [reg, value] of Object.entries(setup.registers ?? {}))
    emulator.getRegisters()[Number(reg)] = value;
  return emulator;
}
function finish(emulator: Emulator, exception?: string): Emulator {
  let done = false;
  for (let i = 0; i < 150 && !done; i++) done = emulator.emulationStep();
  expect(done, 'program must terminate within its step budget').toBe(true);
  expect(emulator.getErrors()).toEqual([]);
  expect(emulator.getException()).toBe(exception);
  return emulator;
}
const run = (instruction: string, setup: Setup = {}) => finish(machine(instruction, setup));
const d0 = (e: Emulator) => e.getRegisters()[8] >>> 0;
const bytes = (value: number): Record<number, number> => ({
  8192: value >>> 24,
  8193: (value >>> 16) & 255,
  8194: (value >>> 8) & 255,
  8195: value & 255,
});

describe('Documented arithmetic and logical forms', () => {
  const binary = [
    ['ADD', 'D1', 3, 2, 5, 0],
    ['ADDI', '#2', 3, 2, 5, 0],
    ['ADDQ', '#2', 3, 2, 5, 0],
    ['SUB', 'D1', 3, 2, 1, 0],
    ['SUBI', '#2', 3, 2, 1, 0],
    ['SUBQ', '#2', 3, 2, 1, 0],
    ['ADDX', 'D1', 3, 2, 6, 0],
    ['SUBX', 'D1', 3, 2, 0, 0x04],
    ['AND', 'D1', 7, 2, 2, 0x10],
    ['ANDI', '#2', 7, 2, 2, 0x10],
    ['OR', 'D1', 4, 2, 6, 0x10],
    ['ORI', '#2', 4, 2, 6, 0x10],
    ['EOR', 'D1', 7, 2, 5, 0x10],
    ['EORI', '#2', 7, 2, 5, 0x10],
  ] as const;
  for (const suffix of ['B', 'W', 'L']) {
    it.each(binary)(
      `%s.${suffix} register result and flags`,
      (op, source, before, input, expected, flags) => {
        const upper = suffix === 'L' ? 0 : 0xabcd0000;
        const e = run(`${op}.${suffix} ${source},D0`, {
          registers: { 8: upper | before, 9: input },
          ccr: 0x14,
        });
        expect(d0(e)).toBe((upper | expected) >>> 0);
        expect(e.getCCR()).toBe(flags);
      }
    );
    it.each(binary.filter(([op]) => op !== 'ADDX' && op !== 'SUBX'))(
      `%s.${suffix} memory destination`,
      (op, source, before, input, expected, flags) => {
        const address = suffix === 'B' ? 8195 : suffix === 'W' ? 8194 : 8192;
        const e = run(`${op}.${suffix} ${source},(A0)+`, {
          registers: { 0: address, 9: input },
          memory: bytes(before),
          ccr: 0x14,
        });
        expect(e.readLong(8192)).toBe(expected);
        expect(e.getRegisters()[0]).toBe(8196);
        expect(e.getCCR()).toBe(flags);
      }
    );
    it.each(['CMP', 'CMPI', 'CMPM'])(`%s.${suffix} preserves operands and X`, (op) => {
      const address = suffix === 'B' ? 8195 : suffix === 'W' ? 8194 : 8192;
      const e = run(
        `${op}.${suffix} ${op === 'CMP' ? 'D1,D0' : op === 'CMPI' ? '#3,(A0)+' : '(A1)+,(A0)+'}`,
        {
          registers: { 0: address, 1: address, 8: 3, 9: 3 },
          memory: bytes(3),
          ccr: 0x1f,
        }
      );
      expect(e.getCCR()).toBe(0x14);
      expect(e.readLong(8192)).toBe(3);
      expect(d0(e)).toBe(3);
      if (op !== 'CMP') expect(e.getRegisters()[0]).toBe(8196);
      if (op === 'CMPM') expect(e.getRegisters()[1]).toBe(8196);
    });
    it.each(['CLR', 'NEG', 'NEGX', 'NOT', 'TST'])(
      `%s.${suffix} preserves upper register bits`,
      (op) => {
        const mask = suffix === 'B' ? 255 : suffix === 'W' ? 65535 : 0xffffffff;
        const upper = suffix === 'L' ? 0 : 0xabcd0000;
        const expected =
          op === 'CLR'
            ? 0
            : op === 'NEG'
              ? mask - 1
              : op === 'NEGX'
                ? mask - 2
                : op === 'NOT'
                  ? mask - 2
                  : 2;
        const flags =
          op === 'CLR' ? 0x14 : op === 'NEG' || op === 'NEGX' ? 0x19 : op === 'NOT' ? 0x18 : 0x10;
        const e = run(`${op}.${suffix} D0`, { registers: { 8: upper | 2 }, ccr: 0x1f });
        expect(d0(e)).toBe((upper | expected) >>> 0);
        expect(e.getCCR()).toBe(flags);
      }
    );
  }
  it.each(['ADD', 'SUB', 'CMP', 'AND', 'OR'])('%s reads displaced memory', (op) => {
    const e = run(`${op}.W 2(A0),D0`, {
      registers: { 0: 8192, 8: 7 },
      memory: bytes(3),
      ccr: 0x10,
    });
    expect(d0(e)).toBe({ ADD: 10, SUB: 4, CMP: 7, AND: 3, OR: 7 }[op]);
    expect(e.getRegisters()[0]).toBe(8192);
  });
  it.each(['MOVEA', 'ADDA', 'SUBA', 'CMPA'])(
    '%s.W sign extends memory to a full address register',
    (op) => {
      const e = run(`${op}.W 2(A0),A1`, {
        registers: { 0: 8192, 1: 0x10000 },
        memory: bytes(0xffff),
        ccr: 0x1f,
      });
      expect(e.getRegisters()[1] >>> 0).toBe(
        { MOVEA: 0xffffffff, ADDA: 0xffff, SUBA: 0x10001, CMPA: 0x10000 }[op]
      );
      expect(e.getCCR()).toBe(op === 'CMPA' ? 0x11 : 0x1f);
    }
  );
  it.each(['ADDX', 'SUBX'])(
    '%s with the same predecrement register resolves source before destination',
    (op) => {
      const e = run(`${op}.B -(A0),-(A0)`, {
        registers: { 0: 8196 },
        memory: bytes(0x0502),
        ccr: 0x14,
      });
      expect(e.getRegisters()[0]).toBe(8194);
      expect(e.readByte(8194)).toBe(op === 'ADDX' ? 8 : 2);
      expect(e.readByte(8195)).toBe(2);
    }
  );
  it('CMPM with the same register reads consecutive values', () => {
    const e = run('CMPM.B (A0)+,(A0)+', {
      registers: { 0: 8194 },
      memory: bytes(0x0205),
      ccr: 0x10,
    });
    expect(e.getRegisters()[0]).toBe(8196);
    expect(e.getCCR()).toBe(0x10);
  });
  it.each(['ADDQ.W #1,A0', 'SUBQ.W #1,A0'])(
    '%s changes the full address without flags',
    (instruction) => {
      const e = run(instruction, { registers: { 0: 0xffff }, ccr: 0x1f });
      expect(e.getRegisters()[0]).toBe(instruction.startsWith('ADD') ? 0x10000 : 0xfffe);
      expect(e.getCCR()).toBe(0x1f);
    }
  );
  it.each(['AND', 'OR', 'EOR', 'NOT', 'LSL', 'ASR'])('%s defaults to word size', (op) => {
    const instruction =
      op === 'NOT' ? 'NOT D0' : op === 'LSL' || op === 'ASR' ? `${op} #1,D0` : `${op} D1,D0`;
    const e = run(instruction, { registers: { 8: 0xabcd0002, 9: 1 } });
    expect(d0(e) >>> 16).toBe(0xabcd);
  });
});

describe('Addressing and data movement', () => {
  it.each([
    '(A0)',
    '(A0)+',
    '-(A0)',
    '2(A0)',
    '(2,A0)',
    '-2(A0)',
    '(2,A0,D1.W)',
    '2(A0,A1.L)',
    '$2000',
    '($2000).W',
    '$2000.L',
  ])('MOVE.W reads %s', (operand) => {
    const start = operand.startsWith('-(')
      ? 8194
      : operand.startsWith('-2')
        ? 8194
        : operand.includes('2') && operand.includes('A0')
          ? 8190
          : 8192;
    const e = run(`MOVE.W ${operand},D0`, {
      registers: { 0: start, 1: 0, 8: 0xabcd1234, 9: 0 },
      memory: bytes(0x80000000),
      ccr: 0x11,
    });
    expect(d0(e)).toBe(0xabcd8000);
    expect(e.getCCR()).toBe(0x18);
  });
  it('distinguishes displacements of +1 and -1 from address updates', () => {
    const e = run('MOVE.B 1(A0),D0\nMOVE.B -1(A0),D1', {
      registers: { 0: 8193 },
      memory: bytes(0x12003400),
    });
    expect(d0(e)).toBe(0x34);
    expect(e.getRegisters()[9]).toBe(0x12);
    expect(e.getRegisters()[0]).toBe(8193);
  });
  it('handles decimal displacements and signed word indexes', () => {
    const e = run('MOVE.B 10(A0,D1.W),D0', {
      registers: { 0: 8184, 9: 0xffff },
      memory: bytes(0x00120000),
    });
    expect(d0(e)).toBe(0x12);
  });
  it.each(['MOVE.B (SP)+,D0', 'MOVE.B -(SP),D0', 'ADDQ.B #1,(SP)+', 'TAS (SP)+', 'SNE (SP)+'])(
    '%s uses an A7 byte stride of two',
    (instruction) => {
      const decrement = instruction.includes('-(');
      const e = run(instruction, {
        registers: { 7: decrement ? 8194 : 8192 },
        memory: bytes(0x12000000),
      });
      expect(e.getRegisters()[7]).toBe(decrement ? 8192 : 8194);
    }
  );
  it('MOVEs through aliased source/destination address updates', () => {
    const e = run('MOVE.B (A0)+,(A0)+', { registers: { 0: 8192 }, memory: bytes(0x12000000) });
    expect(e.getRegisters()[0]).toBe(8194);
    expect(e.readWord(8192)).toBe(0x1212);
  });
  it('sign extends absolute short addresses and wraps 32-bit memory addresses', () => {
    const e = run('MOVE.W #$1234,($FFFE).W\nMOVE.W ($FFFE).W,D0');
    expect(d0(e)).toBe(0x1234);
    expect(e.readWord(0xfffffffe)).toBe(0x1234);
  });
  it('reads PC-relative data with numeric displacement and symbolic expressions', () => {
    const e = new Emulator('ORG $1000\nMOVE.W 6(PC),D0\nBRA DONE\nDATA: DC.W $1234\nDONE:\nEND');
    finish(e);
    expect(d0(e)).toBe(0x1234);
    const symbolic = new Emulator(
      'ORG $1000\nMOVE.W (DATA,PC,D1.W),D0\nBRA DONE\nDATA: DC.W $1234,$5678\nDONE:\nEND'
    );
    symbolic.getRegisters()[9] = 2;
    finish(symbolic);
    expect(d0(symbolic)).toBe(0x5678);
  });
  it('LEA/PEA use addresses, including code labels, without reading memory or changing CCR', () => {
    const e = run('LEA 4(A0,D1.W),A1\nPEA 4(A0,D1.W)\nMOVEA.L (SP)+,A2', {
      registers: { 0: 8192, 9: 0xfffe },
      ccr: 0x1f,
    });
    expect(e.getRegisters()[1]).toBe(8194);
    expect(e.getRegisters()[2]).toBe(8194);
    expect(e.getRegisters()[7]).toBe(0x8000);
    expect(e.getCCR()).toBe(0x1f);
    const label = run('LEA FINISH,A0\nPEA FINISH\nMOVEA.L (SP)+,A1\nBRA FINISH\nFINISH: NOP');
    expect(label.getRegisters()[0]).toBe(label.getRegisters()[1]);
    expect(label.getRegisters()[0]).toBe(0x1014);
  });
  it.each([-128, -1, 0, 127])('MOVEQ #%i sign extends an eight-bit constant', (value) => {
    const e = run(`MOVEQ #${value},D0`, { registers: { 8: 0x12345678 }, ccr: 0x1f });
    expect(d0(e)).toBe(value >>> 0);
    expect(e.getCCR()).toBe(0x10 | (value < 0 ? 8 : value === 0 ? 4 : 0));
  });
  it('SWAP uses an unsigned upper half and EXT.W replaces all of the low word', () => {
    expect(d0(run('SWAP D0', { registers: { 8: 0x80001234 } }))).toBe(0x12348000);
    expect(d0(run('EXT.W D0', { registers: { 8: 0x12345680 } }))).toBe(0x1234ff80);
    expect(d0(run('EXT.W D0', { registers: { 8: 0x1234ff7f } }))).toBe(0x1234007f);
    expect(d0(run('EXT.L D0', { registers: { 8: 0x12348000 } }))).toBe(0xffff8000);
  });
  it.each(['D0,D1', 'A0,A1', 'D0,A0', 'A0,D0'])(
    'EXG %s exchanges full registers without flags',
    (operands) => {
      const reg = (s: string) => Number(s[1]) + (s[0] === 'D' ? 8 : 0);
      const [a, b] = operands.split(',').map(reg);
      const e = run(`EXG ${operands}`, {
        registers: { [a]: 0x12345678, [b]: 0x87654321 },
        ccr: 0x1f,
      });
      expect(e.getRegisters()[a] >>> 0).toBe(0x87654321);
      expect(e.getRegisters()[b] >>> 0).toBe(0x12345678);
      expect(e.getCCR()).toBe(0x1f);
    }
  );
  it('retains MODE as a flag-preserving extension', () => {
    const e = run('MODE #$12345678,D0\nMODE D0,A0', { ccr: 0x1f });
    expect(d0(e)).toBe(0x12345678);
    expect(e.getRegisters()[0]).toBe(0x12345678);
    expect(e.getCCR()).toBe(0x1f);
  });
});

describe('MOVEM and MOVEP memory layouts', () => {
  it.each(['W', 'L'])(
    'MOVEM.%s predecrement stores An before Dn and restores all registers',
    (suffix) => {
      const stride = suffix === 'L' ? 4 : 2;
      const e = run(`MOVEM.${suffix} D0-D1/A0-A1,-(SP)`, {
        registers: { 0: 0x1234, 1: 0x5678, 8: 0x9abc, 9: 0xdef0 },
        ccr: 0x1f,
      });
      const sp = 0x8000 - stride * 4;
      expect(e.getRegisters()[7]).toBe(sp);
      const read = (a: number) => (suffix === 'W' ? e.readWord(a) : e.readLong(a));
      expect([0, 1, 2, 3].map((i) => read(sp + i * stride))).toEqual([
        0x9abc, 0xdef0, 0x1234, 0x5678,
      ]);
      expect(e.getCCR()).toBe(0x1f);
      const roundtrip = run(
        `MOVEM.${suffix} D0-D1/A0-A1,-(SP)\nMOVEM.${suffix} (SP)+,D0-D1/A0-A1`,
        { registers: { 0: 0x1234, 1: 0x5678, 8: 0x9abc, 9: 0xdef0 } }
      );
      expect(d0(roundtrip)).toBe(suffix === 'W' ? 0xffff9abc : 0x9abc);
      expect(roundtrip.getRegisters()[7]).toBe(0x8000);
    }
  );
  it.each(['(A0)', '(A0)+', '$2000'])(
    'MOVEM.W %s sign extends words into data and address registers',
    (source) => {
      const e = run(`MOVEM.W ${source},D0/A1`, {
        registers: { 0: 8192 },
        memory: bytes(0x8000ffff),
        ccr: 0x1f,
      });
      expect(d0(e)).toBe(0xffff8000);
      expect(e.getRegisters()[1]).toBe(-1);
      expect(e.getCCR()).toBe(0x1f);
    }
  );
  it('MOVEM handles a single register with absolute memory and includes the original stack pointer', () => {
    const e = run('MOVEM.L D0,$2000\nMOVEM.L $2000,D1\nMOVEM.L D0/SP,-(SP)', {
      registers: { 8: 0x12345678 },
    });
    expect(e.getRegisters()[9]).toBe(0x12345678);
    expect(e.readLong(0x7ffc)).toBe(0x8000);
    expect(e.readLong(0x7ff8)).toBe(0x12345678);
  });
  it('MOVEM postincrement overrides a loaded base register', () => {
    const e = run('MOVEM.L (A0)+,D0/A0', { registers: { 0: 8192 }, memory: bytes(0x12345678) });
    expect(d0(e)).toBe(0x12345678);
    expect(e.getRegisters()[0]).toBe(8200);
  });
  it.each(['W', 'L'])(
    'MOVEP.%s transfers alternate bytes both ways and preserves flags',
    (suffix) => {
      const e = run(`MOVEP.${suffix} D0,1(A0)\nMOVEP.${suffix} 1(A0),D1`, {
        registers: { 0: 8192, 8: 0x12345678, 9: 0xabcd0000 },
        ccr: 0x1f,
      });
      expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => e.readByte(8192 + i))).toEqual(
        suffix === 'W' ? [0, 0x56, 0, 0x78, 0, 0, 0, 0] : [0, 0x12, 0, 0x34, 0, 0x56, 0, 0x78]
      );
      expect(e.getRegisters()[9] >>> 0).toBe(suffix === 'W' ? 0xabcd5678 : 0x12345678);
      expect(e.getRegisters()[0]).toBe(8192);
      expect(e.getCCR()).toBe(0x1f);
    }
  );
});

describe('Multiply, divide, and check bounds', () => {
  it.each([
    ['MULS.W', 0xffff, 2, 0xfffffffe, 0x18],
    ['MULU.W', 0xffff, 0xffff, 0xfffe0001, 0x18],
    ['DIVS.W', 3, -7, 0xfffffffe, 0x18],
    ['DIVS.W', 0xfffd, 7, 0x0001fffe, 0x18],
    ['DIVU.W', 2, 0x10000, 0x8000, 0x18],
    ['DIVU.W', 3, 7, 0x10002, 0x10],
    ['DIVU.W', 2, 1, 0x10000, 0x14],
  ] as const)(
    '%s uses a word source and long destination',
    (op, source, dividend, expected, flags) => {
      const e = run(`${op} 2(A0),D0`, {
        registers: { 0: 8192, 8: dividend },
        memory: bytes(source),
        ccr: 0x1f,
      });
      expect(d0(e)).toBe(expected);
      expect(e.getCCR()).toBe(flags);
    }
  );
  it.each([
    ['DIVU', 1, 65536],
    ['DIVS', 1, 32768],
    ['DIVS', -1, -32768],
    ['DIVS', 1, -32769],
  ] as const)('%s overflow leaves the dividend unchanged', (op, divisor, dividend) => {
    const e = run(`${op}.W D1,D0`, { registers: { 8: dividend, 9: divisor }, ccr: 0x11 });
    expect(d0(e)).toBe(dividend >>> 0);
    expect(e.getCCR() & 0x13).toBe(0x12);
  });
  it.each(['DIVU', 'DIVS'])('%s traps when the low word of the divisor is zero', (op) => {
    const e = machine(`${op}.W D1,D0`, { registers: { 8: 123, 9: 0x10000 }, ccr: 0x10 });
    finish(e, 'Division by zero');
    expect(d0(e)).toBe(123);
    expect(e.readLong(0x7ffc)).toBe(0x1008);
    expect(e.readWord(0x7ffa)).toBe(0x2010);
  });
  it.each([0, 5])('CHK permits in-range low word %i and ignores upper bits', (value) => {
    const e = run('CHK.W #5,D0', { registers: { 8: 0xabcd0000 | value }, ccr: 0x10 });
    expect(e.getCCR()).toBe(0x10);
  });
  it.each([-1, 6])('CHK raises an exception with defined N for %i', (value) => {
    const e = machine('CHK.W 2(A0),D0', {
      registers: { 0: 8192, 8: value },
      memory: bytes(5),
      ccr: 0,
    });
    finish(e, 'CHK: Value out of bounds');
    expect(e.getNFlag()).toBe(value < 0 ? 1 : 0);
  });
});

// Independent truth table: bit positions below follow the reference's N/Z/V/C order.
const truths: Record<string, (n: boolean, z: boolean, v: boolean, c: boolean) => boolean> = {
  HI: (_n, z, _v, c) => !(c || z),
  LS: (_n, z, _v, c) => c || z,
  CC: (_n, _z, _v, c) => !c,
  CS: (_n, _z, _v, c) => c,
  NE: (_n, z) => !z,
  EQ: (_n, z) => z,
  VC: (_n, _z, v) => !v,
  VS: (_n, _z, v) => v,
  PL: (n) => !n,
  MI: (n) => n,
  GE: (n, _z, v) => n === v,
  LT: (n, _z, v) => n !== v,
  GT: (n, z, v) => n === v && !z,
  LE: (n, z, v) => n !== v || z,
  F: () => false,
  T: () => true,
};
describe('Every conditional mnemonic over every CCR combination', () => {
  for (const [cc, truth] of Object.entries(truths)) {
    it(`${cc}: Bcc, DBcc and Scc agree with the documented truth table`, () => {
      for (let ccr = 0; ccr < 32; ccr++) {
        const expected = truth(!!(ccr & 8), !!(ccr & 4), !!(ccr & 2), !!(ccr & 1));
        if (cc !== 'T' && cc !== 'F') {
          const e = run(`B${cc} TAKEN\nMODE #1,D0\nBRA DONE\nTAKEN:\nMODE #2,D0\nDONE:`, { ccr });
          expect(d0(e), `B${cc} CCR=${ccr}`).toBe(expected ? 2 : 1);
          expect(e.getCCR()).toBe(ccr);
        }
        for (const counter of [0, 1, 0xffff]) {
          const e = run(`DB${cc} D1,TAKEN\nMODE #1,D0\nBRA DONE\nTAKEN:\nMODE #2,D0\nDONE:`, {
            ccr,
            registers: { 9: 0xabcd0000 | counter },
          });
          expect(e.getRegisters()[9] >>> 0).toBe(
            (0xabcd0000 | (expected ? counter : (counter - 1) & 65535)) >>> 0
          );
          expect(d0(e)).toBe(!expected && counter !== 0 ? 2 : 1);
          expect(e.getCCR()).toBe(ccr);
        }
        const set = run(`S${cc} D0\nS${cc} (A0)+`, { ccr, registers: { 0: 8192, 8: 0xabcd1200 } });
        expect(d0(set)).toBe(expected ? 0xabcd12ff : 0xabcd1200);
        expect(set.readByte(8192)).toBe(expected ? 255 : 0);
        expect(set.getRegisters()[0]).toBe(8193);
        expect(set.getCCR()).toBe(ccr);
      }
    });
  }
});

describe('Bit instructions', () => {
  for (const name of ['BTST', 'BSET', 'BCLR', 'BCHG']) {
    it(`${name} tests the old bit and updates only Z`, () => {
      for (const before of [0, 0x80000000]) {
        const e = run(`${name} D1,D0`, { registers: { 8: before, 9: 63 }, ccr: 0x1b });
        expect(e.getCCR()).toBe(before ? 0x1b : 0x1f);
        const value =
          name === 'BTST'
            ? before
            : name === 'BSET'
              ? 0x80000000
              : name === 'BCLR'
                ? 0
                : before ^ 0x80000000;
        expect(d0(e)).toBe(value >>> 0);
      }
    });
    it(`${name} uses modulo 8 for memory and updates an address once`, () => {
      const e = run(`${name} #15,(A0)+`, {
        registers: { 0: 8192 },
        memory: bytes(0x80000000),
        ccr: 0x1f,
      });
      expect(e.getCCR()).toBe(0x1b);
      expect(e.getRegisters()[0]).toBe(8193);
      expect(e.readByte(8192)).toBe(name === 'BCLR' || name === 'BCHG' ? 0 : 0x80);
    });
  }
  it.each([0, 0x80, 0x7f])('TAS flags describe the original byte %i and clear C/V', (before) => {
    const e = run('TAS (A0)+', { registers: { 0: 8192 }, memory: { 8192: before }, ccr: 0x1f });
    expect(e.readByte(8192)).toBe(before | 0x80);
    expect(e.getCCR()).toBe(0x10 | (before === 0 ? 4 : before === 0x80 ? 8 : 0));
  });
});

describe('PC extension-word offsets and pointer data', () => {
  it.each(['BTST #7,4(PC)', 'BTST D0,6(PC)'])(
    '%s uses the address of its EA extension word',
    (instruction) => {
      const e = new Emulator(`ORG $1000\n${instruction}\nBRA DONE\nDATA: DC.B $80\nDONE:\nEND`);
      e.getRegisters()[8] = 7;
      e.setSR(0x2010);
      finish(e);
      expect(e.getCCR()).toBe(0x10);
    }
  );
  it.each(['4(PC)', '(DATA,PC)'])(
    'MOVEM.W %s accounts for the preceding register mask',
    (source) => {
      const e = new Emulator(
        `ORG $1000\nMOVEM.W ${source},D0\nBRA DONE\nDATA: DC.W $8000\nDONE:\nEND`
      );
      finish(e);
      expect(d0(e)).toBe(0xffff8000);
    }
  );
  it('DC.L code pointers contain virtual addresses usable by JMP', () => {
    const e = new Emulator(
      'ORG $1000\nMOVEA.L POINTER,A0\nJMP (A0)\nMOVEQ #99,D0\nTARGET: MOVEQ #7,D0\nBRA DONE\nPOINTER: DC.L TARGET\nDONE:\nEND'
    );
    finish(e);
    expect(d0(e)).toBe(7);
    expect(e.readLong(e.getDataAddresses().pointer)).toBe(0x100c);
  });
  it('character immediates may contain comment delimiters', () => {
    const e = run("MOVE.B #';',D0 ; a comment\nMOVE.B #'*',D1");
    expect(d0(e)).toBe(59);
    expect(e.getRegisters()[9]).toBe(42);
  });
});

describe('Expression order and PC-relative address wrapping', () => {
  it.each([
    ['10-3-2', 5],
    ['10-3+2', 9],
    ['-10+3-2', -9],
    ['10--3-2', 11],
    ['$10-%11-0x2', 11],
    ["'A'-1-2", 62],
    ['+10 + -3 - +2', 5],
  ] as const)('evaluates %s left to right', (expression, expected) => {
    expect(d0(run(`MOVE.L #${expression},D0`))).toBe(expected >>> 0);
  });
  it('evaluates chained arithmetic in symbolic immediates and displacements', () => {
    const e = new Emulator('ORG $1000\nMOVE.L #DEST-3-2,D0\nLEA 10-3-2(A0),A1\nDEST: NOP\nEND');
    e.getRegisters()[0] = 8192;
    finish(e);
    expect(d0(e)).toBe(0x1003);
    expect(e.getRegisters()[1]).toBe(8197);
  });
  it.each(['LEA (DEST,PC),A0', 'LEA (DEST,PC,D1.W),A0'])(
    '%s crosses the address boundary',
    (instruction) => {
      const e = new Emulator(`ORG $FFFFFFFC\n${instruction}\nDEST: NOP\nEND`);
      finish(e);
      expect(e.getRegisters()[0]).toBe(0);
    }
  );
  it('resolves a wrapped backward symbolic PC-relative target', () => {
    const e = new Emulator('ORG $FFFFFFFC\nDEST: NOP\nLEA (DEST,PC),A0\nEND');
    finish(e);
    expect(e.getRegisters()[0] >>> 0).toBe(0xfffffffc);
  });
  it.each([
    'MOVEM.W (DATA,PC),D0',
    'MOVEM.W (DATA,PC,D1.W),D0',
    'BTST #7,(DATA,PC)',
    'BTST #7,(DATA,PC,D1.W)',
  ])('%s wraps its extra extension-word PC', (instruction) => {
    const e = new Emulator(`ORG $FFFFFFFC\n${instruction}\nBRA DONE\nDATA: DC.W $8000\nDONE:\nEND`);
    finish(e);
    if (instruction.startsWith('MOVEM')) expect(d0(e)).toBe(0xffff8000);
    else expect(e.getZFlag()).toBe(0);
  });
  it.each(['LEA (DEST,PC),A0', 'LEA (DEST,PC,D1.W),A0'])(
    'rejects an oversized target for %s',
    (instruction) => {
      const gap = instruction.includes('D1') ? 128 : 32768;
      const e = new Emulator(
        `ORG $1000\n${instruction}\nORG $${(0x1002 + gap).toString(16)}\nDEST: NOP\nEND`
      );
      e.emulationStep();
      expect(e.emulationStep()).toBe(true);
      expect(e.getErrors().join(' ')).toContain('Displacement out of range');
      expect(e.getRegisters()[0]).toBe(0);
    }
  );
});
