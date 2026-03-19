/**
 * Arithmetic and logical operations for M68K emulator
 * Handles ADD, SUB, MOVE, AND, OR, and other instruction operations
 */

export const CODE_LONG = 2;
export const CODE_WORD = 1;
export const CODE_BYTE = 0;

export const BYTE_MASK = 0x000000ff;
export const WORD_MASK = 0x0000ffff;
export const LONG_MASK = 0xffffffff;
export const MSB_BYTE_MASK = 0x80;
export const MSB_WORD_MASK = 0x8000;
export const MSB_LONG_MASK = 0x80000000;

function addCCR(
  positive: boolean,
  negative: boolean,
  fullRes: number,
  result: number,
  ccr: number,
  mask: number
): number {
  // Overflow
  if (positive && result < 0) ccr = (ccr | 0x02) >>> 0;
  // Positive + positive can't be negative
  else if (negative && result > 0) ccr = (ccr | 0x02) >>> 0;
  // Negative + negative can't be positive
  else ccr = (ccr & 0xfd) >>> 0;

  // Carry
  if (((fullRes & ~mask) >>> 0) !== 0) ccr = (ccr | 0x01) >>> 0;
  else ccr = (ccr & 0xfe) >>> 0;

  // Zero
  if (result === 0) ccr = (ccr | 0x04) >>> 0;
  else ccr = (ccr & 0xfb) >>> 0;

  // Negative
  if (result < 0) ccr = (ccr | 0x08) >>> 0;
  else ccr = (ccr & 0xf7) >>> 0;

  // Extended
  if (((fullRes & ~mask) >>> 0) !== 0) ccr = (ccr | 0x10) >>> 0;
  else ccr = (ccr & 0xef) >>> 0;

  return ccr;
}

function addWord(src: number, dest: number, ccr: number, isSub: boolean): [number, number] {
  let aux = dest;

  // need signed 16 bits dest and src for positive and negative testing
  const dest16 = new Int16Array(1);
  dest16[0] = dest & WORD_MASK;
  const src16 = new Int16Array(1);
  src16[0] = src & WORD_MASK;

  const positive = dest16[0] > 0 && src16[0] >= 0;
  const negative = dest16[0] < 0 && src16[0] < 0;

  aux = (aux & ~WORD_MASK) >>> 0; // Save the 16 leftmost bits of the register
  dest = (dest & WORD_MASK) >>> 0; // Extract the 16 rightmost bits from destination

  if (isSub) dest -= (src & WORD_MASK) >>> 0;
  else dest += (src & WORD_MASK) >>> 0;

  // Force 16 bit signed type on the 16 rightmost bits of the result
  const result = new Int16Array(1);
  result[0] = dest & WORD_MASK;

  // Update CCR
  ccr = addCCR(positive, negative, dest, result[0], ccr, WORD_MASK);

  dest = (dest & WORD_MASK) >>> 0; // Trim again to 16
  aux += dest; // Sum it to aux that contained the 16 leftmost bits of dest (32 bit sum)
  return [aux, ccr];
}

function addByte(src: number, dest: number, ccr: number, isSub: boolean): [number, number] {
  let aux = dest;

  // need signed 8 bits dest and src for positive and negative testing
  const dest8 = new Int8Array(1);
  dest8[0] = dest & BYTE_MASK;
  const src8 = new Int8Array(1);
  src8[0] = src & BYTE_MASK;

  const positive = dest8[0] > 0 && src8[0] > 0;
  const negative = dest8[0] < 0 && src8[0] < 0;

  aux = (aux & ~BYTE_MASK) >>> 0; // Save the 8 leftmost bits
  dest = (dest & BYTE_MASK) >>> 0; // Extract 8 rightmost bits

  if (isSub) dest -= (src & BYTE_MASK) >>> 0;
  else dest += (src & BYTE_MASK) >>> 0;

  // Force 8 bit signed type on the result
  const result = new Int8Array(1);
  result[0] = dest & BYTE_MASK;

  // Update CCR
  ccr = addCCR(positive, negative, dest, result[0], ccr, BYTE_MASK);

  dest = (dest & BYTE_MASK) >>> 0; // Trim again to 8
  aux += dest;
  return [aux, ccr];
}

