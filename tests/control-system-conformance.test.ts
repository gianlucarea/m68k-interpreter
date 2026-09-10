import { describe, expect, it } from 'vitest';
import { Emulator } from '../src/core/emulator';

function finish(e: Emulator, exception?: string): Emulator {
  let done = false;
  for (let i = 0; i < 100 && !done; i++) done = e.emulationStep();
  expect(done).toBe(true);
  expect(e.getErrors()).toEqual([]);
  expect(e.getException()).toBe(exception);
  return e;
}
function next(e: Emulator, count = 1): void {
  for (let i = 0; i < count; i++) e.emulationStep();
  expect(e.getErrors()).toEqual([]);
}

describe('Calls and returns share virtual addresses', () => {
  for (const call of ['BSR FUN', 'JSR FUN', 'JSR (A1)']) {
    for (const ret of ['RTS', 'MOVEA.L (SP)+,A0\nJMP (A0)']) {
      it(`${call} with ${ret.replace(/\n/g, '; ')} terminates and restores SP`, () => {
        const e = new Emulator(
          `ORG $1000\nMOVEA.L #$1100,SP\n${call}\nBRA DONE\nFUN:\n${ret}\nDONE:\nEND`
        );
        e.getRegisters()[1] = 0x100c;
        next(e, 3); // ORG, MOVEA, call
        expect(e.getRegisters()[7]).toBe(0x10fc);
        expect(e.readLong(0x10fc)).toBe(0x1008);
        expect(e.getPC()).toBe(0x100c);
        finish(e);
        expect(e.getRegisters()[7]).toBe(0x1100);
        if (ret !== 'RTS') expect(e.getRegisters()[0]).toBe(0x1008);
      });
    }
  }
  it('JSR (SP) captures its target before pushing', () => {
    const e = new Emulator('ORG $1000\nJSR (SP)\nBRA DONE\nFUN: RTS\nDONE:\nEND');
    e.getRegisters()[7] = 0x1008;
    next(e, 2);
    expect(e.readLong(0x1004)).toBe(0x1004);
    expect(e.getPC()).toBe(0x1008);
    finish(e);
    expect(e.getRegisters()[7]).toBe(0x1008);
  });
  it('nested BSR/JSR restores each return address without falling into subroutines', () => {
    const e = new Emulator(`ORG $1000
      MOVEA.L #$8000,SP
      BSR FIRST
      ADDQ.L #1,D0
      BRA DONE
      FIRST: JSR SECOND
      ADDQ.L #2,D0
      RTS
      SECOND: ADDQ.L #4,D0
      RTS
      DONE: END`);
    finish(e);
    expect(e.getRegisters()[8]).toBe(7);
    expect(e.getRegisters()[7]).toBe(0x8000);
  });
  it('RTS uses exactly the explicitly stacked address', () => {
    const e = new Emulator(
      'ORG $1000\nMOVEA.L #$8000,SP\nPEA TARGET\nRTS\nMOVEQ #99,D0\nTARGET: MOVEQ #7,D0\nEND'
    );
    finish(e);
    expect(e.getRegisters()[8]).toBe(7);
    expect(e.getRegisters()[7]).toBe(0x8000);
  });
  it.each(['BSR', 'JSR'])(
    '%s retains the virtual return address before an ORG boundary',
    (call) => {
      const e = new Emulator(
        `ORG $1000\nMOVEA.L #$8000,SP\n${call} SUB\nORG $2000\nSUB: MOVE.L (SP),D0\nRTS\nEND`
      );
      finish(e);
      expect(e.getRegisters()[8]).toBe(0x1008);
      expect(e.getRegisters()[7]).toBe(0x8000);
    }
  );
  it('calls without ORG ignore standalone labels in their virtual instruction size', () => {
    const e = new Emulator(
      'MOVEA.L #$8000,SP\nBSR SUB\nAFTER:\nBRA DONE\nSUB:\nMOVEA.L (SP)+,A0\nJMP (A0)\nDONE:\nEND'
    );
    finish(e);
    expect(e.getRegisters()[0]).toBe(8);
    expect(e.getRegisters()[7]).toBe(0x8000);
  });
  it.each(['JMP $1008', 'JMP 8(A0)', 'JMP (8,A0,D1.W)', 'JMP (TARGET,PC)'])(
    '%s uses control addressing modes',
    (jump) => {
      const e = new Emulator(`ORG $1000\n${jump}\nMOVEQ #99,D0\nTARGET: MOVEQ #7,D0\nEND`);
      e.getRegisters()[0] = 0x1000;
      finish(e);
      expect(e.getRegisters()[8]).toBe(7);
    }
  );
  it('unmapped jump addresses halt and retain the requested PC', () => {
    const e = finish(new Emulator('ORG $1000\nJMP $12345678\nEND'));
    expect(e.getPC()).toBe(0x12345678);
  });
  it('supports documented branch aliases and current-location expressions', () => {
    const e = new Emulator('ORG $1000\nMOVEQ #1,D0\nDBRA D0,*\nBHS DONE\nMOVEQ #99,D0\nDONE:\nEND');
    finish(e);
    expect(e.getRegisters()[8]).toBe(0xffff);
  });
});

