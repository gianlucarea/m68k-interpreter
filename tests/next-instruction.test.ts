import { describe, expect, it } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('Next instruction preview', () => {
  it('skips comments, labels and data directives, preserving source text', () => {
    const emulator = new Emulator('ORG $1000\n; comment\nvalue: DC.W 1\nstart:\nMove.L #2, D0 ; original\nNOP\nEND');
    expect(emulator.getNextInstruction()).toBe('Move.L #2, D0 ; original');
    for (let i = 0; i < 4; i++) emulator.emulationStep();
    expect(emulator.getNextInstruction()).toBe('NOP');
    emulator.emulationStep();
    expect(emulator.getNextInstruction()).toBeNull();
  });

  it('follows branches and restores previews on undo without mutating state', () => {
    const emulator = new Emulator('ORG $1000\nBRA target\nMOVE.L #1, D0\ntarget:\nMOVE.L #2, D0\nEND');
    emulator.emulationStep();
    emulator.emulationStep();
    const pc = emulator.getPC();
    const registers = [...emulator.getRegisters()];
    const memory = { ...emulator.getMemory() };
    for (let i = 0; i < 3; i++) expect(emulator.getNextInstruction()).toBe('MOVE.L #2, D0');
    expect(emulator.getPC()).toBe(pc);
    expect([...emulator.getRegisters()]).toEqual(registers);
    expect(emulator.getMemory()).toEqual(memory);
    emulator.undoFromStack();
    expect(emulator.getNextInstruction()).toBe('BRA target');
  });

  it('does not preview across a fall-through ORG boundary', () => {
    const emulator = new Emulator('ORG $1000\nNOP\nORG $2000\nMOVE.L #2, D0\nEND');
    emulator.emulationStep();
    emulator.emulationStep();
    expect(emulator.getNextInstruction()).toBeNull();
  });

  it('previews a branch directly into another ORG segment', () => {
    const emulator = new Emulator('ORG $1000\nBRA $2000\nORG $2000\nMOVE.L #2, D0\nEND');
    emulator.emulationStep();
    emulator.emulationStep();
    expect(emulator.getNextInstruction()).toBe('MOVE.L #2, D0');
  });

  it('returns null for an invalid program or exhausted instructions', () => {
    expect(new Emulator('NOP').getNextInstruction()).toBeNull();
    const emulator = new Emulator('ORG $1000\nEND');
    for (let i = 0; i < 3; i++) emulator.emulationStep();
    expect(emulator.getNextInstruction()).toBeNull();
  });
});
