/**
 * M68K Emulator - Main execution engine
 * Handles instruction parsing, execution, registers, memory, and condition codes
 */

import { Memory } from './memory';
import { Undo } from './undo';
import { Strings } from './strings';
import { CODE_LONG, CODE_WORD, CODE_BYTE } from './operations';
import * as alu from './operations';
import {
  type Operand,
  InstructionError,
  requireForm,
  splitOperands,
  parseOperand,
  registerList,
  isMemory,
  isPC,
  isData,
  isAlterable,
  isControl,
  isRegister,
  conditions,
  condition,
  instructionSpecs,
  aliases,
} from './instructions';

// Directive regexes
const ORG_REGEX = /^org\s+(?:0x|\$)([0-9a-f]+)/gim;
const END_REGEX = /^end\s*([_a-zA-Z][_a-zA-Z0-9]*)?$/gim;

// Data directive patterns (applied to lowercased instruction, after optional label: prefix)
const DC_PATTERN = /^dc\.[bwl]\s+/i;
const DS_PATTERN = /^ds\.[bwl]\s+/i;
const DCB_PATTERN = /^dcb\.[bwl]\s+/i;

export class Emulator {
  // Registers: A0-A7 (indices 0-7), D0-D7 (indices 8-15)
  private registers: Int32Array = new Int32Array(16);

  private pc: number = 0x0; // Program counter
  private ccr: number = 0x00; // Condition Code Register
  private interruptMask: number = 0x00; // Interrupt priority mask (bits 8-10 of SR)
  private supervisorMode: boolean = true; // Supervisor mode bit (bit 13 of SR)
  private traceBits: number = 0x00; // 68000 trace bit (bit 15 of SR; bit 14 is reserved)
  private memory: Memory;
  private undo: Undo;

  // Parsed instructions
  private instructions: Array<[string, number, boolean]> = []; // [instruction, line, isDirective]
  private clonedInstructions: string[] = []; // Original instructions for display

  // State
  private labels: Record<string, number> = {};
  private dataAddresses: Record<string, number> = {}; // label → memory address for DC/DS/DCB data
  private endPointer: [number, number] | undefined;
  private orgAddress: number | undefined; // The actual ORG address (before memory placeholder increments)
  private lastInstruction: string = Strings.LAST_INSTRUCTION_DEFAULT_TEXT;
  private exception: string | undefined;
  private stopped = false;
  private initialMemory: Record<number, number> = {};
  private errors: string[] = [];
  private line: number = 0;

  // Virtual address mapping for ORG support
  private statementVirtualAddr: number[] = [];
  private directiveBytes: Map<number, number> = new Map();
  private instrVirtualAddr: number[] = []; // virtual address for each instruction index (-1 for directives)
  private virtualToRawPC: Map<number, number> = new Map(); // virtual address → raw PC
  private orgGaps: Array<{ start: number; end: number; rawPC: number }> = [];
  private orgBoundaryIndices: Set<number> = new Set(); // non-first ORG instruction indices
  private lastBranchTarget: number | undefined; // last explicit address target for BRA/JMP

  constructor(program: string = '') {
    this.memory = new Memory();
    this.undo = new Undo();

    // Normalize input program
    let prog = program;
    if (prog == null) {
      prog = '';
    } else if (typeof prog !== 'string') {
      console.warn('Emulator: expected program to be a string, got', prog);
      try {
        prog = String(prog);
      } catch {
        prog = '';
      }
    }

    if (typeof prog.split !== 'function') {
      prog = String(prog);
    }

    this.instructions = prog
      .split('\n')
      .map((instr) => instr.trim())
      .map((instr, idx) => [instr, idx + 1, false] as [string, number, boolean]);

    this.clonedInstructions = [...this.instructions.map((i) => i[0])];

    // Pre-processing: comments, labels, directives
    this.removeComments();
    this.findLabels();
    this.initialMemory = this.memory.getMemory();

    if (!this.endPointer) {
      this.exception = Strings.END_MISSING;
      return;
    }

    // PC starts at 0 internally (instruction counter), but ORG affects displayed PC
    this.pc = 0;

    this.lastInstruction = this.instructions.length > 0 ? this.instructions[0][0] : '';

    // Push initial frame to undo stack
    this.undo.push(
      this.pc,
      this.ccr,
      this.registers,
      this.memory.getMemory(),
      this.errors,
      Strings.LAST_INSTRUCTION_DEFAULT_TEXT,
      this.line,
      this.undoState()
    );
  }

  /**
   * Remove comments from instructions
   */
  private removeComments(): void {
    const uncommented: Array<[string, number, boolean]> = [];

    for (let i = 0; i < this.instructions.length; i++) {
      let instr = this.instructions[i][0];
      const lineNum = this.instructions[i][1];

      // Remove comments starting with * or ;
      if (instr.trimStart().startsWith('*')) instr = '';
      let quote = '';
      for (let j = 0; j < instr.length; j++) {
        if (quote) {
          if (instr[j] === quote) quote = '';
        } else if (instr[j] === "'" || instr[j] === '"') quote = instr[j];
        else if (instr[j] === ';') {
          instr = instr.substring(0, j).trim();
          break;
        }
      }

      if (instr !== '') {
        uncommented.push([instr, lineNum, false]);
      }
    }

    this.instructions = uncommented;
  }

  /**
   * Parse a value token into a number. Supports:
   * $FF (hex), %10101010 (binary), 42 (decimal), 'A' (ASCII char)
   */
  private parseValue(token: string): number | undefined {
    token = token.trim();
    if (token.length === 0) return undefined;

    // Strip immediate prefix if present
    if (token.charAt(0) === '#') {
      token = token.substring(1);
    }

    // Hex: $FF or 0xFF
    if (token.charAt(0) === '$') {
      const val = parseInt(token.substring(1), 16);
      return isNaN(val) ? undefined : val;
    }
    if (token.toLowerCase().startsWith('0x')) {
      const val = parseInt(token.substring(2), 16);
      return isNaN(val) ? undefined : val;
    }

    // Binary: %10101010
    if (token.charAt(0) === '%') {
      const val = parseInt(token.substring(1), 2);
      return isNaN(val) ? undefined : val;
    }

    // Single ASCII char: 'A'
    if (token.length === 3 && token.charAt(0) === "'" && token.charAt(2) === "'") {
      return token.charCodeAt(1);
    }

    // Decimal
    if (/^-?\d+$/.test(token)) {
      return parseInt(token, 10);
    }

    // Label reference (resolve from dataAddresses or labels)
    if (/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(token)) {
      const lowerToken = token.toLowerCase();
      const dataKey = Object.keys(this.dataAddresses).find((k) => k.toLowerCase() === lowerToken);
      if (dataKey !== undefined) return this.dataAddresses[dataKey];
      const labelKey = Object.keys(this.labels).find((k) => k.toLowerCase() === lowerToken);
      if (labelKey !== undefined) return this.statementVirtualAddr[this.labels[labelKey]];
    }

    return undefined;
  }