describe('Status registers, stack frames, and exceptions', () => {
  it.each(['RTR', 'RTE'])(
    '%s restores the appropriate status bits and the virtual PC',
    (instruction) => {
      const e = new Emulator(`ORG $1000
      MOVEA.L #$8000,SP
      PEA TARGET
      MOVE.W #$8705,-(SP)
      ${instruction}
      MOVEQ #99,D0
      TARGET: MODE #7,D0
      END`);
      finish(e);
      expect(e.getRegisters()[8]).toBe(7);
      expect(e.getRegisters()[7]).toBe(0x8000);
      expect(e.getSR()).toBe(instruction === 'RTE' ? 0x8705 : 0x2005);
    }
  );
  it.each([-8, 8, 0xffff])(
    'RTD #%i sign extends its displacement and leaves CCR unchanged',
    (displacement) => {
      const e = new Emulator(
        `ORG $1000\nMOVEA.L #$8000,SP\nPEA TARGET\nRTD #${displacement}\nMOVEQ #99,D0\nTARGET: NOP\nEND`
      );
      e.setSR(0x201f);
      finish(e);
      expect(e.getRegisters()[7]).toBe(0x8000 + (displacement === 0xffff ? -1 : displacement));
      expect(e.getCCR()).toBe(0x1f);
    }
  );
  it('LINK/UNLK establish and collapse a frame with a signed word displacement', () => {
    const e = new Emulator('ORG $1000\nLINK A6,#$FFF0\nUNLK A6\nEND');
    e.getRegisters()[7] = 0x8000;
    e.getRegisters()[6] = 0x12345678;
    e.setSR(0x201f);
    next(e, 2);
    expect(e.getRegisters()[6]).toBe(0x7ffc);
    expect(e.getRegisters()[7]).toBe(0x7fec);
    expect(e.readLong(0x7ffc)).toBe(0x12345678);
    finish(e);
    expect(e.getRegisters()[6]).toBe(0x12345678);
    expect(e.getRegisters()[7]).toBe(0x8000);
    expect(e.getCCR()).toBe(0x1f);
  });
  it('MOVE to/from SR preserves data-register upper bits and masks reserved status bits', () => {
    const e = new Emulator('MOVE.W #$FFFF,SR\nMOVE.W SR,D0\nEND');
    e.getRegisters()[8] = 0x12340000;
    finish(e);
    expect(e.getSR()).toBe(0xa71f);
    expect(e.getRegisters()[8]).toBe(0x1234a71f);
  });
  it('MOVE to CCR reads a word, MOVE from CCR writes a word, both preserve upper SR', () => {
    const e = new Emulator('MOVE.W #$FFFF,CCR\nMOVE.W CCR,D0\nEND');
    e.setSR(0xa700);
    e.getRegisters()[8] = 0x1234ffff;
    finish(e);
    expect(e.getSR()).toBe(0xa71f);
    expect(e.getRegisters()[8]).toBe(0x1234001f);
  });
  it.each([
    ['ANDI.B #$F0,CCR', 0xa710],
    ['ORI.B #$01,CCR', 0xa71f],
    ['EORI.B #$1F,CCR', 0xa700],
    ['ANDI.W #$F8FF,SR', 0xa01f],
    ['ORI.W #$0700,SR', 0xa71f],
    ['EORI.W #$0700,SR', 0xa01f],
  ] as const)('%s updates only its documented status field', (instruction, expected) => {
    const e = new Emulator(`${instruction}\nEND`);
    e.setSR(0xa71f);
    finish(e);
    expect(e.getSR()).toBe(expected);
  });
  it.each([
    'RESET',
    'RTE',
    'STOP #$2700',
    'MOVE.W (A0)+,SR',
    'ANDI.W #$FFFF,SR',
    'ORI.W #$2000,SR',
    'EORI.W #$2000,SR',
  ])('%s traps before operand side effects in user mode', (instruction) => {
    const e = new Emulator(`ORG $1000\n${instruction}\nEND`);
    e.getRegisters()[7] = 0x8000;
    e.getRegisters()[0] = 8192;
    e.setSR(0x0705);
    finish(e, 'Privilege violation');
    expect(e.getRegisters()[0]).toBe(8192);
    expect(e.getRegisters()[7]).toBe(0x7ffa);
    expect(e.readWord(0x7ffa)).toBe(0x0705);
    expect(e.readLong(0x7ffc)).toBe(0x1000);
    expect(e.getSR()).toBe(0x2705);
  });
  it('MOVE from SR remains unprivileged under the 68000 model', () => {
    const e = new Emulator('MOVE.W SR,D0\nEND');
    e.setSR(0x0705);
    finish(e);
    expect(e.getRegisters()[8]).toBe(0x0705);
  });
  it('STOP loads status and halts at the next virtual instruction', () => {
    const e = new Emulator('ORG $1000\nSTOP #$2705\nMOVEQ #99,D0\nEND');
    finish(e);
    expect(e.getSR()).toBe(0x2705);
    expect(e.getPC()).toBe(0x1004);
    expect(e.getRegisters()[8]).toBe(0);
    expect(e.emulationStep()).toBe(true);
    expect(e.getPC()).toBe(0x1004);
  });
  it('STOP may load user mode when executed from supervisor mode (Motorola PRM)', () => {
    const e = new Emulator('ORG $1000\nSTOP #0\nEND');
    e.getRegisters()[7] = 0x8000;
    finish(e);
    expect(e.getSR()).toBe(0);
    expect(e.getPC()).toBe(0x1004);
    expect(e.getRegisters()[7]).toBe(0x8000);
  });
  it.each([0, 15])('TRAP #%i stacks a complete SR and next virtual PC', (vector) => {
    const e = new Emulator(`ORG $1000\nTRAP #${vector}\nEND`);
    e.getRegisters()[7] = 0x8000;
    e.setSR(0xa71f);
    finish(e, `TRAP #${vector}`);
    expect(e.readWord(0x7ffa)).toBe(0xa71f);
    expect(e.readLong(0x7ffc)).toBe(0x1004);
    expect(e.getSR()).toBe(0x271f);
  });
  it.each([false, true])('operandless TRAPV only traps when V is set (%s)', (overflow) => {
    const e = new Emulator('ORG $1000\nTRAPV\nEND');
    e.getRegisters()[7] = 0x8000;
    e.setSR(overflow ? 0x2012 : 0x2010);
    finish(e, overflow ? 'TRAPV' : undefined);
    expect(e.getRegisters()[7]).toBe(overflow ? 0x7ffa : 0x8000);
    if (overflow) expect(e.readLong(0x7ffc)).toBe(0x1004);
  });
  it.each(['NOP', 'RESET'])('%s preserves processor state in supervisor mode', (instruction) => {
    const e = new Emulator(`${instruction}\nEND`);
    e.setSR(0xa71f);
    e.getRegisters()[8] = 0x12345678;
    finish(e);
    expect(e.getSR()).toBe(0xa71f);
    expect(e.getRegisters()[8]).toBe(0x12345678);
    expect(e.getMemory()).toEqual({});
  });
});

