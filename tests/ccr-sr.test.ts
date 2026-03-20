import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

describe('CCR/SR (Condition Code Register / Status Register) Instructions', () => {
  /**
   * MOVE to CCR - Move to Condition Code Register
   */
  describe('MOVE to CCR', () => {
    it('should move value to CCR', () => {
      const code = `
        ORG $1000
        MOVE #$1F, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const ccr = emulator.getCCR();
      expect((ccr & 0x1F) >>> 0).toBe(0x1F);
    });

    it('should set individual CCR flags', () => {
      const code = `
        ORG $1000
        MOVE #$04, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should clear all CCR flags', () => {
      const code = `
        ORG $1000
        MOVE #$00, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const ccr = emulator.getCCR();
      expect((ccr & 0x1F) >>> 0).toBe(0x00);
    });

    it('should set carry and zero flags', () => {
      const code = `
        ORG $1000
        MOVE #$05, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
      expect(emulator.getZFlag()).toBe(1);
    });

    it('should set all condition flags', () => {
      const code = `
        ORG $1000
        MOVE #$1F, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
      expect(emulator.getVFlag()).toBe(1);
      expect(emulator.getZFlag()).toBe(1);
      expect(emulator.getNFlag()).toBe(1);
      expect(emulator.getXFlag()).toBe(1);
    });
  });

  /**
   * MOVE from CCR - Move from Condition Code Register
   */
  describe('MOVE from CCR', () => {
    it('should read CCR value to register', () => {
      const code = `
        ORG $1000
        MOVE #$1F, CCR
        MOVE CCR, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const d0Value = emulator.getRegisters()[8] & 0xFF;
      expect(d0Value >>> 0).toBe(0x1F);
    });

    it('should read current CCR flags', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        SUB #$00000001, D1
        MOVE CCR, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const d0Value = emulator.getRegisters()[8] & 0x04;
      expect(d0Value >>> 0).toBe(0x04);
    });

    it('should preserve CCR in register', () => {
      const code = `
        ORG $1000
        MOVE #$0C, CCR
        MOVE CCR, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const d0Value = emulator.getRegisters()[8] & 0x1F;
      expect(d0Value >>> 0).toBe(0x0C);
    });
  });

  /**
   * ANDI to CCR - AND Immediate to CCR
   */
  describe('ANDI to CCR', () => {
    it('should AND immediate with CCR', () => {
      const code = `
        ORG $1000
        MOVE #$1F, CCR
        ANDI #$0F, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const ccr = emulator.getCCR();
      expect((ccr & 0x1F) >>> 0).toBe(0x0F);
    });

    it('should clear specific CCR flags', () => {
      const code = `
        ORG $1000
        MOVE #$1F, CCR
        ANDI #$FB, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(0);
    });

    it('should clear all flags via ANDI', () => {
      const code = `
        ORG $1000
        MOVE #$1F, CCR
        ANDI #$00, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const ccr = emulator.getCCR();
      expect((ccr & 0x1F) >>> 0).toBe(0x00);
    });

    it('should selectively clear flags', () => {
      const code = `
        ORG $1000
        MOVE #$1F, CCR
        ANDI #$17, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getNFlag()).toBe(0);
      expect(emulator.getCFlag()).toBe(1);
    });
  });

  /**
   * ORI to CCR - OR Immediate to CCR
   */
  describe('ORI to CCR', () => {
    it('should OR immediate with CCR', () => {
      const code = `
        ORG $1000
        MOVE #$00, CCR
        ORI #$0F, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const ccr = emulator.getCCR();
      expect((ccr & 0x1F) >>> 0).toBe(0x0F);
    });

    it('should set carry flag', () => {
      const code = `
        ORG $1000
        MOVE #$00, CCR
        ORI #$01, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(1);
    });

    it('should set multiple CCR flags', () => {
      const code = `
        ORG $1000
        MOVE #$00, CCR
        ORI #$1F, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const ccr = emulator.getCCR();
      expect((ccr & 0x1F) >>> 0).toBe(0x1F);
    });

    it('should preserve already set flags', () => {
      const code = `
        ORG $1000
        MOVE #$04, CCR
        ORI #$08, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getZFlag()).toBe(1);
      expect(emulator.getNFlag()).toBe(1);
    });
  });

  /**
   * EORI to CCR - XOR Immediate to CCR
   */
  describe('EORI to CCR', () => {
    it('should XOR immediate with CCR', () => {
      const code = `
        ORG $1000
        MOVE #$FF, CCR
        EORI #$0F, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const ccr = emulator.getCCR();
      expect((ccr & 0x0F) >>> 0).toBe(0x00);
    });

    it('should toggle CCR flags', () => {
      const code = `
        ORG $1000
        MOVE #$1F, CCR
        EORI #$01, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      expect(emulator.getCFlag()).toBe(0);
    });

    it('should toggle multiple flags', () => {
      const code = `
        ORG $1000
        MOVE #$00, CCR
        EORI #$1F, CCR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const ccr = emulator.getCCR();
      expect((ccr & 0x1F) >>> 0).toBe(0x1F);
    });
  });

  /**
   * MOVE to SR - Move to Status Register
   */
  describe('MOVE to SR', () => {
    it('should move value to SR', () => {
      const code = `
        ORG $1000
        MOVE #$2700, SR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sr = emulator.getSR();
      expect((sr & 0xFFFF) >>> 0).toBe(0x2700);
    });

    it('should set interrupt mask in SR', () => {
      const code = `
        ORG $1000
        MOVE #$2700, SR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sr = emulator.getSR();
      const intMask = (sr >> 8) & 0x07;
      expect(intMask >>> 0).toBe(0x07);
    });

    it('should set individual SR bits', () => {
      const code = `
        ORG $1000
        MOVE #$0004, SR
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
   * MOVE from SR - Move from Status Register
   */
  describe('MOVE from SR', () => {
    it('should read SR value to register', () => {
      const code = `
        ORG $1000
        MOVE #$2700, SR
        MOVE SR, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const d0Value = emulator.getRegisters()[8] >>> 0;
      expect(d0Value).toBe(0x2700);
    });

    it('should read current SR with CCR', () => {
      const code = `
        ORG $1000
        MOVE.L #$00000001, D1
        SUB #$00000001, D1
        MOVE SR, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const d0Value = emulator.getRegisters()[8] & 0x04;
      expect(d0Value >>> 0).toBe(0x04);
    });

    it('should preserve SR in register', () => {
      const code = `
        ORG $1000
        MOVE #$2704, SR
        MOVE SR, D0
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 30 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const d0Value = emulator.getRegisters()[8] >>> 0;
      expect(d0Value).toBe(0x2704);
    });
  });

  /**
   * ORI to SR - OR Immediate to SR
   */
  describe('ORI to SR', () => {
    it('should OR immediate with SR', () => {
      const code = `
        ORG $1000
        MOVE #$0000, SR
        ORI #$2700, SR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sr = emulator.getSR();
      expect((sr & 0x2700) >>> 0).toBe(0x2700);
    });

    it('should set interrupt mask', () => {
      const code = `
        ORG $1000
        ORI #$0700, SR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sr = emulator.getSR();
      const intMask = (sr >> 8) & 0x07;
      expect(intMask >>> 0).toBe(0x07);
    });
  });

  /**
   * ANDI to SR - AND Immediate to SR
   */
  describe('ANDI to SR', () => {
    it('should AND immediate with SR', () => {
      const code = `
        ORG $1000
        MOVE #$FFFF, SR
        ANDI #$EFFF, SR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sr = emulator.getSR();
      expect(((sr >> 12) & 0x01) >>> 0).toBe(0x00);
    });

    it('should clear interrupt mask', () => {
      const code = `
        ORG $1000
        MOVE #$2700, SR
        ANDI #$F8FF, SR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sr = emulator.getSR();
      const intMask = (sr >> 8) & 0x07;
      expect(intMask >>> 0).toBe(0x00);
    });
  });

  /**
   * EORI to SR - XOR Immediate to SR
   */
  describe('EORI to SR', () => {
    it('should XOR immediate with SR', () => {
      const code = `
        ORG $1000
        MOVE #$2000, SR
        EORI #$2000, SR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sr = emulator.getSR();
      expect(((sr >> 13) & 0x01) >>> 0).toBe(0x00);
    });

    it('should toggle supervisor bit', () => {
      const code = `
        ORG $1000
        MOVE #$0000, SR
        EORI #$2000, SR
        END
      `;
      const emulator = new Emulator(code);
      let stop = false;
      for (let i = 0; i < 20 && !stop; i++) {
        stop = emulator.emulationStep();
      }
      const sr = emulator.getSR();
      expect(((sr >> 13) & 0x01) >>> 0).toBe(0x01);
    });
  });
});