  /**
   * Convert a size code to byte count (1, 2, or 4)
   */
  private sizeToBytes(size: number): number {
    switch (size) {
      case CODE_LONG:
        return 4;
      case CODE_WORD:
        return 2;
      case CODE_BYTE:
        return 1;
      default:
        return 2;
    }
  }

  /**
   * Write a value to memory at the given address with the given size code.
   */
  private writeDataToMemory(address: number, value: number, size: number): void {
    switch (size) {
      case CODE_LONG:
        this.memory.setLong(address, value);
        break;
      case CODE_WORD:
        this.memory.setWord(address, value);
        break;
      case CODE_BYTE:
        this.memory.setByte(address, value);
        break;
    }
  }

  /**
   * Extract an optional label prefix from an instruction line.
   * Returns [label | undefined, remainder after 'label:' stripped].
   */
  private extractLabel(instr: string): [string | undefined, string] {
    const colonIdx = instr.indexOf(':');
    if (colonIdx === -1) return [undefined, instr];
    const beforeColon = instr.substring(0, colonIdx).trim();
    // Validate label name
    if (/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(beforeColon)) {
      return [beforeColon, instr.substring(colonIdx + 1).trim()];
    }
    return [undefined, instr];
  }

  /**
   * Find and process labels, directives (ORG, END, DC, DS, DCB), and EQU definitions.
   * Uses two passes: first collects labels/addresses, second writes DC data to memory.
   */
  private findLabels(): void {
    // ── Pass 1: collect ORG, END, labels, and compute data addresses ──
    // Track orgOffset locally for address computation
    let localOrgOffset: number | undefined = 0;

    for (let i = 0; i < this.instructions.length; i++) {
      let instr = this.instructions[i][0];
      let instrLower = instr.toLowerCase();
      const lineNum = this.instructions[i][1];
      const [inlineLabel, inlineBody] = this.extractLabel(instrLower);
      if (
        inlineLabel &&
        inlineBody &&
        !DC_PATTERN.test(inlineBody) &&
        !DS_PATTERN.test(inlineBody) &&
        !DCB_PATTERN.test(inlineBody)
      ) {
        if (
          this.labels[inlineLabel] !== undefined ||
          this.dataAddresses[inlineLabel] !== undefined
        ) {
          this.exception = Strings.DUPLICATE_LABEL + inlineLabel;
          return;
        }
        this.labels[inlineLabel] = i;
        instr = this.extractLabel(instr)[1];
        instrLower = instr.toLowerCase();
        this.instructions[i][0] = instr;
      }

      // Check for ORG directive
      let match = ORG_REGEX.exec(instrLower);
      if (match) {
        this.orgAddress = parseInt(match[1], 16);
        localOrgOffset = this.orgAddress;
        this.instructions[i][2] = true;
        ORG_REGEX.lastIndex = 0;
        continue;
      }

      // Check for END directive
      match = END_REGEX.exec(instrLower);
      if (match) {
        if (this.endPointer !== undefined) {
          this.exception = Strings.DUPLICATE_END + Strings.AT_LINE + lineNum;
          return;
        }
        this.endPointer = [i + 1, lineNum];
        this.instructions[i][2] = true;
        // Remove all instructions after END
        this.instructions.splice(i + 1, this.instructions.length - i - 1);
        END_REGEX.lastIndex = 0;
        continue;
      }

      // Check for plain label (ends with : and nothing else)
      if (instrLower.charAt(instrLower.length - 1) === ':' && instrLower.indexOf(' ') === -1) {
        const label = instrLower.substring(0, instrLower.indexOf(':'));
        if (this.labels[label] !== undefined || this.dataAddresses[label] !== undefined) {
          this.exception = Strings.DUPLICATE_LABEL + label;
          return;
        }
        this.labels[label] = i;
        this.instructions[i][2] = true;
        continue;
      }

      // Extract optional label prefix for data directives
      const [label, remainder] = this.extractLabel(instrLower);

      // ── DC directive ──
      if (DC_PATTERN.test(remainder)) {
        const size = this.parseOpSize(remainder, true);
        const sizeBytes = this.sizeToBytes(size);
        const dataStr = remainder.replace(/^dc\.[bwl]\s+/i, '');
        const startAddr = localOrgOffset ?? 0;

        if (label) {
          if (this.labels[label] !== undefined || this.dataAddresses[label] !== undefined) {
            this.exception = Strings.DUPLICATE_LABEL + label;
            return;
          }
          this.dataAddresses[label] = startAddr;
          this.labels[label] = i;
        }

        // Calculate how much space this DC occupies
        const isString =
          dataStr.indexOf('"') !== -1 || (dataStr.indexOf("'") !== -1 && dataStr.length > 3);
        if (isString && size === CODE_BYTE) {
          // String: extract chars between quotes
          const strMatch = dataStr.match(/["']([^"']*)["']/);
          const str = strMatch ? strMatch[1] : '';
          // Check for trailing values after string, e.g. "Hello",0
          const afterQuote = dataStr.substring(
            dataStr.lastIndexOf(dataStr.indexOf('"') !== -1 ? '"' : "'") + 1
          );
          const trailingParts = afterQuote.split(',').filter((p) => p.trim().length > 0);
          const totalBytes = str.length + trailingParts.length;
          if (localOrgOffset !== undefined) localOrgOffset += totalBytes;
        } else {
          const parts = dataStr.split(',');
          if (localOrgOffset !== undefined) localOrgOffset += parts.length * sizeBytes;
        }

        this.directiveBytes.set(i, (localOrgOffset ?? startAddr) - startAddr);
        this.instructions[i][2] = true;
        continue;
      }

      // ── DS directive ──
      if (DS_PATTERN.test(remainder)) {
        const size = this.parseOpSize(remainder, true);
        const sizeBytes = this.sizeToBytes(size);
        const countStr = remainder.replace(/^ds\.[bwl]\s+/i, '').trim();
        const count = parseInt(countStr, 10);
        const startAddr = localOrgOffset ?? 0;

        if (label) {
          if (this.labels[label] !== undefined || this.dataAddresses[label] !== undefined) {
            this.exception = Strings.DUPLICATE_LABEL + label;
            return;
          }
          this.dataAddresses[label] = startAddr;
          this.labels[label] = i;
        }

        if (!isNaN(count) && count >= 0) {
          if (localOrgOffset !== undefined) localOrgOffset += count * sizeBytes;
        }

        this.directiveBytes.set(i, (localOrgOffset ?? startAddr) - startAddr);
        this.instructions[i][2] = true;
        continue;
      }

      // ── DCB directive ──
      if (DCB_PATTERN.test(remainder)) {
        const size = this.parseOpSize(remainder, true);
        const sizeBytes = this.sizeToBytes(size);
        const argsStr = remainder.replace(/^dcb\.[bwl]\s+/i, '').trim();
        const startAddr = localOrgOffset ?? 0;

        if (label) {
          if (this.labels[label] !== undefined || this.dataAddresses[label] !== undefined) {
            this.exception = Strings.DUPLICATE_LABEL + label;
            return;
          }
          this.dataAddresses[label] = startAddr;
          this.labels[label] = i;
        }

        // Parse count,value
        const commaIdx = argsStr.indexOf(',');
        if (commaIdx !== -1) {
          const count = parseInt(argsStr.substring(0, commaIdx).trim(), 10);
          if (!isNaN(count) && count >= 0) {
            if (localOrgOffset !== undefined) localOrgOffset += count * sizeBytes;
          }
        }

        this.directiveBytes.set(i, (localOrgOffset ?? startAddr) - startAddr);
        this.instructions[i][2] = true;
        continue;
      }

      if (label) {
        if (this.labels[label] !== undefined || this.dataAddresses[label] !== undefined) {
          this.exception = Strings.DUPLICATE_LABEL + label;
          return;
        }
        this.labels[label] = i;
        this.instructions[i][0] = remainder;
      }

      // Regular instruction: advance orgOffset by 4 (instruction size)
      if (localOrgOffset !== undefined && !this.instructions[i][2]) {
        localOrgOffset += 4;
      }
    }

    this.buildAddressMap();

    // ── Pass 2: write data to memory for DC, DS, DCB ──
    let memOffset: number | undefined = 0;

    for (let i = 0; i < this.instructions.length; i++) {
      const instr = this.instructions[i][0];
      const instrLower = instr.toLowerCase();
      const lineNum = this.instructions[i][1];

      // Track ORG for memory offset
      const orgMatch = /^org\s+(?:0x|\$)([0-9a-f]+)/i.exec(instrLower);
      if (orgMatch) {
        memOffset = parseInt(orgMatch[1], 16);
        continue;
      }

      // Skip non-directives but advance memOffset for regular instructions
      if (!this.instructions[i][2]) {
        if (memOffset !== undefined) memOffset += 4;
        continue;
      }

      const [, remainderLower] = this.extractLabel(instrLower);
      const [, remainderOriginal] = this.extractLabel(instr);

      // ── DC: write values to memory ──
      if (DC_PATTERN.test(remainderLower)) {
        const size = this.parseOpSize(remainderLower, true);
        const sizeBytes = this.sizeToBytes(size);
        const dataStr = remainderOriginal.replace(/^dc\.[bwl]\s+/i, '');
        const addr = memOffset ?? 0;
        let offset = 0;

        const isString =
          dataStr.indexOf('"') !== -1 || (dataStr.indexOf("'") !== -1 && dataStr.length > 3);
        if (isString && size === CODE_BYTE) {
          // Parse string content
          const quoteChar = dataStr.indexOf('"') !== -1 ? '"' : "'";
          const firstQuote = dataStr.indexOf(quoteChar);
          const lastQuote = dataStr.indexOf(quoteChar, firstQuote + 1);
          const str = dataStr.substring(firstQuote + 1, lastQuote);

          // Write each character as a byte
          for (let c = 0; c < str.length; c++) {
            this.memory.setByte(addr + offset, str.charCodeAt(c));
            offset++;
          }

          // Handle trailing values after string, e.g. "Hello",0
          const afterQuote = dataStr.substring(lastQuote + 1);
          const trailingParts = afterQuote.split(',').filter((p) => p.trim().length > 0);
          for (const part of trailingParts) {
            const val = this.parseValue(part);
            if (val !== undefined) {
              this.memory.setByte(addr + offset, val);
              offset++;
            } else {
              this.errors.push(Strings.INVALID_DC_VALUE + part.trim() + Strings.AT_LINE + lineNum);
            }
          }
        } else {
          // Numeric value list
          const parts = dataStr.split(',');
          for (const part of parts) {
            const val = this.parseValue(part);
            if (val !== undefined) {
              this.writeDataToMemory(addr + offset, val, size);
              offset += sizeBytes;
            } else {
              this.errors.push(Strings.INVALID_DC_VALUE + part.trim() + Strings.AT_LINE + lineNum);
            }
          }
        }

        if (memOffset !== undefined) memOffset += offset;
        continue;
      }

      // ── DS: reserve zero-initialized space ──
      if (DS_PATTERN.test(remainderLower)) {
        const size = this.parseOpSize(remainderLower, true);
        const sizeBytes = this.sizeToBytes(size);
        const countStr = remainderLower.replace(/^ds\.[bwl]\s+/i, '').trim();
        const count = parseInt(countStr, 10);

        if (isNaN(count) || count < 0) {
          this.errors.push(Strings.INVALID_DS_COUNT + countStr + Strings.AT_LINE + lineNum);
          continue;
        }

        // Memory already returns 0 for unset addresses, but explicitly zero-fill
        // so addresses appear in the memory map
        const addr = memOffset ?? 0;
        const totalBytes = count * sizeBytes;
        for (let b = 0; b < totalBytes; b++) {
          this.memory.setByte(addr + b, 0);
        }

        if (memOffset !== undefined) memOffset += totalBytes;
        continue;
      }

      // ── DCB: fill memory with repeated value ──
      if (DCB_PATTERN.test(remainderLower)) {
        const size = this.parseOpSize(remainderLower, true);
        const sizeBytes = this.sizeToBytes(size);
        const argsStr = remainderOriginal.replace(/^dcb\.[bwl]\s+/i, '').trim();
        const commaIdx = argsStr.indexOf(',');

        if (commaIdx === -1) {
          this.errors.push(Strings.INVALID_DCB_SYNTAX + argsStr + Strings.AT_LINE + lineNum);
          continue;
        }

        const countStr = argsStr.substring(0, commaIdx).trim();
        const valueStr = argsStr.substring(commaIdx + 1).trim();
        const count = parseInt(countStr, 10);
        const fillValue = this.parseValue(valueStr);

        if (isNaN(count) || count < 0) {
          this.errors.push(Strings.INVALID_DCB_SYNTAX + countStr + Strings.AT_LINE + lineNum);
          continue;
        }
        if (fillValue === undefined) {
          this.errors.push(Strings.INVALID_DCB_VALUE + valueStr + Strings.AT_LINE + lineNum);
          continue;
        }

        const addr = memOffset ?? 0;
        for (let n = 0; n < count; n++) {
          this.writeDataToMemory(addr + n * sizeBytes, fillValue, size);
        }

        if (memOffset !== undefined) memOffset += count * sizeBytes;
        continue;
      }
    }
  }

