import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('Shift & Rotate Operations Instructions', () => {
  /**
   * ASL - Arithmetic Shift Left
   */
  describe('ASL', () => {
    it('should shift left by immediate count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ASL #3, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000008);
    });

    it('should shift left by register count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        MOVE.L #4, D0
        ASL D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000010);
    });

    it('should set carry flag when bit is shifted out', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        ASL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        ASL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should set overflow flag on sign change', () => {
      const code = `
        ORG $1000
        MOVE.L #$40000000, D1
        ASL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getVFlag()).toBe(1);
    });
  });

  /**
   * ASR - Arithmetic Shift Right
   */
  describe('ASR', () => {
    it('should shift right by immediate count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000010, D1
        ASR #2, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000004);
    });

    it('should preserve sign bit', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        ASR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xC0000000);
    });

    it('should set carry flag when bit is shifted out', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ASR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        ASR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should shift right by register count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000100, D1
        MOVE.L #3, D0
        ASR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000020);
    });
  });

  /**
   * LSL - Logical Shift Left
   */
  describe('LSL', () => {
    it('should shift left with zero fill', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        LSL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFFFFFE);
    });

    it('should set carry flag', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        LSL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        LSL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should set extend flag same as carry', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        LSL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getXFlag()).toBe(1);
    });
  });

  /**
   * LSR - Logical Shift Right
   */
  describe('LSR', () => {
    it('should shift right with zero fill', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        LSR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x7FFFFFFF);
    });

    it('should set carry flag when bit is shifted out', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        LSR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        LSR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should shift right by register count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000100, D1
        MOVE.L #2, D0
        LSR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000040);
    });

    it('should set extend flag same as carry', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        LSR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getXFlag()).toBe(1);
    });
  });

  /**
   * ROL - Rotate Left (no carry involved)
   */
  describe('ROL', () => {
    it('should rotate left', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ROL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000002);
    });

    it('should wrap bits around', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        ROL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000001);
    });

    it('should set carry flag based on bit shifted out', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        ROL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should rotate left by register count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        MOVE.L #8, D0
        ROL D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000100);
    });
  });

  /**
   * ROR - Rotate Right (no carry involved)
   */
  describe('ROR', () => {
    it('should rotate right', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000002, D1
        ROR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000001);
    });

    it('should wrap bits around', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ROR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x80000000);
    });

    it('should set carry flag based on bit shifted out', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ROR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should rotate right by register count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000100, D1
        MOVE.L #8, D0
        ROR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000001);
    });

    it('should set negative flag when MSB is set', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ROR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getNFlag()).toBe(1);
    });
  });

  /**
   * ROXL - Rotate Left through Extend/Carry
   */
  describe('ROXL', () => {
    it('should rotate left through carry', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ROXL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000002);
    });

    it('should include carry bit in rotation', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        MOVE.L #$80000000, D0
        OR D0, D1
        ROXL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 40 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      // After rotation, check if X flag is set
      expect(emulator.getXFlag()).toBe(1);
    });

    it('should set carry flag and X flag', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        ROXL #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should rotate left by register count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        MOVE.L #2, D0
        ROXL D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000004);
    });
  });

  /**
   * ROXR - Rotate Right through Extend/Carry
   */
  describe('ROXR', () => {
    it('should rotate right through carry', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000002, D1
        ROXR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000001);
    });

    it('should include carry bit in rotation', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ROXR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getXFlag()).toBe(1);
    });

    it('should set carry flag from shifted bit', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ROXR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should rotate right by register count', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000100, D1
        MOVE.L #8, D0
        ROXR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000001);
    });

    it('should handle X flag contribution', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        ROXR #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getXFlag()).toBe(1);
    });
  });
});
