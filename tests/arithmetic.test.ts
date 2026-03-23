import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('Integer Arithmetic Instructions', () => {
  /**
   * ADD instruction - Add source to destination
   */
  describe('ADD', () => {
    it('should add immediate to data register', () => {
      const code = `
        ORG $1000
        MOVE.L #10, D1
        ADD #5, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0000000F);
    });

    it('should add two data registers', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D0
        MOVE.L #50, D1
        ADD D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000096);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000005, D1
        ADD #-5, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should handle overflow in ADD', () => {
      const code = `
        ORG $1000
        MOVE.L #$FFFFFFFF, D1
        ADD.L #1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
    });

    it('should handle ADD with negative numbers', () => {
      const code = `
        ORG $1000
        MOVE.L #-100, D1
        ADD #50, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect((emulator.getRegisters()[9] | 0)).toBe(-50);
    });

    it('should add from memory indirect (An) to data register', () => {
      const code = `
        ORG $1000
        MOVE.L  #50, $2000
        MOVEA.L #$2000, A1
        MOVEQ   #0, D0
        ADD.L   (A1), D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00000032);
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00002000);
    });

    it('should add from memory with post-increment (An)+ and update A register', () => {
      const code = `
        ORG $1000
        MOVE.L  #50, $2000
        MOVEA.L #$2000, A1
        MOVEQ   #0, D0
        ADD.L   (A1)+, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00000032);
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00002004);
    });
  });

  /**
   * ADDA instruction - Add to address register
   */
  describe('ADDA', () => {
    it('should add immediate to address register', () => {
      const code = `
        ORG $1000
        MOVEA.L #$2000, A1
        ADDA.L #100, A1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00002064);
    });

    it('should add data register to address register', () => {
      const code = `
        ORG $1000
        MOVE.L #50, D0
        MOVEA.L #$3000, A2
        ADDA.L D0, A2
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[2] >>> 0).toBe(0x00003032);
    });

    it('should sign-extend word operand in ADDA.W', () => {
      const code = `
        ORG $1000
        MOVEA.L #$1000, A0
        ADDA.W #$8000, A0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[0] >>> 0).toBe(0xFFFF9000);
    });
  });

  /**
   * SUB instruction - Subtract source from destination
   */
  describe('SUB', () => {
    it('should subtract immediate from data register', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D1
        SUB #30, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000046);
    });

    it('should set zero flag when operands are equal', () => {
      const code = `
        ORG $1000
        MOVE.L #$12345678, D1
        SUB.L D1, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should set carry flag for borrow', () => {
      const code = `
        ORG $1000
        MOVE.L #50, D1
        SUB #100, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should handle SUB with different sizes (byte, word, longword)', () => {
      const code = `
        ORG $1000
        MOVE.B #100, D0
        SUB.B #30, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect((emulator.getRegisters()[8] & 0xFF) >>> 0).toBe(70);
    });

    it('should set negative flag when result is negative', () => {
      const code = `
        ORG $1000
        MOVE.L #50, D1
        SUB #100, D1
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
   * SUBA instruction - Subtract from address register
   */
  describe('SUBA', () => {
    it('should subtract immediate from address register', () => {
      const code = `
        ORG $1000
        MOVEA.L #$5000, A1
        SUBA.L #$1000, A1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00004000);
    });

    it('should subtract data register from address register', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D0
        MOVEA.L #$3000, A2
        SUBA.L D0, A2
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[2] >>> 0).toBe(0x00002F9C);
    });
  });

  /**
   * NEG instruction - Negate (two's complement negation)
   */
  describe('NEG', () => {
    it('should negate positive value', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D1
        NEG.L D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect((emulator.getRegisters()[9] | 0)).toBe(-100);
    });

    it('should set zero flag when negating zero', () => {
      const code = `
        ORG $1000
        MOVE.L #0, D1
        NEG D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should set carry flag when negating non-zero', () => {
      const code = `
        ORG $1000
        MOVE.L #50, D1
        NEG D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should set negative flag for negative result', () => {
      const code = `
        ORG $1000
        MOVE.L #1, D1
        NEG D1
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
   * CMP instruction - Compare (subtract but don't modify destination)
   */
  describe('CMP', () => {
    it('should set zero flag when values are equal', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D0
        MOVE.L #100, D1
        CMP D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
      expect(emulator.getRegisters()[9] >>> 0).toBe(100);
    });

    it('should set carry flag when destination less than source', () => {
      const code = `
        ORG $1000
        MOVE.L #50, D1
        CMP #100, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should set negative flag for negative result', () => {
      const code = `
        ORG $1000
        MOVE.L #50, D1
        CMP #100, D1
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
   * MULS instruction - Multiply signed
   */
  describe('MULS', () => {
    it('should multiply positive numbers', () => {
      const code = `
        ORG $1000
        MOVE.W #12, D0
        MOVE.W #5, D1
        MULS D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0000003C);
    });

    it('should multiply with negative numbers', () => {
      const code = `
        ORG $1000
        MOVE.W #-12, D0
        MOVE.W #5, D1
        MULS D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect((emulator.getRegisters()[9] | 0)).toBe(-60);
    });

    it('should set zero flag when result is zero', () => {
      const code = `
        ORG $1000
        MOVE.W #0, D0
        MOVE.W #100, D1
        MULS D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000000);
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should handle large multiplication results', () => {
      const code = `
        ORG $1000
        MOVE.W #$7FFF, D0
        MOVE.W #2, D1
        MULS D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0000FFFE);
    });
  });

  /**
   * DIVS instruction - Divide signed
   */
  describe('DIVS', () => {
    it('should divide positive numbers', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D1
        MOVE.W #10, D0
        DIVS D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 40 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const result = emulator.getRegisters()[9] >>> 0;
      const quotient = result & 0xFFFF;
      expect(quotient).toBe(10);
    });

    it('should set zero flag when quotient is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #5, D1
        MOVE.W #100, D0
        DIVS D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 40 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should handle division with remainder', () => {
      const code = `
        ORG $1000
        MOVE.L #23, D1
        MOVE.W #5, D0
        DIVS D0, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 40 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const result = emulator.getRegisters()[9] >>> 0;
      const quotient = result & 0xFFFF;
      const remainder = (result >> 16) & 0xFFFF;
      expect(quotient).toBe(4);
      expect(remainder).toBe(3);
    });
  });

  /**
   * TST instruction - Test operand against zero
   */
  describe('TST', () => {
    it('should set zero flag when value is zero', () => {
      const code = `
        ORG $1000
        MOVE.L #0, D1
        TST D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should set negative flag when value is negative', () => {
      const code = `
        ORG $1000
        MOVE.L #-100, D1
        TST D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getNFlag()).toBe(1);
    });

    it('should clear carry and overflow flags', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D1
        TST D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(100);
      expect(emulator.getCFlag()).toBe(0);
    });

    it('should not modify the tested value', () => {
      const code = `
        ORG $1000
        MOVE.L #$ABABCDEF, D1
        TST D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xABABCDEF);
    });
  });

  /**
   * EXT instruction - Sign-extend byte to word or word to longword
   */
  describe('EXT', () => {
    it('should extend byte to word', () => {
      const code = `
        ORG $1000
        MOVE.B #$81, D1
        EXT.W D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0000FF81);
    });

    it('should extend word to longword', () => {
      const code = `
        ORG $1000
        MOVE.W #$8000, D1
        EXT.L D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0xFFFF8000);
    });

    it('should extend positive byte to word', () => {
      const code = `
        ORG $1000
        MOVE.B #$42, D1
        EXT.W D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x00000042);
    });
  });

  /**
   * ADDQ instruction - Add quick (small immediate)
   */
  describe('ADDQ', () => {
    it('should add quick immediate to register', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D1
        ADDQ #8, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0000006C);
    });

    it('should work with address registers', () => {
      const code = `
        ORG $1000
        MOVEA.L #$2000, A1
        ADDQ #4, A1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[1] >>> 0).toBe(0x00002004);
    });
  });

  /**
   * SUBQ instruction - Subtract quick (small immediate)
   */
  describe('SUBQ', () => {
    it('should subtract quick immediate from register', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D1
        SUBQ #5, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[9] >>> 0).toBe(0x0000005F);
    });

    it('should work with address registers', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A0
        SUBQ #8, A0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[0] >>> 0).toBe(0x00002FF8);
    });
  });
});
