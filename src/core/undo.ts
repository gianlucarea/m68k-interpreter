/**
 * Undo system for M68K emulator
 * Maintains a stack of execution states for undo functionality
 */

export interface UndoFrame {
  pc: number;
  ccr: number;
  registers: Int32Array;
  memory: Record<number, number>;
  errors: string[];
  lastInstruction: string;
  line: number;
}

export class Undo {
  private stack: UndoFrame[] = [];

  push(pc: number, ccr: number, registers: Int32Array, memory: Record<number, number>, errors: string[], lastInstruction: string, line: number): void {
    this.stack.push({
      pc,
      ccr,
      registers: new Int32Array(registers),
      memory: { ...memory },
      errors: [...errors],
      lastInstruction,
      line,
    });
  }

  pop(): UndoFrame | undefined {
    return this.stack.pop();
  }

  peek(): UndoFrame | undefined {
    if (this.stack.length === 0) return undefined;
    return this.stack[this.stack.length - 1];
  }

  clear(): void {
    this.stack = [];
  }

  size(): number {
    return this.stack.length;
  }
}