  /**
   * Build virtual address map from instruction array.
   * Maps each instruction index to its virtual memory address based on ORG directives.
   * Non-executable statements get -1 in instrVirtualAddr; data still occupies virtual bytes.
   */
  private buildAddressMap(): void {
    const orgRegex = /^org\s+(?:0x|\$)([0-9a-f]+)/i;
    let currentVirtAddr: number | undefined = 0;
    let isFirstOrg = true;

    for (let i = 0; i < this.instructions.length; i++) {
      const instr = this.instructions[i][0];
      const isDirective = this.instructions[i][2];

      const match = orgRegex.exec(instr);
      if (match) {
        const orgAddr = parseInt(match[1], 16);

        if (!isFirstOrg) {
          this.orgBoundaryIndices.add(i);
          // Represent sparse ORG gaps without allocating an entry for every address.
          if (currentVirtAddr !== undefined && orgAddr > currentVirtAddr) {
            this.orgGaps.push({ start: currentVirtAddr, end: orgAddr, rawPC: i * 4 });
          }
        }

        isFirstOrg = false;
        currentVirtAddr = orgAddr;
        this.statementVirtualAddr[i] = orgAddr;
        this.instrVirtualAddr[i] = -1;
        continue;
      }

      this.statementVirtualAddr[i] = currentVirtAddr ?? i * 4;
      if (isDirective) {
        if (currentVirtAddr !== undefined)
          currentVirtAddr = (currentVirtAddr + (this.directiveBytes.get(i) ?? 0)) >>> 0;
        this.instrVirtualAddr[i] = -1;
        continue;
      }

      // Real instruction
      if (currentVirtAddr !== undefined) {
        this.instrVirtualAddr[i] = currentVirtAddr;
        this.virtualToRawPC.set(currentVirtAddr, i * 4);
        currentVirtAddr = (currentVirtAddr + 4) >>> 0;
      } else {
        this.instrVirtualAddr[i] = i * 4;
        this.virtualToRawPC.set(i * 4, i * 4);
      }
    }
  }

