import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('Program Control & Flow Instructions', () => {
  /**
   * BRA - Branch Always
   */
  describe('BRA', () => {
    it('should branch to target address', () => {
      const code = `
        ORG $1000
        BRA $1010
        MOVE.L #1, D0
        ORG $1010
        MOVE.L #2, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00000002);
    });

    it('should handle forward branch', () => {
      const code = `
        ORG $1000
        BRA SKIP
        MOVE.L #999, D0
        SKIP:
        MOVE.L #100, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(100);
    });

    it('should update program counter', () => {
      const code = `
        ORG $1000
        BRA $1010
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getPC()).toBe(0x00001010);
    });

    it('should handle backward branch', () => {
      const code = `
        ORG $1000
        MOVE.L #0, D0
        LOOP:
        ADDQ #1, D0
        CMP #3, D0
        BNE LOOP
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 100 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(3);
    });

    it('should not affect condition codes', () => {
      const code = `
        ORG $1000
        MOVE.L #5, D0
        SUB #5, D0
        BRA SKIP
        SKIP:
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });
  });

  /**
   * BSR - Branch to Subroutine
   */
  describe('BSR', () => {
    it('should branch to subroutine and save return address', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        BSR SUE
        MOVE.L #999, D0
        ORG $1020
        SUE:
        MOVE.L #100, D0
        RTS
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(999);
    });

    it('should push return address on stack', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        BSR SUE
        ORG $1020
        SUE:
        MOVE.L (A7), D0
        RTS
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const returnAddr = emulator.getRegisters()[8] >>> 0;
      expect(returnAddr).toBe(0x00001004);
    });

    it('should handle nested subroutine calls', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        BSR FUNC1
        ORG $1010
        FUNC1:
        BSR FUNC2
        RTS
        ORG $1020
        FUNC2:
        MOVE.L #50, D0
        RTS
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 100 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(50);
    });

    it('should update stack pointer', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        BSR SUE
        ORG $1020
        SUE:
        RTS
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[7] >>> 0).toBe(0x00003000);
    });
  });

  /**
   * BRA with condition - Branch based on condition codes
   */
  describe('Bcc - Conditional Branches', () => {
    it('BEQ should branch when zero flag is set', () => {
      const code = `
        ORG $1000
        MOVE.L #5, D0
        SUB #5, D0
        BEQ ZERO
        MOVE.L #999, D0
        BRA DONE
        ZERO:
        MOVE.L #0, D0
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0);
    });

    it('BNE should branch when zero flag is clear', () => {
      const code = `
        ORG $1000
        MOVE.L #5, D0
        CMP #3, D0
        BNE NOTEQUAL
        MOVE.L #999, D0
        BRA DONE
        NOTEQUAL:
        MOVE.L #100, D0
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(100);
    });

    it('BMI should branch when negative flag is set', () => {
      const code = `
        ORG $1000
        MOVE.L #-5, D0
        BMI NEGATIVE
        MOVE.L #999, D0
        BRA DONE
        NEGATIVE:
        MOVE.L #-5, D0
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect((emulator.getRegisters()[8] | 0)).toBe(-5);
    });

    it('BPL should branch when negative flag is clear', () => {
      const code = `
        ORG $1000
        MOVE.L #5, D0
        TST D0
        BPL POSITIVE
        MOVE.L #999, D0
        BRA DONE
        POSITIVE:
        MOVE.L #5, D0
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(5);
    });

    it('BCS should branch on carry set', () => {
      const code = `
        ORG $1000
        MOVE.L #50, D0
        SUB #100, D0
        BCS CARRY_SET
        MOVE.L #999, D0
        BRA DONE
        CARRY_SET:
        MOVE.L #-50, D0
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect((emulator.getRegisters()[8] | 0)).toBe(-50);
    });
  });

  /**
   * JMP - Unconditional Jump
   */
  describe('JMP', () => {
    it('should jump to target address', () => {
      const code = `
        ORG $1000
        JMP $1010
        MOVE.L #1, D0
        ORG $1010
        MOVE.L #2, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00000002);
    });

    it('should update program counter with JMP', () => {
      const code = `
        ORG $1000
        JMP TARGET
        ORG $1010
        TARGET:
        MOVE.L #100, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getPC()).toBe(0x00001014);
    });

    it('should jump to address in register', () => {
      const code = `
        ORG $1000
        MOVEA.L #$1010, A0
        JMP (A0)
        MOVE.L #1, D0
        ORG $1010
        MOVE.L #2, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00000002);
    });

    it('should not push return address like BSR', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        JMP SKIP
        MOVE.L #999, D0
        SKIP:
        MOVE.L A7, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00003000);
    });
  });

  /**
   * JSR - Jump to Subroutine
   */
  describe('JSR', () => {
    it('should jump to subroutine and save return address', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        JSR SUB
        MOVE.L #999, D0
        ORG $1020
        SUB:
        MOVE.L #100, D0
        RTS
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(999);
    });

    it('should push return address via JSR', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        JSR SUB
        ORG $1020
        SUB:
        MOVE.L (A7), D0
        RTS
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const returnAddr = emulator.getRegisters()[8] >>> 0;
      expect(returnAddr).toBe(0x00001004);
    });

    it('should work with address register addressing', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        MOVEA.L #$1020, A0
        JSR (A0)
        MOVE.L #999, D0
        ORG $1020
        MOVE.L #100, D0
        RTS
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(999);
    });
  });

  /**
   * RTS - Return from Subroutine
   */
  describe('RTS', () => {
    it('should return from subroutine to caller', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        JSR SUB
        MOVE.L #0, D0
        BRA DONE
        ORG $1020
        SUB:
        MOVE.L #100, D0
        RTS
        ORG $1030
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00000000);
    });

    it('should restore stack pointer on RTS', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        JSR SUB
        MOVE.L A7, D0
        BRA DONE
        ORG $1020
        SUB:
        RTS
        ORG $1030
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00003000);
    });

    it('should handle multiple nested RTS calls', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        JSR FUNC1
        MOVE.L D0, D1
        ORG $1010
        FUNC1:
        JSR FUNC2
        MOVE.L D0, D0
        RTS
        ORG $1020
        FUNC2:
        MOVE.L #50, D0
        RTS
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 100 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[10] >>> 0).toBe(50);
    });
  });

  /**
   * NOP - No Operation
   */
  describe('NOP', () => {
    it('should execute without side effects', () => {
      const code = `
        ORG $1000
        MOVE.L #100, D0
        NOP
        MOVE.L #200, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(100);
      expect(emulator.getRegisters()[9] >>> 0).toBe(200);
    });

    it('should not modify condition codes', () => {
      const code = `
        ORG $1000
        MOVE.L #5, D0
        SUB #5, D0
        NOP
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should increment program counter', () => {
      const code = `
        ORG $1000
        NOP
        END
      `;
      const emulator = new Emulator(code);
      const initialPC = emulator.getPC();
      let stop = false;
      for (let i = 0; i < 10 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const finalPC = emulator.getPC();
      expect(finalPC).toBeGreaterThan(initialPC);
    });

    it('should handle multiple NOPs', () => {
      const code = `
        ORG $1000
        MOVE.L #50, D0
        NOP
        NOP
        NOP
        MOVE.L #100, D1
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(50);
      expect(emulator.getRegisters()[9] >>> 0).toBe(100);
    });
  });

  /**
   * LINK - Create stack frame
   */
  describe('LINK', () => {
    it('should create stack frame with LINK', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        LINK A6, #-16
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[6] >>> 0).toBe(0x00002FFC);
    });

    it('should push old A6 on stack via LINK', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        MOVEA.L #$1234, A6
        LINK A6, #-8
        MOVE.L (A7), D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00001234);
    });

    it('should allocate space on stack', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        LINK A6, #-32
        MOVE.L A7, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00002FDC);
    });

    it('should set A6 to point to old A6 location', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        LINK A6, #0
        MOVE.L A6, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00002FFC);
    });
  });

  /**
   * UNLK - Unlink stack frame
   */
  describe('UNLK', () => {
    it('should restore stack frame with UNLK', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        LINK A6, #-16
        UNLK A6
        MOVE.L A7, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00003000);
    });

    it('should restore A6 after UNLK', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        MOVEA.L #$1234, A6
        LINK A6, #-8
        UNLK A6
        MOVE.L A6, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00001234);
    });

    it('should work with nested LINK/UNLK', () => {
      const code = `
        ORG $1000
        MOVEA.L #$3000, A7
        LINK A6, #-16
        LINK A5, #-8
        UNLK A5
        UNLK A6
        MOVE.L A7, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 100 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getRegisters()[8] >>> 0).toBe(0x00003000);
    });
  });
});
