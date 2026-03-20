import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('Bit Manipulation Instructions', () => {
  /**
   * BTST - Bit Test
   */
  describe('BTST', () => {
    it('should test a bit that is set', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BTST #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(0);
    });

    it('should test a bit that is clear', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BTST #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should test bit via register', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000004, D1
        MOVE.L #2, D0
        BTST D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(0);
    });

    it('should not modify the tested value', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        BTST #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFFFFFF);
    });

    it('should test high bit in longword', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        BTST #31, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(0);
    });
  });

  /**
   * BSET - Bit Set
   */
  describe('BSET', () => {
    it('should set a bit that is clear', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        BSET #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000001);
    });

    it('should set bit via register', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        MOVE.L #5, D0
        BSET D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000020);
    });

    it('should set bit that is already set', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BSET #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000001);
    });

    it('should set zero flag if bit was clear', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        BSET #3, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should clear zero flag if bit was set', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BSET #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(0);
    });

    it('should set multiple bits independently', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        BSET #0, D1
        BSET #8, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000101);
    });
  });

  /**
   * BCLR - Bit Clear
   */
  describe('BCLR', () => {
    it('should clear a bit that is set', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BCLR #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should clear bit via register', () => {
      const code = `
        ORG $1000
        MOVE.L #$000000FF, D1
        MOVE.L #3, D0
        BCLR D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x000000F7);
    });

    it('should clear bit that is already clear', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        BCLR #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should clear zero flag if bit was set', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BCLR #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(0);
    });

    it('should set zero flag if bit was clear', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        BCLR #3, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should clear multiple bits independently', () => {
      const code = `
        ORG $1000
        MOVE.L #$000000FF, D1
        BCLR #0, D1
        BCLR #7, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0000007E);
    });
  });

  /**
   * BCHG - Bit Change (Toggle)
   */
  describe('BCHG', () => {
    it('should toggle a bit that is clear', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        BCHG #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000001);
    });

    it('should toggle a bit that is set', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BCHG #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should toggle bit via register', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000005, D1
        MOVE.L #0, D0
        BCHG D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000004);
    });

    it('should set zero flag if bit was clear', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        BCHG #3, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should clear zero flag if bit was set', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BCHG #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(0);
    });

    it('should toggle multiple bits independently', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        BCHG #0, D1
        BCHG #3, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000008);
    });

    it('should toggle high bit in longword', () => {
      const code = `
        ORG $1000
        MOVE.L #$80000000, D1
        BCHG #31, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should work with different operand sizes', () => {
      const code = `
        ORG $1000
        MOVE.B #$FF, D1
        BCHG #0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect((emulator.getRegisters()[9] & 0xFF) >>> 0).toBe(0xFE);
    });
  });
});