  /**
   * Get virtual address for the instruction at the given raw PC index.
   * Returns the virtual address or the raw PC if no mapping exists.
   */
  private getVirtualAddr(instrIndex: number): number {
    if (instrIndex >= 0 && instrIndex < this.instrVirtualAddr.length) {
      const vaddr = this.instrVirtualAddr[instrIndex];
      if (vaddr >= 0) return vaddr;
    }
    return instrIndex * 4;
  }

  /**
   * Convert a virtual address to a raw PC via the address map.
   * Returns undefined if the virtual address is not mapped.
   */
  private virtualToRaw(virtualAddr: number): number | undefined {
    return (
      this.virtualToRawPC.get(virtualAddr) ??
      this.orgGaps.find(
        (gap) =>
          virtualAddr >= gap.start && virtualAddr < gap.end && (virtualAddr - gap.start) % 4 === 0
      )?.rawPC
    );
  }

  /**
   * Check if PC is valid (aligned and >= 0)
   */
  private checkPC(pc: number): boolean {
    return 0 <= pc / 4 && pc % 4 === 0;
  }

  /**
   * Parse operation size from instruction (e.g., ".b", ".w", ".l")
   */
  private parseOpSize(instr: string, errorsSuppressed: boolean): number {
    if (instr.indexOf('.') !== -1) {
      const size = instr.charAt(instr.indexOf('.') + 1);
      switch (size.toLowerCase()) {
        case 'b':
          return CODE_BYTE;
        case 'w':
          return CODE_WORD;
        case 'l':
          return CODE_LONG;
        case 's':
          return CODE_WORD;
        default:
          if (!errorsSuppressed) {
            this.errors.push(
              '.' + size + ' is an ' + Strings.INVALID_OP_SIZE + Strings.AT_LINE + this.line
            );
          }
          return CODE_WORD;
      }
    }
    // Default to WORD if no size specified
    return CODE_WORD;
  }

  /**
   * Execute a single emulation step
   * Returns true if execution should stop
   */
  emulationStep(): boolean {
    // Check for previous exceptions
    if (this.exception || this.stopped) return true;

    // Check if we've reached end of program
    if (this.pc / 4 >= this.instructions.length) {
      this.lastInstruction =
        this.instructions.length > 0 ? this.instructions[this.instructions.length - 1][0] : '';
      return true;
    }

    // Check PC validity
    if (!this.checkPC(this.pc)) {
      this.exception = Strings.INVALID_PC_EXCEPTION;
      return true;
    }

    // Push current state to undo stack
    this.undo.push(
      this.pc,
      this.ccr,
      this.registers,
      this.memory.getMemory(),
      this.errors,
      this.lastInstruction,
      this.line,
      this.undoState()
    );

    // Get current instruction
    const instrIdx = Math.floor(this.pc / 4);
    const instr = this.instructions[instrIdx][0];
    const flag = this.instructions[instrIdx][2];
    this.line = this.instructions[instrIdx][1];
    this.lastInstruction = this.clonedInstructions[this.line - 1] || instr;
    this.pc += 4;

    // Skip directives and labels
    if (flag === true) {
      // Halt at ORG boundary (non-first ORG reached by fall-through)
      if (this.orgBoundaryIndices.has(instrIdx)) {
        this.stopped = true;
        return true;
      }
      return false;
    }

    // Parse and execute instruction
    return this.executeInstruction(instr);
  }

  private undoState() {
    return {
      sr: this.getSR(),
      exception: this.exception,
      stopped: this.stopped,
      lastBranchTarget: this.lastBranchTarget,
    };
  }

  private currentVirtual(): number {
    return this.getVirtualAddr(Math.floor((this.pc - 4) / 4));
  }

  private symbolValue(name: string): number | undefined {
    if (name === '*') return this.currentVirtual();
    if (this.dataAddresses[name] !== undefined) return this.dataAddresses[name];
    const index = this.labels[name];
    if (index === undefined) return undefined;
    return this.statementVirtualAddr[index];
  }

  private parseInstructionOperand(text: string, pcBase = this.currentVirtual() + 2): Operand {
    return parseOperand(text, (name) => this.symbolValue(name), pcBase);
  }

  private effectiveAddress(op: Operand): number {
    if (op.kind === 'absolute') return op.value >>> 0;
    if ('reg' in op) {
      let address =
        op.reg === 'pc' && 'pcBase' in op ? op.pcBase! : this.registers[op.reg as number];
      if ('displacement' in op) {
        address += op.displacement;
        if (op.index !== undefined) address += alu.signed(this.registers[op.index], op.indexSize!);
      }
      return address >>> 0;
    }
    throw new InstructionError('Expected a memory address');
  }

  /** Bind a memory operand once, so read/modify/write updates An only once. */
  private resolveOperand(op: Operand, size: number): Operand {
    if (!isMemory(op)) return op;
    const increment =
      op.kind === 'predecrement' || op.kind === 'postincrement'
        ? op.reg === 7 && size === CODE_BYTE
          ? 2
          : 1 << size
        : 0;
    if (op.kind === 'predecrement') this.registers[op.reg] -= increment;
    const value = this.effectiveAddress(op);
    if (op.kind === 'postincrement') this.registers[op.reg] += increment;
    return { kind: 'absolute', value };
  }

