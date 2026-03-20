import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('Logical Operations Instructions', () => {
  /**
   * AND instruction - Bitwise AND
   */
  describe('AND', () => {
    it('should perform bitwise AND on data registers', () => {
      const code = `
        ORG $1000
        MOVE.L #$FF00FF00, D0
        MOVE.L #$00FF00FF, D1
        AND D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should perform AND with common bits', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D0
        MOVE.L #$12345678, D1
        AND D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x12345678);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$FF00FF00, D0
        MOVE.L #$00FF00FF, D1
        AND D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should clear carry flag', () => {
      const code = `
        ORG $1000
        MOVE.L #$FF00FF00, D0
        MOVE.L #$00FF00FF, D1
        AND D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(0);
    });

    it('should set negative flag for negative result', () => {
      const code = `
        ORG $1000
        MOVE.L #$F0000000, D0
        MOVE.L #$F0000000, D1
        AND D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getNFlag()).toBe(1);
    });
  });

  /**
   * ANDI instruction - AND with immediate
   */
  describe('ANDI', () => {
    it('should perform AND with immediate value', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        ANDI #$0F0F0F0F, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0F0F0F0F);
    });

    it('should mask specific bits', () => {
      const code = `
        ORG $1000
        MOVE.L #$12345678, D1
        ANDI #$00FF0000, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00340000);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$FF00FF00, D1
        ANDI #$00FF00FF, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });
  });

  /**
   * OR instruction - Bitwise OR
   */
  describe('OR', () => {
    it('should perform bitwise OR on data registers', () => {
      const code = `
        ORG $1000
        MOVE.L #$FF00FF00, D0
        MOVE.L #$00FF00FF, D1
        OR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFFFFFF);
    });

    it('should combine set bits from both operands', () => {
      const code = `
        ORG $1000
        MOVE.L #$F0F0F0F0, D0
        MOVE.L #$0F0F0F0F, D1
        OR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFFFFFF);
    });

    it('should set negative flag for negative result', () => {
      const code = `
        ORG $1000
        MOVE.L #$F0000000, D0
        MOVE.L #$0F000000, D1
        OR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getNFlag()).toBe(1);
    });

    it('should set zero flag when both operands are zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D0
        MOVE.L #$00000000, D1
        OR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should clear carry flag', () => {
      const code = `
        ORG $1000
        MOVE.L #$FF00FF00, D0
        MOVE.L #$00FF00FF, D1
        OR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(0);
    });
  });

  /**
   * ORI instruction - OR with immediate
   */
  describe('ORI', () => {
    it('should perform OR with immediate value', () => {
      const code = `
        ORG $1000
        MOVE.L #$F0F0F0F0, D1
        ORI #$0F0F0F0F, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFFFFFF);
    });

    it('should set specific bits', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        ORI #$FF000000, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFF000000);
    });

    it('should set negative flag with negative result', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        ORI #$F0000000, D1
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
   * EOR instruction - Bitwise Exclusive OR
   */
  describe('EOR', () => {
    it('should perform bitwise XOR on data registers', () => {
      const code = `
        ORG $1000
        MOVE.L #$FF00FF00, D0
        MOVE.L #$FF00FF00, D1
        EOR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should XOR different bit patterns', () => {
      const code = `
        ORG $1000
        MOVE.L #$AAAAAAAA, D0
        MOVE.L #$55555555, D1
        EOR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFFFFFF);
    });

    it('should set zero flag when operands are equal', () => {
      const code = `
        ORG $1000
        MOVE.L #$12345678, D0
        MOVE.L #$12345678, D1
        EOR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should toggle specific bits', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D0
        MOVE.L #$FF00FF00, D1
        EOR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00FF00FF);
    });

    it('should clear carry flag', () => {
      const code = `
        ORG $1000
        MOVE.L #$FF00FF00, D0
        MOVE.L #$00FF00FF, D1
        EOR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(0);
    });
  });

  /**
   * EORI instruction - XOR with immediate
   */
  describe('EORI', () => {
    it('should perform XOR with immediate value', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        EORI #$00FF00FF, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFF00FF00);
    });

    it('should toggle bits with immediate', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        EORI #$FFFFFFFF, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFFFFFF);
    });

    it('should set negative flag for negative result', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        EORI #$F0000000, D1
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
   * NOT instruction - Bitwise complement (invert all bits)
   */
  describe('NOT', () => {
    it('should invert all bits', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        NOT D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFFFFFF);
    });

    it('should complement all bits of a value', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        NOT D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should set negative flag for negative result', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        NOT D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getNFlag()).toBe(1);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        NOT D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should handle bit-level complement', () => {
      const code = `
        ORG $1000
        MOVE.L #$AAAAAAAA, D1
        NOT D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x55555555);
    });

    it('should clear carry flag', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        NOT D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(0);
    });
  });
});