describe('Undo and reset retain coherent execution state', () => {
  it.each(['STOP #$2705', 'TRAP #3', 'ORI.W #$0700,SR', 'MOVE.W #$0005,SR'])(
    'undo restores status, PC, and exception after %s',
    (instruction) => {
      const e = new Emulator(`ORG $1000\n${instruction}\nEND`);
      e.setSR(0x2010);
      e.getRegisters()[7] = 0x8000;
      next(e); // ORG
      const before = {
        sr: e.getSR(),
        pc: e.getPC(),
        registers: Array.from(e.getRegisters()),
        memory: e.getMemory(),
      };
      next(e);
      e.undoFromStack();
      expect(e.getSR()).toBe(before.sr);
      expect(e.getPC()).toBe(before.pc);
      expect(Array.from(e.getRegisters())).toEqual(before.registers);
      expect(e.getMemory()).toEqual(before.memory);
      expect(e.getException()).toBeUndefined();
      next(e); // Instruction can execute again after undo.
    }
  );
  it('reset restores initialized data, supervisor mode, and a runnable PC', () => {
    const e = new Emulator('ORG $1000\nMOVE.W #$2222,DATA\nSTOP #$2705\nDATA: DC.W $1111\nEND');
    finish(e);
    const address = e.getDataAddresses().data;
    expect(e.readWord(address)).toBe(0x2222);
    e.reset();
    expect(e.getSR()).toBe(0x2000);
    expect(e.readWord(address)).toBe(0x1111);
    expect(e.getPC()).toBe(0x1000);
    finish(e);
    expect(e.readWord(address)).toBe(0x2222);
  });
});

it('large ORG gaps remain sparse and returning into a gap halts at its boundary', () => {
  const e = new Emulator('ORG $1000\nMOVEA.L #$8000,SP\nBSR SUB\nORG $FFFF0000\nSUB: RTS\nEND');
  finish(e);
  expect(e.getRegisters()[7]).toBe(0x8000);
  expect(e.readLong(0x7ffc)).toBe(0x1008);
  expect(e.emulationStep()).toBe(true);
});
it('return addresses and virtual instructions wrap at 32 bits', () => {
  const e = new Emulator(
    'ORG $FFFFFFF8\nMOVEA.L #$8000,SP\nBSR FUN\nBRA DONE\nFUN: RTS\nDONE:\nEND'
  );
  finish(e);
  expect(e.readLong(0x7ffc)).toBe(0);
  expect(e.getRegisters()[7]).toBe(0x8000);
});