  private readOperand(op: Operand, size: number): number {
    if (op.kind === 'immediate') return alu.unsigned(op.value, size);
    if (op.kind === 'data' || op.kind === 'address')
      return alu.unsigned(this.registers[op.reg], size);
    if (op.kind === 'ccr') return this.ccr;
    if (op.kind === 'sr') return this.getSR();
    if (op.kind === 'absolute') return this.readMemory(op.value, size);
    throw new InstructionError('Unresolved operand');
  }

  private readMemory(address: number, size: number): number {
    return size === CODE_BYTE
      ? this.memory.getByte(address)
      : size === CODE_WORD
        ? this.memory.getWord(address)
        : this.memory.getLong(address);
  }

  private writeOperand(op: Operand, value: number, size: number): void {
    if (op.kind === 'data') this.registers[op.reg] = alu.merge(value, this.registers[op.reg], size);
    else if (op.kind === 'address') this.registers[op.reg] = value;
    else if (op.kind === 'absolute') this.memory.set(op.value, value, size);
    else if (op.kind === 'ccr') this.ccr = value & 0x1f;
    else if (op.kind === 'sr') this.setSR(value);
    else throw new InstructionError('Invalid destination');
  }

  private jumpTo(address: number): void {
    address >>>= 0;
    const raw = this.virtualToRaw(address);
    this.lastBranchTarget = raw === undefined ? address : undefined;
    this.pc = raw ?? this.instructions.length * 4;
  }

  private pushLong(value: number): void {
    this.registers[7] -= 4;
    this.memory.setLong(this.registers[7], value);
  }

  private popLong(): number {
    const value = this.memory.getLong(this.registers[7]);
    this.registers[7] += 4;
    return value;
  }

  private raiseException(message: string, returnAddress: number): void {
    const sr = this.getSR();
    this.pushLong(returnAddress);
    this.registers[7] -= 2;
    this.memory.setWord(this.registers[7], sr);
    this.supervisorMode = true;
    this.traceBits = 0;
    this.exception = message;
  }

