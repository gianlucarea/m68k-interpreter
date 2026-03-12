/**
 * Memory management for M68K emulator
 * Handles byte, word, and long-word memory access
 */

import { CODE_LONG, CODE_WORD, CODE_BYTE } from './operations';

const MAX_ADDRESS = 0x7fffffff;

export class Memory {
  private memory: Record<number, number> = {};

  /**
   * Get entire memory map
   */
  getMemory(): Record<number, number> {
    return { ...this.memory };
  }

  /**
   * Set entire memory from external map
   */
  setMemory(memoryMap: Record<number, number>): void {
    this.memory = { ...memoryMap };
  }

  /**
   * Get a single byte from memory
   */
  getByte(address: number): number {
    address = address >>> 0;
    if (this.memory[address] === undefined) return 0x00;
    return this.memory[address];
  }

  /**
   * Get a word (2 bytes) from memory
   */
  getWord(address: number): number {
    const firstByte = this.getByte(address);

    if (!this.isValidAddress(address + 1)) return 0x0000;

    const secondByte = this.getByte(address + 1);
    return (((firstByte << 8) | secondByte) & 0xffff) >>> 0;
  }

  /**
   * Get a long-word (4 bytes) from memory
   */
  getLong(address: number): number {
    const byte0 = this.getByte(address);
    if (!this.isValidAddress(address + 1)) return 0;

    const byte1 = this.getByte(address + 1);
    if (!this.isValidAddress(address + 2)) return 0;

    const byte2 = this.getByte(address + 2);
    if (!this.isValidAddress(address + 3)) return 0;

    const byte3 = this.getByte(address + 3);
    return (((byte0 << 24) | (byte1 << 16) | (byte2 << 8) | byte3) >>> 0);
  }

  /**
   * Set a single byte in memory
   */
  setByte(address: number, value: number): void {
    address = address >>> 0;
    this.memory[address] = (value & 0xff) >>> 0;
  }

  /**
   * Set a word (2 bytes) in memory
   */
  setWord(address: number, value: number): void {
    address = address >>> 0;
    this.setByte(address + 0, (value >>> 8) & 0xff);
    this.setByte(address + 1, value & 0xff);
  }

  /**
   * Set a long-word (4 bytes) in memory
   */
  setLong(address: number, value: number): void {
    address = address >>> 0;
    this.setByte(address + 0, (value >>> 24) & 0xff);
    this.setByte(address + 1, (value >>> 16) & 0xff);
    this.setByte(address + 2, (value >>> 8) & 0xff);
    this.setByte(address + 3, value & 0xff);
  }

  /**
   * Set value in memory based on size code
   * @param address - Memory address
   * @param value - Value to set
   * @param size - Size code: CODE_BYTE (0), CODE_WORD (1), CODE_LONG (2)
   */
  set(address: number, value: number, size: number): void {
    switch (size) {
      case CODE_LONG:
        this.setLong(address, value);
        break;
      case CODE_WORD:
        this.setWord(address, value);
        break;
      case CODE_BYTE:
        this.setByte(address, value);
        break;
    }
  }

  /**
   * Check if address is valid
   */
  isValidAddress(address: number): boolean {
    address = address >>> 0;
    return 0 <= address && address <= MAX_ADDRESS;
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.memory = {};
  }

  /**
   * Get number of used memory addresses
   */
  getUsedSize(): number {
    return Object.keys(this.memory).length;
  }
}
