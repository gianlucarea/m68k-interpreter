/// <reference types="node" />

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('Bubble sort example', () => {
  it('supports displacement with MOVE.W n(An)', () => {
    const program = `
      ORG $1000
      MOVEA.L #$2000, A0
      MOVE.W #7, (A0)
      MOVE.W #3, 2(A0)
      MOVE.W 2(A0), D0
      END
    `;
    const emulator = new Emulator(program);

    let halted = false;
    for (let i = 0; i < 50 && !halted; i++) {
      halted = emulator.emulationStep();
    }

    expect(emulator.readWord(0x2000)).toBe(7);
    expect(emulator.readWord(0x2002)).toBe(3);
    expect(emulator.getRegisters()[8] & 0xffff).toBe(3);
  });

  it('increments address registers with ADDQ', () => {
    const program = `
      ORG $1000
      MOVEA.L #$2000, A0
      ADDQ.L #2, A0
      MOVE.W #7, (A0)
      END
    `;
    const emulator = new Emulator(program);

    let halted = false;
    for (let i = 0; i < 50 && !halted; i++) {
      halted = emulator.emulationStep();
    }

    expect(emulator.readWord(0x2000)).toBe(0);
    expect(emulator.readWord(0x2002)).toBe(7);
  });

  it('sorts ARRAY in ascending order', () => {
    const asmPath = path.resolve(process.cwd(), 'examples/bubble_sort.asm');
    const program = readFileSync(asmPath, 'utf8');
    const emulator = new Emulator(program);

    expect(emulator.getException()).toBeUndefined();

    let halted = false;
    for (let i = 0; i < 300 && !halted; i++) {
      halted = emulator.emulationStep();
    }

    expect(halted).toBe(true);

    const arrayAddr = emulator.getDataAddresses().array;
    expect(arrayAddr).toBeDefined();

    const sorted = [
      emulator.readWord(arrayAddr),
      emulator.readWord(arrayAddr + 2),
      emulator.readWord(arrayAddr + 4),
      emulator.readWord(arrayAddr + 6),
      emulator.readWord(arrayAddr + 8),
    ];

    expect(sorted).toEqual([2, 3, 5, 7, 9]);
  });
});