  private executeInstruction(instr: string): boolean {
    try {
      const parsed = /^([a-z]+)(?:\.([a-z]))?(?:\s+(.*))?$/i.exec(instr.trim());
      requireForm(!!parsed, `Invalid instruction: ${instr}`);
      let name = parsed[1].toLowerCase();
      name = aliases[name] ?? name;
      const suffix = parsed[2]?.toLowerCase();
      const spec = instructionSpecs[name];
      requireForm(!!spec, `Unrecognised instruction: ${name}`);
      const tokens = splitOperands(parsed[3] ?? '');
      const counts = Array.isArray(spec.count) ? spec.count : [spec.count];
      requireForm(
        counts.includes(tokens.length),
        `${name.toUpperCase()}: expected ${counts.join(' or ')} operands`
      );
      requireForm(
        !suffix || spec.sizes.includes(suffix),
        `${name.toUpperCase()}: invalid size .${suffix}`
      );
      let size = suffix
        ? { b: CODE_BYTE, s: CODE_BYTE, w: CODE_WORD, l: CODE_LONG }[suffix]!
        : spec.defaultSize;

      if (name === 'movem') {
        this.executeMovem(size, tokens);
        return false;
      }
      // Static bit numbers occupy an extension word before a PC-relative EA.
      const pcBase =
        this.currentVirtual() +
        (/^(btst|bchg|bclr|bset)$/.test(name) && tokens[0].startsWith('#') ? 4 : 2);
      const operands = tokens.map((t) => this.parseInstructionOperand(t, pcBase));
      const [src, dest] = operands;
      const isBranch =
        name === 'bra' ||
        name === 'bsr' ||
        (name.startsWith('b') && conditions.some((cc) => name === `b${cc}`));
      const isDB = name.startsWith('db');
      const isSet = conditions.some((cc) => name === `s${cc}`);
      const isShift = /^(as|ls|rox|ro)[lr]$/.test(name);
      const isBit = /^(btst|bchg|bclr|bset)$/.test(name);
      const statusMove =
        name === 'move' && operands.some((o) => o.kind === 'ccr' || o.kind === 'sr');
      const statusLogic =
        /^(andi|ori|eori)$/.test(name) && (dest.kind === 'ccr' || dest.kind === 'sr');
      if (statusMove || statusLogic) {
        const expected = statusLogic && dest.kind === 'ccr' ? CODE_BYTE : CODE_WORD;
        requireForm(!suffix || size === expected, 'Invalid size for status-register instruction');
        size = expected;
      }
      if (isBit) {
        const expected = dest.kind === 'data' ? CODE_LONG : CODE_BYTE;
        requireForm(
          !suffix || size === expected,
          'Bit operations use long registers or byte memory'
        );
        size = expected;
      }
      if (isShift && operands.length === 1) {
        requireForm(!suffix || size === CODE_WORD, 'Memory shifts require word size');
        size = CODE_WORD;
      }
      // Validate forms before resolving any auto-update address or modifying state.
      const check = (ok: boolean) =>
        requireForm(ok, `${name.toUpperCase()}: invalid operand combination`);
      const dataSource = (op: Operand) =>
        isData(op) || (op.kind === 'address' && size !== CODE_BYTE);
      if (isBranch) check(src.kind === 'absolute');
      else if (isDB) check(src.kind === 'data' && dest.kind === 'absolute');
      else if (isSet) check(isAlterable(src));
      else if (isBit)
        check(
          (src.kind === 'immediate' || src.kind === 'data') &&
            (name === 'btst' ? isData(dest) && dest.kind !== 'immediate' : isAlterable(dest))
        );
      else if (isShift)
        check(
          operands.length === 1
            ? isMemory(src) && isAlterable(src)
            : (src.kind === 'immediate' || src.kind === 'data') && dest.kind === 'data'
        );
      else if (statusMove)
        check(
          src.kind === 'ccr' || src.kind === 'sr'
            ? isAlterable(dest)
            : isData(src) && (dest.kind === 'ccr' || dest.kind === 'sr')
        );
      else if (statusLogic) check(src.kind === 'immediate');
      else
        switch (name) {
          case 'move':
            check(
              dataSource(src) &&
                (isAlterable(dest) || (dest.kind === 'address' && size !== CODE_BYTE))
            );
            break;
          case 'movea':
          case 'adda':
          case 'suba':
          case 'cmpa':
            check(dataSource(src) && dest.kind === 'address');
            break;
          case 'add':
          case 'sub':
            check(
              (dest.kind === 'data' && dataSource(src)) ||
                (src.kind === 'data' && isMemory(dest) && isAlterable(dest))
            );
            break;
          case 'and':
          case 'or':
            check(
              (dest.kind === 'data' && isData(src)) ||
                (src.kind === 'data' && isMemory(dest) && isAlterable(dest))
            );
            break;
          case 'eor':
            check(src.kind === 'data' && isAlterable(dest));
            break;
          case 'addi':
          case 'subi':
          case 'andi':
          case 'ori':
          case 'eori':
          case 'cmpi':
            check(src.kind === 'immediate' && isAlterable(dest));
            break;
          case 'addq':
          case 'subq':
            check(
              src.kind === 'immediate' &&
                (isAlterable(dest) || (dest.kind === 'address' && size !== CODE_BYTE))
            );
            break;
          case 'addx':
          case 'subx':
            check(
              (src.kind === 'data' && dest.kind === 'data') ||
                (src.kind === 'predecrement' && dest.kind === 'predecrement')
            );
            break;
          case 'cmpm':
            check(src.kind === 'postincrement' && dest.kind === 'postincrement');
            break;
          case 'cmp':
            check(dataSource(src) && dest.kind === 'data');
            break;
          case 'clr':
          case 'neg':
          case 'negx':
          case 'not':
          case 'tst':
          case 'tas':
            check(isAlterable(src));
            break;
          case 'ext':
          case 'swap':
            check(src.kind === 'data');
            break;
          case 'exg':
            check(isRegister(src) && isRegister(dest));
            break;
          case 'moveq':
            check(src.kind === 'immediate' && dest.kind === 'data');
            break;
          case 'muls':
          case 'mulu':
          case 'divs':
          case 'divu':
          case 'chk':
            check(isData(src) && dest.kind === 'data');
            break;
          case 'lea':
            check(isControl(src) && dest.kind === 'address');
            break;
          case 'pea':
          case 'jmp':
          case 'jsr':
            check(isControl(src));
            break;
          case 'link':
            check(src.kind === 'address' && dest.kind === 'immediate');
            break;
          case 'unlk':
            check(src.kind === 'address');
            break;
          case 'trap':
          case 'stop':
          case 'rtd':
            check(src.kind === 'immediate');
            break;
          case 'movep':
            check(
              (src.kind === 'data' && dest.kind === 'displacement' && dest.reg !== 'pc') ||
                (dest.kind === 'data' && src.kind === 'displacement' && src.reg !== 'pc')
            );
            break;
          case 'mode':
            check((src.kind === 'immediate' || isRegister(src)) && isRegister(dest));
            break;
        }
      for (const op of operands) {
        if (op.kind !== 'immediate') continue;
        let low = -(2 ** (alu.width(size) - 1)),
          high = alu.maskFor(size);
        if (name === 'addq' || name === 'subq' || isShift) {
          low = 1;
          high = 8;
        }
        if (isBit) {
          low = 0;
          high = 255;
        }
        if (name === 'moveq') {
          low = -128;
          high = 127;
        }
        if (name === 'trap') {
          low = 0;
          high = 15;
        }
        if (name === 'stop' || name === 'rtd' || name === 'link') {
          low = -32768;
          high = 65535;
        }
        requireForm(
          op.value >= low && op.value <= high,
          `${name.toUpperCase()}: immediate out of range (${low}..${high})`
        );
      }
      const callAddress = this.currentVirtual();
      const nextAddress = (callAddress + 4) >>> 0;
      const privileged =
        ['reset', 'rte', 'stop'].includes(name) ||
        ((statusMove || statusLogic) && dest.kind === 'sr');
      if (privileged && !this.supervisorMode) {
        this.raiseException('Privilege violation', callAddress);
        return true;
      }
      if (isBranch || isDB) {
        const target = (isDB ? dest : src) as Extract<Operand, { kind: 'absolute' | 'immediate' }>;
        if (suffix) {
          const displacement = (target.value - (callAddress + 2)) | 0;
          const limit = size === CODE_BYTE ? 128 : 32768;
          requireForm(
            displacement >= -limit &&
              displacement < limit &&
              (size !== CODE_BYTE || displacement !== 0),
            'Branch displacement out of range'
          );
        }
        if (isDB) {
          if (!condition(name.slice(2), this.ccr)) {
            const counter = src as Extract<Operand, { kind: 'data' | 'address' }>;
            const value = (this.registers[counter.reg] - 1) & 0xffff;
            this.writeOperand(counter, value, CODE_WORD);
            if (value !== 0xffff) this.jumpTo(target.value);
          }
        } else if (name === 'bra' || name === 'bsr' || condition(name.slice(1), this.ccr)) {
          if (name === 'bsr') this.pushLong(nextAddress);
          this.jumpTo(target.value);
        }
        return false;
      }
      if (isSet) {
        this.writeOperand(
          this.resolveOperand(src, CODE_BYTE),
          condition(name.slice(1), this.ccr) ? 255 : 0,
          CODE_BYTE
        );
        return false;
      }
      if (name === 'jmp' || name === 'jsr') {
        const target = this.effectiveAddress(src); // JSR (SP) uses SP before the push.
        if (name === 'jsr') this.pushLong(nextAddress);
        this.jumpTo(target);
        return false;
      }
      if (name === 'lea' || name === 'pea') {
        const address = this.effectiveAddress(src);
        if (name === 'pea') this.pushLong(address);
        else this.writeOperand(dest, address, CODE_LONG);
        return false;
      }
      if (name === 'rts' || name === 'rtr' || name === 'rte' || name === 'rtd') {
        if (name === 'rtr' || name === 'rte') {
          const status = this.memory.getWord(this.registers[7]);
          this.registers[7] += 2;
          if (name === 'rte') this.setSR(status);
          else this.ccr = status & 0x1f;
        }
        this.jumpTo(this.popLong());
        if (name === 'rtd')
          this.registers[7] += alu.signed(this.readOperand(src, CODE_WORD), CODE_WORD);
        return false;
      }
      if (name === 'link') {
        const reg = (src as Extract<Operand, { kind: 'data' | 'address' }>).reg;
        this.pushLong(this.registers[reg]);
        this.registers[reg] = this.registers[7];
        this.registers[7] += alu.signed(this.readOperand(dest, CODE_WORD), CODE_WORD);
        return false;
      }
      if (name === 'unlk') {
        const reg = (src as Extract<Operand, { kind: 'data' | 'address' }>).reg;
        this.registers[7] = this.registers[reg];
        const value = this.popLong();
        this.registers[reg] = value;
        return false;
      }
      if (name === 'trap' || (name === 'trapv' && this.getVFlag())) {
        this.raiseException(
          name === 'trap' ? `TRAP #${this.readOperand(src, CODE_WORD)}` : 'TRAPV',
          nextAddress
        );
        return true;
      }
      if (name === 'stop') {
        const status = this.readOperand(src, CODE_WORD);
        // Privilege is checked against the SR before execution, not the new S bit.
        this.setSR(status);
        this.stopped = true;
        this.lastBranchTarget = nextAddress;
        return true;
      }
      if (name === 'nop' || name === 'reset' || name === 'trapv') return false;
      if (name === 'movep') {
        this.executeMovep(size, src, dest);
        return false;
      }
      if (name === 'mode') {
        this.writeOperand(dest, this.readOperand(src, CODE_LONG), CODE_LONG);
        return false;
      }
      if (name === 'exg') {
        const value = this.readOperand(src, CODE_LONG);
        this.writeOperand(src, this.readOperand(dest, CODE_LONG), CODE_LONG);
        this.writeOperand(dest, value, CODE_LONG);
        return false;
      }
      if (isShift) {
        const count = operands.length === 1 ? 1 : this.readOperand(src, CODE_LONG) & 63;
        const target = this.resolveOperand(operands.length === 1 ? src : dest, size);
        const [value, flags] = alu.shiftOP(
          name as Parameters<typeof alu.shiftOP>[0],
          count,
          this.readOperand(target, size),
          this.ccr,
          size
        );
        this.writeOperand(target, value, size);
        this.ccr = flags;
        return false;
      }
      if (isBit) {
        const bit = this.readOperand(src, CODE_LONG) & (size === CODE_LONG ? 31 : 7);
        const target = this.resolveOperand(dest, size);
        const before = this.readOperand(target, size),
          mask = 1 << bit;
        this.ccr = (this.ccr & ~4) | (before & mask ? 0 : 4);
        if (name !== 'btst')
          this.writeOperand(
            target,
            name === 'bset' ? before | mask : name === 'bclr' ? before & ~mask : before ^ mask,
            size
          );
        return false;
      }
      if (operands.length === 1) {
        const target = this.resolveOperand(src, size),
          before = this.readOperand(target, size);
        if (name === 'tst') this.ccr = alu.tstOP(before, this.ccr, size);
        else if (name === 'tas') {
          this.ccr = alu.logicCCR(before, this.ccr, CODE_BYTE);
          this.writeOperand(target, before | 0x80, CODE_BYTE);
        } else {
          // EXT/SWAP need the entire register, even when their suffix is .W.
          const original =
            name === 'ext' || name === 'swap' ? this.readOperand(target, CODE_LONG) : before;
          const result =
            name === 'clr'
              ? alu.clrOP(size, before, this.ccr)
              : name === 'not'
                ? alu.notOP(size, before, this.ccr)
                : name === 'neg'
                  ? alu.negOP(size, before, this.ccr)
                  : name === 'negx'
                    ? alu.negxOP(size, before, this.ccr)
                    : name === 'ext'
                      ? alu.extOP(size, original, this.ccr)
                      : alu.swapOP(original, this.ccr);
          this.writeOperand(target, result[0], name === 'swap' ? CODE_LONG : size);
          this.ccr = result[1];
        }
        return false;
      }
      // Read the source before resolving the destination: their address registers can alias.
      const source = this.readOperand(this.resolveOperand(src, size), size);
      const target = this.resolveOperand(dest, size);
      if (statusMove) {
        this.writeOperand(target, source, size);
        return false;
      }
      if (statusLogic) {
        const before = this.readOperand(target, size);
        this.writeOperand(
          target,
          name === 'andi' ? before & source : name === 'ori' ? before | source : before ^ source,
          size
        );
        return false;
      }
      if (
        name === 'movea' ||
        (name === 'move' && dest.kind === 'address') ||
        name === 'adda' ||
        name === 'suba' ||
        name === 'cmpa'
      ) {
        const value = size === CODE_WORD ? alu.signed(source, CODE_WORD) : source;
        const before = this.readOperand(target, CODE_LONG);
        if (name === 'cmpa') this.ccr = alu.cmpOP(value, before, this.ccr, CODE_LONG);
        else
          this.writeOperand(
            target,
            name === 'adda' ? before + value : name === 'suba' ? before - value : value,
            CODE_LONG
          );
        return false;
      }
      if ((name === 'addq' || name === 'subq') && dest.kind === 'address') {
        this.writeOperand(
          target,
          this.readOperand(target, CODE_LONG) + (name === 'addq' ? source : -source),
          CODE_LONG
        );
        return false;
      }
      if (name === 'move' || name === 'moveq') {
        const value = name === 'moveq' ? alu.signed(source, CODE_BYTE) : source;
        const resultSize = name === 'moveq' ? CODE_LONG : size;
        this.writeOperand(target, value, resultSize);
        this.ccr = alu.logicCCR(value, this.ccr, resultSize);
        return false;
      }
      const before = this.readOperand(target, /^(mul|div)/.test(name) ? CODE_LONG : size);
      if (name === 'cmp' || name === 'cmpi' || name === 'cmpm') {
        this.ccr = alu.cmpOP(source, before, this.ccr, size);
        return false;
      }
      if (name === 'chk') {
        const checked = alu.signed(before, CODE_WORD),
          bound = alu.signed(source, CODE_WORD);
        if (checked < 0 || checked > bound) {
          this.ccr = (this.ccr & ~8) | (checked < 0 ? 8 : 0);
          this.raiseException('CHK: Value out of bounds', nextAddress);
          return true;
        }
        return false;
      }
      if ((name === 'divs' || name === 'divu') && (source & 0xffff) === 0) {
        this.raiseException('Division by zero', nextAddress);
        return true;
      }
      let result: [number, number];
      switch (name) {
        case 'add':
        case 'addi':
        case 'addq':
          result = alu.addOP(source, before, this.ccr, size, false);
          break;
        case 'sub':
        case 'subi':
        case 'subq':
          result = alu.addOP(source, before, this.ccr, size, true);
          break;
        case 'addx':
          result = alu.addxOP(source, before, this.ccr, size);
          break;
        case 'subx':
          result = alu.subxOP(source, before, this.ccr, size);
          break;
        case 'and':
        case 'andi':
          result = alu.andOP(size, source, before, this.ccr);
          break;
        case 'or':
        case 'ori':
          result = alu.orOP(size, source, before, this.ccr);
          break;
        case 'eor':
        case 'eori':
          result = alu.eorOP(size, source, before, this.ccr);
          break;
        case 'muls':
          result = alu.mulsOP(size, source, before, this.ccr);
          break;
        case 'mulu':
          result = alu.muluOP(size, source, before, this.ccr);
          break;
        case 'divs':
          result = alu.divsOP(size, source, before, this.ccr);
          break;
        case 'divu':
          result = alu.divuOP(size, source, before, this.ccr);
          break;
        default:
          throw new InstructionError(`Unimplemented instruction: ${name}`);
      }
      this.writeOperand(target, result[0], /^(mul|div)/.test(name) ? CODE_LONG : size);
      this.ccr = result[1];
      return false;
    } catch (error) {
      if (!(error instanceof InstructionError)) throw error;
      this.errors.push(`${error.message}${Strings.AT_LINE}${this.line}`);
      this.stopped = true;
      return true;
    }
  }