function addLong(src: number, dest: number, ccr: number, isSub: boolean): [number, number] {
  const positive = (dest | 0) > 0 && (src | 0) > 0;
  const negative = (dest | 0) < 0 && (src | 0) < 0;

  if (isSub) dest -= src;
  else dest += src;

  const carry = dest > 0xffffffff;
  dest = dest | 0;

  if (positive && dest < 0) ccr = (ccr | 0x02) >>> 0;
  // Positive + positive can't be negative
  else if (negative && dest > 0) ccr = (ccr | 0x02) >>> 0;
  // Negative + negative can't be positive
  else ccr = (ccr & 0xfd) >>> 0;

  // Carry
  if (carry) ccr = (ccr | 0x01) >>> 0;
  else ccr = (ccr & 0xfe) >>> 0;

  // Zero
  if (dest === 0) ccr = (ccr | 0x04) >>> 0;
  else ccr = (ccr & 0xfb) >>> 0;

  // Negative
  if (dest < 0) ccr = (ccr | 0x08) >>> 0;
  else ccr = (ccr & 0xf7) >>> 0;

  // Extended
  if (carry) ccr = (ccr | 0x10) >>> 0;
  else ccr = (ccr & 0xef) >>> 0;

  return [dest, ccr];
}

export function addOP(src: number, dest: number, ccr: number, size: number, isSub: boolean): [number, number] {
  switch (size) {
    case CODE_LONG:
      return addLong(src, dest, ccr, isSub);
    case CODE_WORD:
      return addWord(src, dest, ccr, isSub);
    case CODE_BYTE:
      return addByte(src, dest, ccr, isSub);
    default:
      throw new Error('Invalid size');
  }
}

function moveCCR(res: number, ccr: number): number {
  // Setting carry and overflow bits to 0
  ccr = (ccr & 0xfc) >>> 0;

  // Zero
  if (res === 0) ccr = (ccr | 0x04) >>> 0;
  else ccr = (ccr & 0xfb) >>> 0;

  // Negative
  if (res < 0) ccr = (ccr | 0x08) >>> 0;
  else ccr = (ccr & 0xf7) >>> 0;

  return ccr;
}

export function moveOP(src: number, dest: number, ccr: number, size: number): [number, number] {
  switch (size) {
    case CODE_LONG:
      return [src | 0, moveCCR(src | 0, ccr)];
    case CODE_WORD: {
      const aux = ((dest & ~WORD_MASK) | (src & WORD_MASK)) | 0;
      const aux16 = new Int16Array(1);
      aux16[0] = aux & WORD_MASK; // Evaluate CCR as signed 16-bit result

      return [aux, moveCCR(aux16[0], ccr)];
    }
    case CODE_BYTE: {
      const aux = ((dest & ~BYTE_MASK) | (src & BYTE_MASK)) | 0;
      const aux8 = new Int8Array(1);
      aux8[0] = aux & BYTE_MASK; // Evaluate CCR as signed 8-bit result

      return [aux, moveCCR(aux8[0], ccr)];
    }
    default:
      throw new Error('Invalid size');
  }
}

export function swapOP(op: number, ccr: number): [number, number] {
  let tmp = op << 16; // Move first 16 bits to most significant positions
  op = op >> 16; // Move last 16 bits to least significant positions
  tmp += op; // Combine register
  return [tmp, moveCCR(tmp | 0, ccr)]; // Same behaviour as move
}

export function exgOP(op1: number, op2: number): [number, number] {
  return [op2, op1];
}

export function clrOP(size: number, op: number, ccr: number): [number, number] {
  ccr = (ccr & 0x10) >>> 0; // Reset every bit but the Extended bit
  ccr = (ccr | 0x04) >>> 0; // Set zero bit to 1

  switch (size) {
    case CODE_BYTE:
      return [op & ~BYTE_MASK, ccr];
    case CODE_WORD:
      return [op & ~WORD_MASK, ccr];
    case CODE_LONG:
      return [0x00000000, ccr];
    default:
      throw new Error('Invalid size');
  }
}

