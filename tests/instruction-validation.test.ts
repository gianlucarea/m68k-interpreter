import { describe, expect, it } from 'vitest';
import { Emulator } from '../src/core/emulator';
import { instructionSpecs } from '../src/core/instructions';

function reject(instruction: string): void {
  const e = new Emulator(`${instruction}\nEND`);
  e.getRegisters()[0] = 0x2000;
  e.getRegisters()[7] = 0x8000;
  e.getRegisters()[8] = 0x12345678;
  e.setSR(0xa71f);
  const before = Array.from(e.getRegisters());
  expect(e.emulationStep(), instruction).toBe(true);
  expect(e.getErrors().length, instruction).toBeGreaterThan(0);
  expect(e.getException()).toBeUndefined();
  expect(Array.from(e.getRegisters()), instruction).toEqual(before);
  expect(e.getMemory(), instruction).toEqual({});
  expect(e.getSR(), instruction).toBe(0xa71f);
}

describe('All dispatched mnemonics reject invalid arity and size before execution', () => {
  it.each(Object.entries(instructionSpecs))('%s', (name, spec) => {
    reject(`${name}.x`);
    reject(`${name} D0,D1,D2`);
    if (spec.count === 0) reject(`${name} D0`);
    else reject(name);
  });
});
describe('Illegal operand forms have no register, memory, or status side effects', () => {
  it.each([
    'MOVE.B A0,D0',
    'MOVE.B D0,A0',
    'MOVE.L (A0)+,#3',
    'MOVE.W CCR,SR',
    'MOVE.W SR,CCR',
    'MOVE.B #1,CCR',
    'MOVE.L #1,SR',
    'MOVE.L (A0)+,(4,PC)',
    'MOVE #999999,D0',
    'MOVEQ #128,D0',
    'MOVEQ #-129,D0',
    'MOVEQ #$FF,D0',
    'MOVEQ.W #1,D0',
    'MOVEQ #1,A0',
    'MOVEA.B #1,A0',
    'MOVEA.W (A0)+,D0',
    'LEA (A0)+,A1',
    'LEA #$2000,A1',
    'LEA (A0),D0',
    'PEA -(A0)',
    'ADD.B A0,D0',
    'ADD.W (A0)+,(A1)',
    'ADD.W D0,A0',
    'ADDA.B #1,A0',
    'ADDA.W (A0)+,D0',
    'ADDI.W D0,(A0)+',
    'ADDI.W #1,A0',
    'ADDQ.B #1,A0',
    'ADDQ.W #0,(A0)+',
    'ADDQ.W #9,D0',
    'SUBA.B #1,A0',
    'SUBI.W (A0)+,D0',
    'SUBQ.W #-1,(A0)+',
    'SUBQ.B #1,A0',
    'ADDX.W #1,D0',
    'ADDX.W (A0)+,(A1)+',
    'SUBX.W -(A0),D0',
    'SUBX.W D0,-(A0)',
    'CMP.W (A0)+,A1',
    'CMPA.B #1,A0',
    'CMPI.W #1,A0',
    'CMPI.W #1,4(PC)',
    'CMPM.W (A0)+,D0',
    'AND.W A0,D0',
    'AND.W D0,A0',
    'ANDI.W D0,(A0)+',
    'OR.W (A0)+,(A1)',
    'ORI.W #1,A0',
    'EOR.W #1,D0',
    'EOR.W (A0)+,D0',
    'EORI.W D0,(A0)+',
    'ANDI.W #$FF,CCR',
    'ORI.L #1,SR',
    'EORI.B #$100,CCR',
    'CLR.W A0',
    'NEG.W A0',
    'NEGX.W #1',
    'NOT.W A0',
    'TST.W #1',
    'TST.W A0',
    'TST.W 4(PC)',
    'SWAP A0',
    'SWAP.L D0',
    'EXT.B D0',
    'EXT.W (A0)+',
    'EXG.W D0,D1',
    'EXG D0,(A0)+',
    'MULS.B D0,D1',
    'MULU.L D0,D1',
    'MULU.W D0,A0',
    'DIVS.L D0,D1',
    'DIVU.W A0,D0',
    'CHK.L #10,D0',
    'CHK.W #10,A0',
    'LSL.L #0,D0',
    'LSR.B #9,D0',
    'ASL.W #1,A0',
    'ASR.W A0,D0',
    'ROL.W #1,(A0)+',
    'ROR.B (A0)+',
    'ROXL.L (A0)+',
    'ROXR.W D0',
    'LSL.W (4,PC)',
    'BTST #0,A0',
    'BTST #256,D0',
    'BSET #1,#1',
    'BCLR.W #1,D0',
    'BCHG.L #1,(A0)+',
    'BTST.B #1,D0',
    'BSET #0,4(PC)',
    'SCC.W (A0)+',
    'SEQ A0',
    'ST (4,PC)',
    'BRA #$1000',
    'BSR (A0)+',
    'BNE.L $1000',
    'DBNE A0,$1000',
    'DBF.L D0,$1000',
    'JMP (A0)+',
    'JSR -(A0)',
    'JSR #$1000',
    'JSR unknown_label',
    'RTS #1',
    'RTR.W',
    'RTE #0',
    'RTD D0',
    'RTD #65536',
    'TRAP #16',
    'TRAP #-1',
    'TRAP D0',
    'TRAPV #1',
    'NOP #0',
    'RESET.W',
    'STOP D0',
    'LINK A0,D0',
    'LINK.L A0,#0',
    'LINK A0,#65536',
    'UNLK D0',
    'TAS A0',
    'TAS #0',
    'TAS.W (A0)+',
    'MOVEP.B D0,0(A0)',
    'MOVEP.W D0,(A0)+',
    'MOVEP.W 0(PC),D0',
    'MOVEP.W A0,0(A1)',
    'MOVEM.B D0-D1,(A0)',
    'MOVEM.W D0-D1,(A0)+',
    'MOVEM.W -(A0),D0-D1',
    'MOVEM.L D3-D0,(A0)',
    'MOVEM.L D0/typo,-(A0)',
    'MOVEM.L D0-D9,-(A0)',
    'MOVEM.L D0-D1,4(PC)',
    'MODE (A0)+,D0',
    'MODE #1,(A0)',
    'MOVE.W #1garbage,(A0)+',
    'MOVE.W #$GG,(A0)+',
    'MOVE.L #4294967296,(A0)+',
    'MOVE.W 65536(A0),D0',
    'MOVE.W -32769(A0),D0',
    'MOVE.W 256(A0,D1.W),D0',
    'MOVE.W (A0,D1.L*2),D0',
    'MOVE.W (A0,D1.B),D0',
    'MOVE.W (A0,D1,D2),D0',
    'MOVE.W (D0),D1',
    'MOVE.W (A8),D0',
    'MOVE.W (A0,D1.W,D2.W),D0',
    'MOVE.W (A0,D0.W,D1.W',
    'MOVE.W D0,,(A0)+',
    'MOVE.W D0,(A0)+,',
    'MOVE.W #1.0,D0',
  ])('%s', reject);
});

it.each(['10-', '10+', '10 3', '10-3garbage', '10/2', '10+unknown', '9007199254740992-1'])(
  'rejects malformed or unsafe expression %s',
  (value) => {
    reject(`MOVE.L #${value},(A0)+`);
  }
);