  private executeMovep(size: number, src: Operand, dest: Operand): void {
    const load = dest.kind === 'data';
    const address = this.effectiveAddress(load ? src : dest);
    const bytes = 1 << size;
    let value = load ? 0 : this.readOperand(src, size);
    for (let i = 0; i < bytes; i++) {
      if (load) value = (value << 8) | this.memory.getByte(address + 2 * i);
      else this.memory.setByte(address + 2 * i, value >>> ((bytes - 1 - i) * 8));
    }
    if (load) this.writeOperand(dest, value, size);
  }

  private executeMovem(size: number, tokens: string[]): void {
    const startsWithRegister = /^(?:[ad][0-7]|sp)(?:\s*[-/]|$)/i.test(tokens[0]);
    const load = !startsWithRegister;
    const list = registerList(tokens[load ? 1 : 0]);
    // MOVEM's register mask precedes its effective-address extension word.
    const memory = this.parseInstructionOperand(tokens[load ? 0 : 1], this.currentVirtual() + 4);
    requireForm(
      load
        ? isControl(memory) || memory.kind === 'postincrement'
        : (isControl(memory) && !isPC(memory)) || memory.kind === 'predecrement',
      'MOVEM: invalid addressing mode for transfer direction'
    );
    const originalRegisters = new Int32Array(this.registers);
    const decrement = memory.kind === 'predecrement';
    const order = decrement ? [...list].reverse() : list;
    const bytes = 1 << size;
    let address = this.effectiveAddress(memory);
    for (const reg of order) {
      if (decrement) address = (address - bytes) >>> 0;
      if (load) {
        const value = this.readMemory(address, size);
        this.registers[reg] = size === CODE_WORD ? alu.signed(value, CODE_WORD) : value;
      } else {
        // MC68000 stores the original An if the predecrement base is in the list.
        this.memory.set(address, originalRegisters[reg], size);
      }
      if (!decrement) address = (address + bytes) >>> 0;
    }
    if (memory.kind === 'predecrement' || memory.kind === 'postincrement')
      this.registers[memory.reg] = address;
  }

