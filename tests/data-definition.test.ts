import { describe, it, expect } from 'vitest';
import { Emulator } from '../src/core/emulator';

/**
 * Helper: run emulator to completion (max iterations to avoid infinite loops)
 */
function runToEnd(emulator: Emulator, maxSteps = 200): void {
  for (let i = 0; i < maxSteps; i++) {
    if (emulator.emulationStep()) break;
  }
}

describe('Data Definition Directives', () => {
  // ═══════════════════════════════════════════════════
  // DC (Define Constant)
  // ═══════════════════════════════════════════════════
  describe('DC (Define Constant)', () => {
    it('DC.B with decimal values should write bytes to memory', () => {
      const code = `
        ORG $2000
        DATA: DC.B 10,20,30
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readByte(0x2000)).toBe(10);
      expect(emulator.readByte(0x2001)).toBe(20);
      expect(emulator.readByte(0x2002)).toBe(30);
    });

    it('DC.W with hex values should write words to memory', () => {
      const code = `
        ORG $2000
        DATA: DC.W $CAFE,$DEAD
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readWord(0x2000)).toBe(0xCAFE);
      expect(emulator.readWord(0x2002)).toBe(0xDEAD);
    });

    it('DC.L with hex values should write long words to memory', () => {
      const code = `
        ORG $2000
        DATA: DC.L $12345678,$AABBCCDD
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readLong(0x2000) >>> 0).toBe(0x12345678);
      expect(emulator.readLong(0x2004) >>> 0).toBe(0xAABBCCDD);
    });

    it('DC.B with binary values should write bytes to memory', () => {
      const code = `
        ORG $2000
        DATA: DC.B %10101010,%11110000
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readByte(0x2000)).toBe(0xAA);
      expect(emulator.readByte(0x2001)).toBe(0xF0);
    });

    it('DC.B with string should write ASCII bytes to memory', () => {
      const code = `
        ORG $2000
        MSG: DC.B "Hello"
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readByte(0x2000)).toBe(0x48); // 'H'
      expect(emulator.readByte(0x2001)).toBe(0x65); // 'e'
      expect(emulator.readByte(0x2002)).toBe(0x6C); // 'l'
      expect(emulator.readByte(0x2003)).toBe(0x6C); // 'l'
      expect(emulator.readByte(0x2004)).toBe(0x6F); // 'o'
    });

    it('DC.B with string and null terminator should write bytes and trailing value', () => {
      const code = `
        ORG $2000
        MSG: DC.B "Hi",0
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readByte(0x2000)).toBe(0x48); // 'H'
      expect(emulator.readByte(0x2001)).toBe(0x69); // 'i'
      expect(emulator.readByte(0x2002)).toBe(0);    // null terminator
    });

    it('DC.W with single value should write one word', () => {
      const code = `
        ORG $2000
        VAL: DC.W $1234
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readWord(0x2000)).toBe(0x1234);
    });

    it('DC with label should register data address', () => {
      const code = `
        ORG $2000
        MYDATA: DC.W $ABCD
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      const addrs = emulator.getDataAddresses();
      expect(addrs['mydata']).toBe(0x2000);
    });

    it('DC without label should still write data to memory', () => {
      const code = `
        ORG $2000
        DC.B $FF,$00
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readByte(0x2000)).toBe(0xFF);
      expect(emulator.readByte(0x2001)).toBe(0x00);
    });

    it('multiple DC directives should write sequentially', () => {
      const code = `
        ORG $3000
        A: DC.W $1111
        B: DC.W $2222
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readWord(0x3000)).toBe(0x1111);
      expect(emulator.readWord(0x3002)).toBe(0x2222);
      const addrs = emulator.getDataAddresses();
      expect(addrs['a']).toBe(0x3000);
      expect(addrs['b']).toBe(0x3002);
    });

    it('DC.B with ASCII char should write char code', () => {
      const code = `
        ORG $2000
        CH: DC.B 'A'
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readByte(0x2000)).toBe(65); // 'A'
    });

    it('DC.L with mixed decimal and hex should work', () => {
      const code = `
        ORG $2000
        DATA: DC.L 100,$FF
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      expect(emulator.readLong(0x2000)).toBe(100);
      expect(emulator.readLong(0x2004) >>> 0).toBe(0xFF);
    });
  });

  // ═══════════════════════════════════════════════════
  // DS (Define Space)
  // ═══════════════════════════════════════════════════
  describe('DS (Define Space)', () => {
    it('DS.B should reserve bytes of zero-initialized memory', () => {
      const code = `
        ORG $2000
        BUF: DS.B 10
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 10; i++) {
        expect(emulator.readByte(0x2000 + i)).toBe(0);
      }
      const addrs = emulator.getDataAddresses();
      expect(addrs['buf']).toBe(0x2000);
    });

    it('DS.W should reserve words of zero-initialized memory', () => {
      const code = `
        ORG $2000
        BUF: DS.W 5
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 5; i++) {
        expect(emulator.readWord(0x2000 + i * 2)).toBe(0);
      }
      const addrs = emulator.getDataAddresses();
      expect(addrs['buf']).toBe(0x2000);
    });

    it('DS.L should reserve long words of zero-initialized memory', () => {
      const code = `
        ORG $2000
        BUF: DS.L 4
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 4; i++) {
        expect(emulator.readLong(0x2000 + i * 4)).toBe(0);
      }
      const addrs = emulator.getDataAddresses();
      expect(addrs['buf']).toBe(0x2000);
    });

    it('DS.B 0 should reserve zero bytes', () => {
      const code = `
        ORG $2000
        EMPTY: DS.B 0
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      const addrs = emulator.getDataAddresses();
      expect(addrs['empty']).toBe(0x2000);
    });

    it('DS without label should still reserve space', () => {
      const code = `
        ORG $2000
        DS.W 3
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 3; i++) {
        expect(emulator.readWord(0x2000 + i * 2)).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════
  // DCB (Define Constant Block)
  // ═══════════════════════════════════════════════════
  describe('DCB (Define Constant Block)', () => {
    it('DCB.B should fill memory with repeated byte value', () => {
      const code = `
        ORG $2000
        FILL: DCB.B 10,$FF
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 10; i++) {
        expect(emulator.readByte(0x2000 + i)).toBe(0xFF);
      }
      const addrs = emulator.getDataAddresses();
      expect(addrs['fill']).toBe(0x2000);
    });

    it('DCB.W should fill memory with repeated word value', () => {
      const code = `
        ORG $2000
        FILL: DCB.W 5,$CAFE
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 5; i++) {
        expect(emulator.readWord(0x2000 + i * 2)).toBe(0xCAFE);
      }
    });

    it('DCB.L should fill memory with repeated long value', () => {
      const code = `
        ORG $2000
        FILL: DCB.L 3,$DEADBEEF
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 3; i++) {
        expect(emulator.readLong(0x2000 + i * 4) >>> 0).toBe(0xDEADBEEF);
      }
    });

    it('DCB without label should still fill memory', () => {
      const code = `
        ORG $2000
        DCB.B 4,$42
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 4; i++) {
        expect(emulator.readByte(0x2000 + i)).toBe(0x42);
      }
    });

    it('DCB.W with zero fill value should zero-fill', () => {
      const code = `
        ORG $2000
        ZEROS: DCB.W 3,0
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      for (let i = 0; i < 3; i++) {
        expect(emulator.readWord(0x2000 + i * 2)).toBe(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════
  // Integration Tests
  // ═══════════════════════════════════════════════════
  describe('Integration', () => {
    it('MOVE.W should read DC data from memory', () => {
      const code = `
        ORG $1000
        MOVE.W DATA,D0
        BRA DONE
        DATA: DC.W $1234,$5678
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      runToEnd(emulator);
      // D0 should contain $1234 (first word at DATA address)
      expect(emulator.getRegisters()[8] & 0xFFFF).toBe(0x1234);
    });

    it('LEA should load DC label address into register', () => {
      const code = `
        ORG $1000
        LEA DATA,A0
        BRA DONE
        DATA: DC.L $AABBCCDD
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      runToEnd(emulator);
      // A0 should contain the address of DATA
      const addrs = emulator.getDataAddresses();
      expect(emulator.getRegisters()[0] >>> 0).toBe(addrs['data']);
    });

    it('LEA + MOVE through pointer should read DC data', () => {
      const code = `
        ORG $1000
        LEA DATA,A0
        MOVE.L (A0),D0
        BRA DONE
        DATA: DC.L $DEADBEEF
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      runToEnd(emulator);
      const addrs = emulator.getDataAddresses();
      expect(emulator.getRegisters()[0] >>> 0).toBe(addrs['data']); // A0 = address
      expect(emulator.getRegisters()[8] >>> 0).toBe(0xDEADBEEF);    // D0 = data
    });

    it('DS should provide writable scratch space', () => {
      const code = `
        ORG $1000
        LEA BUF,A0
        MOVE.B #$42,(A0)
        BRA DONE
        BUF: DS.B 16
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      runToEnd(emulator);
      const addrs = emulator.getDataAddresses();
      expect(emulator.readByte(addrs['buf'])).toBe(0x42);
    });

    it('MOVE.W should read DCB filled data', () => {
      const code = `
        ORG $1000
        MOVE.W FILL,D1
        BRA DONE
        FILL: DCB.W 4,$FFFF
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      runToEnd(emulator);
      expect(emulator.getRegisters()[9] & 0xFFFF).toBe(0xFFFF);
    });

    it('mixed DC, DS, DCB with sequential addresses', () => {
      const code = `
        ORG $2000
        A: DC.W $1111
        B: DS.W 2
        C: DCB.B 3,$AA
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      const addrs = emulator.getDataAddresses();
      expect(addrs['a']).toBe(0x2000);
      expect(addrs['b']).toBe(0x2002);       // after 1 word
      expect(addrs['c']).toBe(0x2006);       // after 2 more words (4 bytes)
      expect(emulator.readWord(0x2000)).toBe(0x1111);
      expect(emulator.readWord(0x2002)).toBe(0);     // DS zero
      expect(emulator.readWord(0x2004)).toBe(0);     // DS zero
      expect(emulator.readByte(0x2006)).toBe(0xAA);  // DCB fill
      expect(emulator.readByte(0x2007)).toBe(0xAA);
      expect(emulator.readByte(0x2008)).toBe(0xAA);
    });

    it('data directives should not execute as instructions', () => {
      const code = `
        ORG $1000
        MOVE.L #$99,D0
        BRA DONE
        DATA: DC.W $CAFE
        BUF: DS.B 4
        FILL: DCB.B 2,$FF
        DONE:
        END
      `;
      const emulator = new Emulator(code);
      expect(emulator.getException()).toBeUndefined();
      runToEnd(emulator);
      // D0 should have $99 — program ran normally, data directives were skipped
      expect(emulator.getRegisters()[8]).toBe(0x99);
      // Data should still be in memory
      const addrs = emulator.getDataAddresses();
      expect(emulator.readWord(addrs['data'])).toBe(0xCAFE);
    });
  });
});
