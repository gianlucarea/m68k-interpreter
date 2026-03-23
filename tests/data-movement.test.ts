import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('Data Movement Instructions', () => {
  /**
   * MOVE instruction - Move the contents of the source to the destination location
   */
  describe('MOVE', () => {
    it('should move immediate value to data register', () => {
      const code = `
        ORG $1000
        MOVE.L #$12345678, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 10 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x12345678);
    });

    it('should move data between registers', () => {
      const code = `
        ORG $1000
        MOVE.L #$AAAABBBB, D0
        MOVE.L D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xAAAABBBB);
    });

    it('should handle MOVE.B without sign-extending into Dn', () => {
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

    it('should preserve upper bytes on MOVE.B', () => {
      const code = `
        ORG $1000
        MOVE.L #$12345678, D1
        MOVE.B #$AB, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x123456AB);
    });

    it('should handle MOVE with post-increment addressing', () => {
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
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00002004);
    });
  });

  /**
   * MOVEA instruction - Move to address register with sign extension for word operations
   */
  describe('MOVEA', () => {
    it('should move immediate value to address register', () => {
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
      expect(emulator.getRegisters()[2] >>> 0).toBe(0x00003000);
    });

    it('should sign-extend word to longword in MOVEA', () => {
      const code = `
        ORG $1000
        MOVEA.W #$8000, A1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 10 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const a1Value = emulator.getRegisters()[1] >>> 0;
      expect(a1Value).toBe(0xFFFF8000);
    });

    it('should move address register to address register', () => {
      const code = `
        ORG $1000
        MOVEA.L #$5000, A0
        MOVEA.L A0, A1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00005000);
    });
  });

  /**
   * MOVEQ instruction - Move quick (8-bit immediate sign-extended to 32 bits)
   */
  describe('MOVEQ', () => {
    it('should move small immediate value to data register', () => {
      const code = `
        ORG $1000
        MOVEQ #10, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 10 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0000000A);
    });

    it('should sign-extend negative immediate in MOVEQ', () => {
      const code = `
        ORG $1000
        MOVEQ #-1, D2
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 10 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[10] >>> 0).toBe(0xFFFFFFFF);
    });
  });

  /**
   * CLR instruction - Clear destination (load with all zeros)
   */
  describe('CLR', () => {
    it('should clear data register', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        CLR.L D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should clear memory location', () => {
      const code = `
        ORG $1000
        MOVE.L #$12345678, D1
        MOVEA.L #$2000, A0
        MOVE.L D1, (A0)
        CLR.L (A0)
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 100 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const memValue = emulator.readLong(0x2000);
      expect(memValue).toBe(0x00000000);
    });
  });

  /**
   * SWAP instruction - Exchange upper and lower 16-bit words of a data register
   */
  describe('SWAP', () => {
    it('should swap upper and lower words', () => {
      const code = `
        ORG $1000
        MOVE.L #$12345678, D1
        SWAP D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x56781234);
    });

    it('should set zero flag when result is zero after swap', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000000, D1
        SWAP D1
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
   * EXG instruction - Exchange contents of two registers
   */
  describe('EXG', () => {
    it('should exchange data registers', () => {
      const code = `
        ORG $1000
        MOVE.L #$11111111, D0
        MOVE.L #$22222222, D1
        EXG D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x22222222);
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x11111111);
    });

    it('should exchange address registers', () => {
      const code = `
        ORG $1000
        MOVEA.L #$1000, A0
        MOVEA.L #$2000, A1
        EXG A0, A1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[0] >>> 0).toBe(0x00002000);
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00001000);
    });
  });

  /**
   * LEA instruction - Load effective address
   */
  describe('LEA', () => {
    it('should load effective address into address register', () => {
      const code = `
        ORG $1000
        LEA ($2000), A0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 10 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[0] >>> 0).toBe(0x00002000);
    });

    it('should load address with offset', () => {
      const code = `
        ORG $1000
        MOVEA.L #$2000, A0
        LEA $10(A0), A1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00002010);
    });
  });

  /**
   * PEA instruction - Push effective address onto stack
   */
  describe('PEA', () => {
    it('should push effective address onto stack', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        PEA ($2000)
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sp = emulator.getRegisters()[7] >>> 0;
      expect(sp).toBe(0x00002FFC);
    });
  });

  /**
   * MOVEM instruction - Move multiple registers
   */
  describe('MOVEM', () => {
    it('should store registers to memory with range syntax (D0-D2)', () => {
      const code = `
        ORG $1000
        MOVE.L #$11, D0
        MOVE.L #$22, D1
        MOVE.L #$33, D2
        MOVEA.L #$3000, A0
        MOVEM.L D0-D2, (A0)
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getErrors().filter(e => e.includes('Unknown'))).toEqual([]);
      expect(emulator.readLong(0x3000)).toBe(0x11);
      expect(emulator.readLong(0x3004)).toBe(0x22);
      expect(emulator.readLong(0x3008)).toBe(0x33);
    });

    it('should store registers to memory with slash syntax (D0/D1/D2)', () => {
      const code = `
        ORG $1000
        MOVE.L #$AA, D0
        MOVE.L #$BB, D1
        MOVE.L #$CC, D2
        MOVEA.L #$3000, A0
        MOVEM.L D0/D1/D2, (A0)
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getErrors().filter(e => e.includes('Unknown'))).toEqual([]);
      expect(emulator.readLong(0x3000)).toBe(0xAA);
      expect(emulator.readLong(0x3004)).toBe(0xBB);
      expect(emulator.readLong(0x3008)).toBe(0xCC);
    });

    it('should load registers from memory with range syntax', () => {
      const code = `
        ORG $1000
        MOVE.L #$11, $3000
        MOVE.L #$22, $3004
        MOVE.L #$33, $3008
        MOVEA.L #$3000, A0
        MOVEM.L (A0), D0-D2
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getErrors().filter(e => e.includes('Unknown'))).toEqual([]);
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x11);
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x22);
      expect(emulator.getRegisters()[10] >>> 0).toBe(0x33);
    });
  });
});