export function notOP(size: number, op: number, ccr: number): [number, number] {
  let res: number;

  switch (size) {
    case CODE_BYTE: {
      res = ((op & ~BYTE_MASK) + (~op & BYTE_MASK)) >>> 0;
      const res8 = new Int8Array(1);
      res8[0] = res & BYTE_MASK; // Force the result to 8 bit signed for CCR
      return [res, moveCCR(res8[0], ccr)]; // Same ccr behaviour as move
    }
    case CODE_WORD: {
      res = ((op & ~WORD_MASK) + (~op & WORD_MASK)) >>> 0;
      const res16 = new Int16Array(1);
      res16[0] = res & WORD_MASK; // Force the result to 16 bit signed for CCR
      return [res, moveCCR(res16[0], ccr)]; // Same ccr behaviour as move
    }
    case CODE_LONG: {
      res = (~op) >>> 0;
      return [res, moveCCR(res | 0, ccr)]; // Same ccr behaviour as move
    }
    default:
      throw new Error('Invalid size');
  }
}

export function andOP(size: number, op1: number, op2: number, ccr: number): [number, number] {
  let res: number;

  switch (size) {
    case CODE_BYTE: {
      res = ((op1 & BYTE_MASK) & (op2 & BYTE_MASK)) >>> 0;
      res = (op1 & ~BYTE_MASK) + res;
      const res8 = new Int8Array(1);
      res8[0] = res & BYTE_MASK;
      return [res, moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      res = ((op1 & WORD_MASK) & (op2 & WORD_MASK)) >>> 0;
      res = (op1 & ~WORD_MASK) + res;
      const res16 = new Int16Array(1);
      res16[0] = res & WORD_MASK;
      return [res, moveCCR(res16[0], ccr)];
    }
    case CODE_LONG:
      res = (op1 & op2) >>> 0;
      return [res, moveCCR(res | 0, ccr)];
    default:
      throw new Error('Invalid size');
  }
}

export function orOP(size: number, op1: number, op2: number, ccr: number): [number, number] {
  let res: number;

  switch (size) {
    case CODE_BYTE: {
      res = ((op1 & BYTE_MASK) | (op2 & BYTE_MASK)) >>> 0;
      res = (op1 & ~BYTE_MASK) + res;
      const res8 = new Int8Array(1);
      res8[0] = res & BYTE_MASK;
      return [res, moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      res = ((op1 & WORD_MASK) | (op2 & WORD_MASK)) >>> 0;
      res = (op1 & ~WORD_MASK) + res;
      const res16 = new Int16Array(1);
      res16[0] = res & WORD_MASK;
      return [res, moveCCR(res16[0], ccr)];
    }
    case CODE_LONG:
      res = (op1 | op2) >>> 0;
      return [res, moveCCR(res | 0, ccr)];
    default:
      throw new Error('Invalid size');
  }
}

export function eorOP(size: number, op1: number, op2: number, ccr: number): [number, number] {
  let res: number;

  switch (size) {
    case CODE_BYTE: {
      res = ((op1 & BYTE_MASK) ^ (op2 & BYTE_MASK)) >>> 0;
      res = (op1 & ~BYTE_MASK) + res;
      const res8 = new Int8Array(1);
      res8[0] = res & BYTE_MASK;
      return [res, moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      res = ((op1 & WORD_MASK) ^ (op2 & WORD_MASK)) >>> 0;
      res = (op1 & ~WORD_MASK) + res;
      const res16 = new Int16Array(1);
      res16[0] = res & WORD_MASK;
      return [res, moveCCR(res16[0], ccr)];
    }
    case CODE_LONG:
      res = (op1 ^ op2) >>> 0;
      return [res, moveCCR(res | 0, ccr)];
    default:
      throw new Error('Invalid size');
  }
}

export function negOP(size: number, op: number, ccr: number): [number, number] {
  return addOP(op, 0, ccr, size, true);
}

export function extOP(size: number, op: number, ccr: number): [number, number] {
  let res: number;

  switch (size) {
    case CODE_WORD: {
      // Extend byte to word
      const res8 = new Int8Array(1);
      res8[0] = op & BYTE_MASK;
      res = (op & ~BYTE_MASK) + (res8[0] & WORD_MASK);
      const res16 = new Int16Array(1);
      res16[0] = res & WORD_MASK;
      return [res, moveCCR(res16[0], ccr)];
    }
    case CODE_LONG: {
      // Extend word to long
      const resW = new Int16Array(1);
      resW[0] = op & WORD_MASK;
      res = resW[0]; // Sign-extend word to long
      return [res, moveCCR(res | 0, ccr)];
    }
    default:
      throw new Error('Invalid size for EXT');
  }
}

export function cmpOP(src: number, dest: number, ccr: number, size: number): number {
  const [, newCCR] = addOP(src, dest, ccr, size, true);
  return newCCR;
}

export function tstOP(op: number, ccr: number, _size: number): number {
  return moveCCR(op, ccr);
}

export function lslOP(
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  let carry = 0;

  switch (size) {
    case CODE_BYTE: {
      const res8 = new Int8Array(1);
      for (let i = 0; i < count; i++) {
        carry = (op & MSB_BYTE_MASK) >>> 7;
        op = op << 1;
      }
      res8[0] = op & BYTE_MASK;
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [res8[0], moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      const res16 = new Int16Array(1);
      for (let i = 0; i < count; i++) {
        carry = (op & MSB_WORD_MASK) >> 15;
        op = op << 1;
      }
      res16[0] = op & WORD_MASK;
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [res16[0], moveCCR(res16[0], ccr)];
    }
    case CODE_LONG: {
      for (let i = 0; i < count; i++) {
        carry = (op & MSB_LONG_MASK) >>> 31;
        op = (op << 1) >>> 0;
      }
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [op, moveCCR(op | 0, ccr)];
    }
    default:
      throw new Error('Invalid size');
  }
}

export function aslOP(
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  // ASL (Arithmetic Shift Left) is the same as LSL
  return lslOP(count, op, ccr, size);
}

export function lsrOP(
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  let carry = 0;

  switch (size) {
    case CODE_BYTE: {
      const res8 = new Int8Array(1);
      for (let i = 0; i < count; i++) {
        carry = op & 0x01;
        op = (op >>> 1) & ~MSB_BYTE_MASK;
      }
      res8[0] = op & BYTE_MASK;
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [res8[0], moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      const res16 = new Int16Array(1);
      for (let i = 0; i < count; i++) {
        carry = op & 0x01;
        op = (op >>> 1) & ~MSB_WORD_MASK;
      }
      res16[0] = op & WORD_MASK;
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [res16[0], moveCCR(res16[0], ccr)];
    }
    case CODE_LONG:
      for (let i = 0; i < count; i++) {
        carry = op & 0x01;
        op = op >>> 1;
      }
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [op, moveCCR(op | 0, ccr)];
    default:
      throw new Error('Invalid size');
  }
}

export function asrOP(
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  // ASR (Arithmetic Shift Right) - preserves sign bit
  let carry = 0;

  switch (size) {
    case CODE_BYTE: {
      const res8 = new Int8Array(1);
      const signBit8 = (op & MSB_BYTE_MASK) >>> 0;
      for (let i = 0; i < count; i++) {
        carry = op & 0x01;
        op = ((op >>> 1) | signBit8) >>> 0;
      }
      res8[0] = op & BYTE_MASK;
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [res8[0], moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      const res16 = new Int16Array(1);
      const signBit16 = (op & MSB_WORD_MASK) >>> 0;
      for (let i = 0; i < count; i++) {
        carry = op & 0x01;
        op = ((op >>> 1) | signBit16) >>> 0;
      }
      res16[0] = op & WORD_MASK;
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [res16[0], moveCCR(res16[0], ccr)];
    }
    case CODE_LONG: {
      const signBit32 = (op & MSB_LONG_MASK) >>> 0;
      for (let i = 0; i < count; i++) {
        carry = op & 0x01;
        op = ((op >>> 1) | signBit32) >>> 0;
      }
      if (carry) ccr = (ccr | 0x01) >>> 0;
      else ccr = (ccr & 0xfe) >>> 0;
      return [op, moveCCR(op | 0, ccr)];    }    default:
      throw new Error('Invalid size');
  }
}

export function rolOP(
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  switch (size) {
    case CODE_BYTE: {
      for (let i = 0; i < count; i++) {
        const carry = (op & MSB_BYTE_MASK) >>> 7;
        op = ((op << 1) | carry) & BYTE_MASK;
      }
      const res8 = new Int8Array(1);
      res8[0] = op & BYTE_MASK;
      return [op, moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      for (let i = 0; i < count; i++) {
        const carry = (op & MSB_WORD_MASK) >> 15;
        op = ((op << 1) | carry) & WORD_MASK;
      }
      const res16 = new Int16Array(1);
      res16[0] = op & WORD_MASK;
      return [op, moveCCR(res16[0], ccr)];
    }
    case CODE_LONG:
      for (let i = 0; i < count; i++) {
        const carry = (op & MSB_LONG_MASK) >>> 31;
        op = ((op << 1) | carry) >>> 0;
      }
      return [op, moveCCR(op | 0, ccr)];
    default:
      throw new Error('Invalid size');
  }
}

export function rorOP(
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  switch (size) {
    case CODE_BYTE: {
      for (let i = 0; i < count; i++) {
        const carry = op & 0x01;
        op = ((op >>> 1) | (carry << 7)) & BYTE_MASK;
      }
      const res8 = new Int8Array(1);
      res8[0] = op & BYTE_MASK;
      return [op, moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      for (let i = 0; i < count; i++) {
        const carry = op & 0x01;
        op = ((op >>> 1) | (carry << 15)) & WORD_MASK;
      }
      const res16 = new Int16Array(1);
      res16[0] = op & WORD_MASK;
      return [op, moveCCR(res16[0], ccr)];
    }
    case CODE_LONG:
      for (let i = 0; i < count; i++) {
        const carry = op & 0x01;
        op = ((op >>> 1) | (carry << 31)) >>> 0;
      }
      return [op, moveCCR(op | 0, ccr)];
    default:
      throw new Error('Invalid size');
  }
}

export function roxlOP(
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  // ROXL: Rotate Left including X flag
  // The X flag is treated as part of the rotation path
  let xBit = (ccr & 0x10) >> 4;

  switch (size) {
    case CODE_BYTE: {
      // 9-bit rotation (8-bit value + X flag)
      for (let i = 0; i < count; i++) {
        const msb = (op & MSB_BYTE_MASK) >>> 7;
        op = ((op << 1) | xBit) & BYTE_MASK;
        xBit = msb;
      }
      const res8 = new Int8Array(1);
      res8[0] = op & BYTE_MASK;
      if (xBit) ccr = (ccr | 0x10) >>> 0; // Set X flag
      else ccr = (ccr & 0xef) >>> 0; // Clear X flag
      return [op, moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      // 17-bit rotation (16-bit value + X flag)
      for (let i = 0; i < count; i++) {
        const msb = (op & MSB_WORD_MASK) >>> 15;
        op = ((op << 1) | xBit) & WORD_MASK;
        xBit = msb;
      }
      const res16 = new Int16Array(1);
      res16[0] = op & WORD_MASK;
      if (xBit) ccr = (ccr | 0x10) >>> 0; // Set X flag
      else ccr = (ccr & 0xef) >>> 0; // Clear X flag
      return [op, moveCCR(res16[0], ccr)];
    }
    case CODE_LONG: {
      // 33-bit rotation (32-bit value + X flag)
      for (let i = 0; i < count; i++) {
        const msb = (op & MSB_LONG_MASK) >>> 31;
        op = ((op << 1) | xBit) >>> 0;
        xBit = msb;
      }
      if (xBit) ccr = (ccr | 0x10) >>> 0; // Set X flag
      else ccr = (ccr & 0xef) >>> 0; // Clear X flag
      return [op, moveCCR(op | 0, ccr)];
    }
    default:
      throw new Error('Invalid size');
  }
}

export function roxrOP(
  count: number,
  op: number,
  ccr: number,
  size: number
): [number, number] {
  // ROXR: Rotate Right including X flag
  // The X flag is treated as part of the rotation path
  let xBit = (ccr & 0x10) >> 4;

  switch (size) {
    case CODE_BYTE: {
      // 9-bit rotation (8-bit value + X flag)
      for (let i = 0; i < count; i++) {
        const lsb = op & 0x01;
        op = ((op >>> 1) | (xBit << 7)) & BYTE_MASK;
        xBit = lsb;
      }
      const res8 = new Int8Array(1);
      res8[0] = op & BYTE_MASK;
      if (xBit) ccr = (ccr | 0x10) >>> 0; // Set X flag
      else ccr = (ccr & 0xef) >>> 0; // Clear X flag
      return [op, moveCCR(res8[0], ccr)];
    }
    case CODE_WORD: {
      // 17-bit rotation (16-bit value + X flag)
      for (let i = 0; i < count; i++) {
        const lsb = op & 0x01;
        op = ((op >>> 1) | (xBit << 15)) & WORD_MASK;
        xBit = lsb;
      }
      const res16 = new Int16Array(1);
      res16[0] = op & WORD_MASK;
      if (xBit) ccr = (ccr | 0x10) >>> 0; // Set X flag
      else ccr = (ccr & 0xef) >>> 0; // Clear X flag
      return [op, moveCCR(res16[0], ccr)];
    }
    case CODE_LONG: {
      // 33-bit rotation (32-bit value + X flag)
      for (let i = 0; i < count; i++) {
        const lsb = op & 0x01;
        op = ((op >>> 1) | (xBit << 31)) >>> 0;
        xBit = lsb;
      }
      if (xBit) ccr = (ccr | 0x10) >>> 0; // Set X flag
      else ccr = (ccr & 0xef) >>> 0; // Clear X flag
      return [op, moveCCR(op | 0, ccr)];
    }
    default:
      throw new Error('Invalid size');
  }
}
export function mulsOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  // MULS: Signed multiply
  // For 16-bit operands, result is 32-bit (destination register holds result)
  // For 32-bit operands, results in 64-bit (we store low 32 bits in dest)
  let srcSigned: number;
  let destSigned: number;
  
  if (size === CODE_WORD) {
    // Treat as 16-bit signed values - extract 16 bits and sign-extend
    const srcTemp = new Int16Array(1);
    srcTemp[0] = src & WORD_MASK;
    srcSigned = srcTemp[0];
    
    const destTemp = new Int16Array(1);
    destTemp[0] = dest & WORD_MASK;
    destSigned = destTemp[0];
  } else {
    srcSigned = src | 0;
    destSigned = dest | 0;
  }
  
  const result = (srcSigned * destSigned) >>> 0;
  
  // Update CCR based on result
  if (result === 0) ccr = (ccr | 0x04) >>> 0; // Z flag
  else ccr = (ccr & 0xfb) >>> 0;
  
  if ((result | 0) < 0) ccr = (ccr | 0x08) >>> 0; // N flag
  else ccr = (ccr & 0xf7) >>> 0;
  
  ccr = (ccr & 0xfd) >>> 0; // Clear V flag
  ccr = (ccr & 0xfe) >>> 0; // Clear C flag
  
  return [result, ccr];
}

export function muluOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  // MULU: Unsigned multiply
  // For 16-bit operands, result is 32-bit (destination register holds result)
  // For 32-bit operands, results in 64-bit (we store low 32 bits in dest)
  let srcUnsigned: number;
  let destUnsigned: number;
  
  if (size === CODE_WORD) {
    // Treat as 16-bit unsigned values - extract 16 bits
    srcUnsigned = src & WORD_MASK;
    destUnsigned = dest & WORD_MASK;
  } else {
    srcUnsigned = src >>> 0;
    destUnsigned = dest >>> 0;
  }
  
  const result = (srcUnsigned * destUnsigned) >>> 0;
  
  // Update CCR based on result
  if (result === 0) ccr = (ccr | 0x04) >>> 0; // Z flag
  else ccr = (ccr & 0xfb) >>> 0;
  
  if ((result | 0) < 0) ccr = (ccr | 0x08) >>> 0; // N flag
  else ccr = (ccr & 0xf7) >>> 0;
  
  ccr = (ccr & 0xfd) >>> 0; // Clear V flag
  ccr = (ccr & 0xfe) >>> 0; // Clear C flag
  
  return [result, ccr];
}

export function divsOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  // DIVS: Signed division
  // Quotient in low word, remainder in high word (for 32-bit result)
  // Returns remainder:quotient in a single 32-bit value
  
  if (src === 0) {
    // Division by zero - would cause trap in real M68K
    return [dest, ccr];
  }
  
  let srcSigned: number;
  let destSigned: number;
  
  if (size === CODE_WORD) {
    // Convert to signed 16-bit divisor
    const srcTemp = new Int16Array(1);
    srcTemp[0] = src & WORD_MASK;
    srcSigned = srcTemp[0];
    
    // Dividend is 32-bit signed
    destSigned = dest | 0;
  } else {
    srcSigned = src | 0;
    destSigned = dest | 0;
  }
  
  // Perform signed division
  const quotient = Math.trunc(destSigned / srcSigned);
  const remainder = destSigned % srcSigned;
  
  // Pack result: remainder in high word, quotient in low word
  let result = ((remainder & WORD_MASK) << 16) | (quotient & WORD_MASK);
  result = result >>> 0;
  
  // Update CCR
  if (quotient === 0) ccr = (ccr | 0x04) >>> 0; // Z flag
  else ccr = (ccr & 0xfb) >>> 0;
  
  if (quotient < 0) ccr = (ccr | 0x08) >>> 0; // N flag
  else ccr = (ccr & 0xf7) >>> 0;
  
  ccr = (ccr & 0xfd) >>> 0; // Clear V flag
  ccr = (ccr & 0xfe) >>> 0; // Clear C flag
  
  return [result, ccr];
}

export function divuOP(size: number, src: number, dest: number, ccr: number): [number, number] {
  // DIVU: Unsigned division
  // Quotient in low word, remainder in high word (for 32-bit result)
  // Returns remainder:quotient in a single 32-bit value
  
  if (src === 0) {
    // Division by zero - would cause trap in real M68K
    return [dest, ccr];
  }
  
  let srcUnsigned: number;
  let destUnsigned: number;
  
  if (size === CODE_WORD) {
    // Convert to unsigned 16-bit divisor
    srcUnsigned = src & WORD_MASK;
    
    // Dividend is 32-bit unsigned
    destUnsigned = dest >>> 0;
  } else {
    srcUnsigned = src >>> 0;
    destUnsigned = dest >>> 0;
  }
  
  // Perform unsigned division
  const quotient = Math.trunc(destUnsigned / srcUnsigned);
  const remainder = destUnsigned % srcUnsigned;
  
  // Pack result: remainder in high word, quotient in low word
  let result = ((remainder & WORD_MASK) << 16) | (quotient & WORD_MASK);
  result = result >>> 0;
  
  // Update CCR
  if (quotient === 0) ccr = (ccr | 0x04) >>> 0; // Z flag
  else ccr = (ccr & 0xfb) >>> 0;
  
  if (quotient < 0) ccr = (ccr | 0x08) >>> 0; // N flag
  else ccr = (ccr & 0xf7) >>> 0;
  
  ccr = (ccr & 0xfd) >>> 0; // Clear V flag
  ccr = (ccr & 0xfe) >>> 0; // Clear C flag
  
  return [result, ccr];
}

export function addxOP(src: number, dest: number, ccr: number, size: number): [number, number] {
  // ADDX: Add Extended (with X bit)
  // X bit (bit 4) carries over for multi-precision arithmetic
  const xBit = (ccr & 0x10) >> 4;
  
  // Add with X bit
  const [result, newCCR] = addOP(src + xBit, dest, ccr, size, false);
  return [result, newCCR];
}

export function subxOP(src: number, dest: number, ccr: number, size: number): [number, number] {
  // SUBX: Subtract Extended (with X bit)
  // X bit (bit 4) carries over for multi-precision arithmetic
  const xBit = (ccr & 0x10) >> 4;
  
  // Subtract with X bit
  const [result, newCCR] = addOP(src + xBit, dest, ccr, size, true);
  return [result, newCCR];
}

export function negxOP(size: number, op: number, ccr: number): [number, number] {
  // NEGX: Negate Extended (with X bit)
  // X bit (bit 4) carries over for multi-precision arithmetic
  const xBit = (ccr & 0x10) >> 4;
  
  // Negate with X bit: 0 - op - X
  const [result, newCCR] = addOP(op + xBit, 0, ccr, size, true);
  return [result, newCCR];
}

export function cmpmOP(src: number, dest: number, ccr: number, size: number): number {
  // CMPM: Compare Memory with Memory
  // This is essentially CMP but can be used with post-increment addressing
  return cmpOP(src, dest, ccr, size);
}