  // ============== Getters ==============

  getPC(): number {
    if (
      this.lastBranchTarget !== undefined &&
      (this.stopped || this.pc / 4 >= this.instructions.length)
    )
      return this.lastBranchTarget;
    const index = Math.floor(this.pc / 4);
    if (index < this.statementVirtualAddr.length) return this.statementVirtualAddr[index];
    const last = this.statementVirtualAddr.length - 1;
    if (last < 0) return this.orgAddress ?? 0;
    return (
      (this.statementVirtualAddr[last] +
        (this.instructions[last][2] ? (this.directiveBytes.get(last) ?? 0) : 4)) >>>
      0
    );
  }

  getRegisters(): Int32Array {
    return this.registers;
  }

  getMemory(): Record<number, number> {
    return this.memory.getMemory();
  }

  readByte(address: number): number {
    return this.memory.getByte(address);
  }

  readWord(address: number): number {
    return this.memory.getWord(address);
  }

  readLong(address: number): number {
    return this.memory.getLong(address);
  }

  getDataAddresses(): Record<string, number> {
    return { ...this.dataAddresses };
  }

  getCCR(): number {
    return this.ccr;
  }

  getSR(): number {
    // Assemble the 16-bit Status Register from its components
    // Bits 0-4: CCR (condition code flags)
    // Bits 5-7: Reserved (0)
    // Bits 8-10: Interrupt mask
    // Bits 11-12: Reserved (0)
    // Bit 13: Supervisor mode
    // Bit 15: Trace; bit 14 is reserved on the 68000
    let sr = this.ccr & 0x1f; // Lower 5 bits: CCR
    sr |= (this.interruptMask & 0x07) << 8; // Bits 8-10: Interrupt mask
    if (this.supervisorMode) {
      sr |= 0x2000; // Bit 13: Supervisor mode
    }
    sr |= (this.traceBits & 0x02) << 14; // Bit 15: Trace; bit 14 is reserved on the 68000
    return sr;
  }

  setSR(value: number): void {
    // Extract components from the 16-bit Status Register
    // Bits 0-4: CCR (condition code flags)
    // Bits 8-10: Interrupt mask
    // Bit 13: Supervisor mode
    // Bit 15: Trace; bit 14 is reserved on the 68000
    this.ccr = value & 0x1f; // Extract CCR
    this.interruptMask = (value >> 8) & 0x07; // Extract interrupt mask
    this.supervisorMode = !!(value & 0x2000); // Extract supervisor mode
    this.traceBits = (value >> 14) & 0x02; // Extract the 68000 trace bit
  }

  getZFlag(): number {
    return (this.ccr & 0x04) >>> 2;
  }

  getVFlag(): number {
    return (this.ccr & 0x02) >>> 1;
  }

  getNFlag(): number {
    return (this.ccr & 0x08) >>> 3;
  }

  getCFlag(): number {
    return (this.ccr & 0x01) >>> 0;
  }

  getXFlag(): number {
    return (this.ccr & 0x10) >>> 4;
  }

  getLastInstruction(): string {
    return this.lastInstruction;
  }

  getErrors(): string[] {
    return this.errors;
  }

  getException(): string | undefined {
    return this.exception;
  }

  /**
   * Perform undo operation
   */
  undoFromStack(): void {
    const frame = this.undo.pop();
    if (frame === undefined) return;

    this.pc = frame.pc;
    this.setSR(frame.sr);
    this.exception = frame.exception;
    this.stopped = frame.stopped;
    this.lastBranchTarget = frame.lastBranchTarget;
    this.lastInstruction = frame.lastInstruction;
    this.line = frame.line;
    this.registers = new Int32Array(frame.registers);
    this.memory.setMemory(frame.memory);
    this.errors = [...frame.errors];
  }

  /**
   * Reset emulator to initial state
   */
  reset(): void {
    this.pc = 0x0;
    this.ccr = 0x00;
    this.registers.fill(0);
    this.memory.setMemory(this.initialMemory);
    this.undo.clear();
    this.lastInstruction = Strings.LAST_INSTRUCTION_DEFAULT_TEXT;
    this.exception = this.endPointer ? undefined : Strings.END_MISSING;
    this.stopped = false;
    this.lastBranchTarget = undefined;
    this.setSR(0x2000);
    this.errors = [];
    this.line = 0;

    // Re-push initial frame
    this.undo.push(
      this.pc,
      this.ccr,
      this.registers,
      this.memory.getMemory(),
      this.errors,
      Strings.LAST_INSTRUCTION_DEFAULT_TEXT,
      this.line,
      this.undoState()
    );
  }
}
