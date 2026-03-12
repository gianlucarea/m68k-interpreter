/**
 * Type definitions for the M68K interpreter
 */

export interface Register {
  name: string;
  value: number;
  type: 'data' | 'address' | 'control';
}

export interface Registers {
  d0: number; // Data registers
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  d6: number;
  d7: number;
  a0: number; // Address registers
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  a6: number;
  a7: number; // Stack pointer
  pc: number; // Program counter
  ccr: number; // Condition code register
}

export interface ConditionFlags {
  z: number; // Zero
  v: number; // Overflow
  n: number; // Negative
  c: number; // Carry
  x: number; // Extend
}

export interface MemoryCell {
  [address: number]: number;
}

export interface ExecutionState {
  started: boolean;
  ended: boolean;
  stopped: boolean;
  lastInstruction: string;
  exception: string | null;
  errors: string[];
  currentLine: number;
}

export interface EmulationStep {
  registers: Partial<Registers>;
  memory: MemoryCell;
  flags: ConditionFlags;
  pc: number;
  instruction: string;
  error?: string;
}

export interface InstructionSet {
  mnemonic: string;
  operands: number;
  execute: (emulator: Emulator, operands: Operand[]) => void;
}

export interface Operand {
  type: 'register' | 'immediate' | 'memory' | 'address';
  value: number | string;
  size: 'b' | 'w' | 'l'; // byte, word, long
}

export interface EmulatorConfig {
  program: string;
  baseAddress?: number;
  memorySize?: number;
}

export interface Emulator {
  registers: Registers;
  memory: MemoryCell;
  flags: ConditionFlags;
  pc: number;
  getRegisters(): Registers;
  getMemory(): MemoryCell;
  getFlags(): ConditionFlags;
  getPC(): number;
  step(): boolean; // Returns true if execution ended
  reset(): void;
  undo(): void;
  getLastInstruction(): string;
  getErrors(): string[];
  getException(): string | null;
}
