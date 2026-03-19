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

describe('Emulator - MOVE into data registers', () => {
  it('should not sign-extend MOVE.B immediate into Dn', () => {
    const code = `
      ORG $1000
      MOVE.B #$81, D1
      END
    `;
    const emulator = new Emulator(code);

    let stop = false;
    for (let i = 0; i < 10 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000081);
  });

  it('should preserve upper bytes on MOVE.B and upper word on MOVE.W', () => {
    const code = `
      ORG $1000
      MOVE.L #$12345678, D1
      MOVE.B #$81, D1
      MOVE.W #$ABCD, D1
      END
    `;
    const emulator = new Emulator(code);

    let stop = false;
    for (let i = 0; i < 20 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    expect(emulator.getRegisters()[9] >>> 0).toBe(0x1234abcd);
  });
});
