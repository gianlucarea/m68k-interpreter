import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';
import { Strings } from '../src/core/strings';

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

describe('Emulator - Bug Fixes', () => {
  it('Bug 1: MOVE.L with post-increment should increment A1 by 4', () => {
    const code = `
      ORG $1000
      MOVE.L #$12345678, D1
      MOVEA.L #$2000, A1
      MOVE.L D1, (A1)+
      END
    `;
    const emulator = new Emulator(code);

    let stop = false;
    for (let i = 0; i < 50 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    const d1 = emulator.getRegisters()[9] >>> 0;
    const a1 = emulator.getRegisters()[0] >>> 0;
    const errors = emulator.getErrors();

    // A1 (register 0) should be incremented by 4 (from $2000 to $2004)
    expect(a1).toBe(0x00002004);
  });

  it('MOVEA should set address register', () => {
    const code = `
      ORG $1000
      MOVEA.L #$3000, A2
      END
    `;
    const emulator = new Emulator(code);

    let stop = false;
    for (let i = 0; i < 10 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    // A2 (register 2) should be 0x3000
    expect(emulator.getRegisters()[2] >>> 0).toBe(0x00003000);
  });

  it('MOVEA followed by regular MOVE should work', () => {
    const code = `
      ORG $1000
      MOVE.L #$12345678, D1
      MOVEA.L #$2000, A1
      MOVE.L D1, (A1)
      END
    `;
    const emulator = new Emulator(code);

    let stop = false;
    for (let i = 0; i < 50 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    // A1 should still be 0x2000 (no post-increment)
    expect(emulator.getRegisters()[0] >>> 0).toBe(0x00002000);
  });

  it('Bug 2: ALU should set the CCR Zero flag after SUB.L D1, D1', () => {
    const code = `
      ORG $1000
      MOVE.L #$12345678, D1
      SUB.L D1, D1
      END
    `;
    const emulator = new Emulator(code);

    let stop = false;
    for (let i = 0; i < 50 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    // D1 should be 0 after SUB.L D1, D1
    expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    
    // CCR should have Zero flag set (0x04)
    expect(emulator.getZFlag()).toBe(1);
    expect(emulator.getCCR() & 0x04).toBe(0x04);
  });

  it('Bug 3: ORG directive should set PC to specified address', () => {
    const code = `
      ORG $1000
      MOVE.L #$12345678, D1
      END
    `;
    const emulator = new Emulator(code);

    // After construction, the PC should be at $1000, not $0
    expect(emulator.getPC()).toBe(0x00001000);

    let stop = false;
    for (let i = 0; i < 50 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    // D1 should contain $12345678
    expect(emulator.getRegisters()[9] >>> 0).toBe(0x12345678);
  });

  it('Bug 1: MOVE.W with post-increment should increment A1 by 2', () => {
    const code = `
      ORG $1000
      MOVE.W #$ABCD, D1
      MOVEA.L #$2000, A1
      MOVE.W D1, (A1)+
      END
    `;
    const emulator = new Emulator(code);

    let stop = false;
    for (let i = 0; i < 50 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    // A1 (register 0) should be incremented by 2 (from $2000 to $2002)
    expect(emulator.getRegisters()[0] >>> 0).toBe(0x00002002);
  });

  it('Bug 2: ALU should set CCR flags after arithmetic operations', () => {
    const code = `
      ORG $1000
      MOVE.L #$00000005, D1
      SUB.L #$00000005, D1
      END
    `;
    const emulator = new Emulator(code);

    let stop = false;
    for (let i = 0; i < 50 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    // D1 should be 0
    expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    
    // CCR Zero flag should be set
    expect(emulator.getZFlag()).toBe(1);
  });

  it('Complete test with all three bug fixes', () => {
    const code = `
      ORG $1000
      MOVE.L #$12345678, D1
      MOVEA.L #$2000, A1
      MOVE.L D1, (A1)+
      SUB.L D1, D1
      END
    `;
    const emulator = new Emulator(code);

    // Check initial PC is at ORG address
    expect(emulator.getPC()).toBe(0x00001000);

    let stop = false;
    for (let i = 0; i < 100 && !stop; i++) {
      stop = emulator.emulationStep();
    }

    // After MOVE.L D1, (A1)+, A1 should be $2004
    expect(emulator.getRegisters()[0] >>> 0).toBe(0x00002004);
    
    // After SUB.L D1, D1, D1 should be 0
    expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    
    // Zero flag should be set
    expect(emulator.getZFlag()).toBe(1);
  });
});

