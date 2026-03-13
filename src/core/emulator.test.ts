import { describe, it, expect } from 'vitest';
import { Emulator } from './emulator';
import { Strings } from './strings';

describe('Emulator - END directive handling', () => {
  it('should set exception when END directive is missing', () => {
    const code = `
      ORG $1000
      MOVE #10, D0
    `;
    const emulator = new Emulator(code);
    expect(emulator.getException()).toBe(Strings.END_MISSING);
  });

  it('should not set exception when END directive is present', () => {
    const code = `
      ORG $1000
      MOVE #10, D0
      END
    `;
    const emulator = new Emulator(code);
    expect(emulator.getException()).toBeUndefined();
  });

  it('should reset exception after running program without END', () => {
    // First, run a program without END directive
    const badCode = `
      ORG $1000
      MOVE #10, D0
    `;
    const badEmulator = new Emulator(badCode);
    expect(badEmulator.getException()).toBe(Strings.END_MISSING);

    // Then, run a program with valid END directive
    const goodCode = `
      ORG $1000
      MOVE #10, D0
      END
    `;
    const goodEmulator = new Emulator(goodCode);
    expect(goodEmulator.getException()).toBeUndefined();
  });
});

describe('Emulator - ROXL instruction', () => {
  it('should rotate left through extend with immediate count', () => {
    // D0 = 0x80 (10000000 binary), X=0, rotate left by 1
    // Expected: bit 7 goes to X, X (0) goes to bit 0 => 0x00, X=1
    const code = `
      ORG $1000
      MOVE.L #$80, D0
      ROXL.B #1, D0
      END
    `;
    const emulator = new Emulator(code);
    emulator.emulationStep(); // ORG (skipped)
    emulator.emulationStep(); // MOVE
    emulator.emulationStep(); // ROXL
    const regs = emulator.getRegisters();
    // D0 is at index 8
    expect(regs[8] & 0xFF).toBe(0x00);
    // X flag should be set (bit 4 of CCR)
    expect(emulator.getXFlag()).toBe(1);
  });

  it('should rotate X flag into bit 0 on ROXL', () => {
    const code = `
      ORG $1000
      MOVE.L #$FF, D0
      ADD.B #1, D0
      MOVE.L #$00, D0
      ROXL.B #1, D0
      END
    `;
    const emulator = new Emulator(code);
    emulator.emulationStep(); // ORG (skipped)
    emulator.emulationStep(); // MOVE #$FF, D0
    emulator.emulationStep(); // ADD.B #1, D0 => overflow, sets X flag
    emulator.emulationStep(); // MOVE.L #$00, D0 => D0=0 (MOVE doesn't affect X)
    emulator.emulationStep(); // ROXL.B #1, D0 => X(1) rotates into bit 0
    const regs = emulator.getRegisters();
    expect(regs[8] & 0xFF).toBe(0x01);
  });
});

describe('Emulator - ROXR instruction', () => {
  it('should rotate right through extend with immediate count', () => {
    // D0 = 0x01, X=0, rotate right by 1
    // Expected: bit 0 goes to X, X (0) goes to MSB => 0x00, X=1
    const code = `
      ORG $1000
      MOVE.L #$01, D0
      ROXR.B #1, D0
      END
    `;
    const emulator = new Emulator(code);
    emulator.emulationStep(); // ORG (skipped)
    emulator.emulationStep(); // MOVE
    emulator.emulationStep(); // ROXR
    const regs = emulator.getRegisters();
    expect(regs[8] & 0xFF).toBe(0x00);
    expect(emulator.getXFlag()).toBe(1);
  });

  it('should rotate X flag into MSB on ROXR', () => {
    const code = `
      ORG $1000
      MOVE.L #$FF, D0
      ADD.B #1, D0
      MOVE.L #$00, D0
      ROXR.B #1, D0
      END
    `;
    const emulator = new Emulator(code);
    emulator.emulationStep(); // ORG (skipped)
    emulator.emulationStep(); // MOVE #$FF
    emulator.emulationStep(); // ADD.B #1 => sets X flag
    emulator.emulationStep(); // MOVE.L #$00, D0 => D0=0
    emulator.emulationStep(); // ROXR.B #1 => X(1) goes into bit 7
    const regs = emulator.getRegisters();
    expect(regs[8] & 0xFF).toBe(0x80);
  });
});

describe('Emulator - BSR instruction', () => {
  it('should branch to subroutine and return with RTS', () => {
    const code = `
      ORG $1000
      MOVE.L #$2000, A7
      MOVE.L #5, D0
      BSR MYSUB
      MOVE.L #99, D1
      BRA DONE
MYSUB:
      MOVE.L #42, D2
      RTS
DONE:
      END
    `;
    const emulator = new Emulator(code);
    emulator.emulationStep(); // ORG (skipped)
    emulator.emulationStep(); // MOVE.L #$2000, A7
    emulator.emulationStep(); // MOVE.L #5, D0
    emulator.emulationStep(); // BSR MYSUB -> pushes return address, jumps to MYSUB
    emulator.emulationStep(); // MYSUB: label (skipped)
    emulator.emulationStep(); // MOVE.L #42, D2 (inside subroutine)
    emulator.emulationStep(); // RTS -> returns
    emulator.emulationStep(); // MOVE.L #99, D1 (back from subroutine)
    const regs = emulator.getRegisters();
    // D0 = 5 (index 8), D1 = 99 (index 9), D2 = 42 (index 10)
    expect(regs[8]).toBe(5);
    expect(regs[9]).toBe(99);
    expect(regs[10]).toBe(42);
  });
});

describe('Emulator - JSR/RTS with correct stack pointer (A7)', () => {
  it('should use A7 as stack pointer for JSR/RTS', () => {
    const code = `
      ORG $1000
      MOVE.L #$2000, A7
      MOVE.L #10, D0
      JSR MYSUB
      MOVE.L #20, D1
      BRA DONE
MYSUB:
      MOVE.L #30, D2
      RTS
DONE:
      END
    `;
    const emulator = new Emulator(code);
    emulator.emulationStep(); // ORG (skipped)
    emulator.emulationStep(); // MOVE.L #$2000, A7
    emulator.emulationStep(); // MOVE.L #10, D0
    emulator.emulationStep(); // JSR MYSUB
    // A7 should have decremented by 4
    expect(emulator.getRegisters()[7]).toBe(0x2000 - 4);
    emulator.emulationStep(); // MYSUB: label (skipped)
    emulator.emulationStep(); // MOVE.L #30, D2
    emulator.emulationStep(); // RTS
    // A7 should be back to $2000
    expect(emulator.getRegisters()[7]).toBe(0x2000);
    emulator.emulationStep(); // MOVE.L #20, D1
    const regs = emulator.getRegisters();
    expect(regs[8]).toBe(10);  // D0
    expect(regs[9]).toBe(20);  // D1
    expect(regs[10]).toBe(30); // D2
  });
});
