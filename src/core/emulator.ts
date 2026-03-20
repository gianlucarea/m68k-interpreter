/**
 * M68K Emulator - Main execution engine
 * Handles instruction parsing, execution, registers, memory, and condition codes
 */

import { Memory } from './memory';
import { Undo } from './undo';
import { Strings } from './strings';
import {
  CODE_LONG,
  CODE_WORD,
  CODE_BYTE,
  addOP,
  moveOP,
  clrOP,
  cmpOP,
  tstOP,
  swapOP,
  exgOP,
  extOP,
  andOP,
  orOP,
  eorOP,
  notOP,
  negOP,
  mulsOP,
  muluOP,
  divsOP,
  divuOP,
  aslOP,
  asrOP,
  lslOP,
  lsrOP,
  rolOP,
  rorOP,
  roxlOP,
  roxrOP,
  addxOP,
  subxOP,
  negxOP,
  cmpmOP,
} from './operations';

// Token type constants
const TOKEN_IMMEDIATE = 0;
const TOKEN_OFFSET = 1;
const TOKEN_REG_ADDR = 2;
const TOKEN_REG_DATA = 3;
const TOKEN_OFFSET_ADDR = 4;
const TOKEN_LABEL = 5;
const TOKEN_CCR = 6;
const TOKEN_SR = 7;

// Directive regexes
const DC_REGEX = /^[_a-zA-Z][_a-zA-Z0-9]*:\s+dc\.[wbl]\s+("[a-zA-Z0-9]+"|([0-9]+,)*[0-9]+)$/gmi;
const ORG_REGEX = /^org\s+(?:0x|\$)([0-9]+)/gmi;
const END_REGEX = /^end\s*([_a-zA-Z][_a-zA-Z0-9]*)?$/gmi;

interface Operand {
  value: number;
  type: number;
  offset?: number;
  label?: string;
}

export class Emulator {
  // Registers: A0-A7 (indices 0-7), D0-D7 (indices 8-15)
  private registers: Int32Array = new Int32Array(16);
  
  private pc: number = 0x0; // Program counter
  private ccr: number = 0x00; // Condition Code Register
  private interruptMask: number = 0x00; // Interrupt priority mask (bits 8-10 of SR)
  private supervisorMode: boolean = true; // Supervisor mode bit (bit 13 of SR)
  private traceBits: number = 0x00; // Trace bits (bits 14-15 of SR)
  private memory: Memory;
  private undo: Undo;
  
  // Parsed instructions
  private instructions: Array<[string, number, boolean]> = []; // [instruction, line, isDirective]
  private clonedInstructions: string[] = []; // Original instructions for display
  
  // State
  private labels: Record<string, number> = {};
  private endPointer: [number, number] | undefined;
  private orgAddress: number | undefined; // The actual ORG address (before memory placeholder increments)
  private orgOffset: number | undefined;
  private lastInstruction: string = Strings.LAST_INSTRUCTION_DEFAULT_TEXT;
  private exception: string | undefined;
  private errors: string[] = [];
  private line: number = 0;

  // Virtual address mapping for ORG support
  private instrVirtualAddr: number[] = [];     // virtual address for each instruction index (-1 for directives)
  private virtualToRawPC: Map<number, number> = new Map(); // virtual address → raw PC
  private orgBoundaryIndices: Set<number> = new Set();      // non-first ORG instruction indices

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
    this.buildAddressMap();

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
      this.line
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
      if (instr.indexOf('*') !== -1) {
        instr = instr.substring(0, instr.indexOf('*')).trim();
      }
      if (instr.indexOf(';') !== -1) {
        instr = instr.substring(0, instr.indexOf(';')).trim();
      }

      if (instr !== '') {
        uncommented.push([instr, lineNum, false]);
      }
    }

    this.instructions = uncommented;
  }

  /**
   * Find and process labels, directives (ORG, END, DC), and EQU definitions
   */
  private findLabels(): void {
    for (let i = 0; i < this.instructions.length; i++) {
      const instr = this.instructions[i][0].toLowerCase();
      const lineNum = this.instructions[i][1];

      // Check for ORG directive
      let match = ORG_REGEX.exec(instr);
      if (match) {
        this.orgAddress = parseInt(match[1], 16); // Save the actual ORG address
        this.orgOffset = this.orgAddress;
        this.instructions[i][2] = true; // Mark as directive
        this.memory.set(this.orgOffset++, lineNum, CODE_BYTE);
        this.memory.set(this.orgOffset++, lineNum, CODE_BYTE);
        ORG_REGEX.lastIndex = 0;
        continue;
      }

      // Check for END directive
      match = END_REGEX.exec(instr);
      if (match) {
        if (this.endPointer !== undefined) {
          this.exception = Strings.DUPLICATE_END + Strings.AT_LINE + lineNum;
          return;
        }

        this.endPointer = [i + 1, lineNum];
        this.instructions[i][2] = true;
        this.memory.set(this.orgOffset ?? 0, lineNum, CODE_BYTE);
        this.memory.set((this.orgOffset ?? 0) + 1, lineNum, CODE_BYTE);

        // Remove all instructions after END
        this.instructions.splice(i + 1, this.instructions.length - i - 1);
        END_REGEX.lastIndex = 0;
        continue;
      }

      // Check for labels (ends with :)
      if (instr.charAt(instr.length - 1) === ':') {
        const label = instr.substring(0, instr.indexOf(':'));
        if (this.labels[label] !== undefined) {
          this.exception = Strings.DUPLICATE_LABEL + label;
          return;
        }
        this.labels[label] = i;
        this.instructions[i][2] = true;
        continue;
      }

      // Check for DC.X directive
      match = DC_REGEX.exec(instr);
      if (match != null) {
        const label = instr.substring(0, instr.indexOf(':'));
        if (this.labels[label] !== undefined) {
          this.exception = Strings.DUPLICATE_LABEL + label;
          return;
        }

        const tmp = instr.substring(instr.indexOf(':') + 1, instr.length - 1).trim();
        const size = this.parseOpSize(tmp, false);
        const isString = tmp.indexOf('"') !== -1;

        if (!isString) {
          const parts = tmp.split(' ');
          const dataParts = parts[1].split(',');
          const list: number[] = dataParts.map((p) => parseInt(p));

          this.labels[label] = i;
          this.instructions[i] = [label + ':', lineNum, true];

          // Splice elements pushing following lines forward
          for (let t = 0, j = i + 1; t < list.length; j++, t++) {
            this.instructions.splice(j, 0, [String(list[t]), lineNum, true]);
          }

          const offset = 2 + (list.length * this.typeToSize(size)) / 8;
          for (let t = 0; t < offset; t++) {
            this.memory.set((this.orgOffset ?? 0) + t, lineNum, CODE_BYTE);
          }
        }
        DC_REGEX.lastIndex = 0;
      }
    }
  }

  /**
   * Convert size code to byte count
   */
  private typeToSize(size: number): number {
    switch (size) {
      case CODE_LONG:
        return 32;
      case CODE_WORD:
        return 16;
      case CODE_BYTE:
        return 8;
      default:
        return 16;
    }
  }

  /**
   * Build virtual address map from instruction array.
   * Maps each instruction index to its virtual memory address based on ORG directives.
   * Directives (ORG, labels, END) get -1 since they don't occupy virtual address space.
   */
  private buildAddressMap(): void {
    const orgRegex = /^org\s+(?:0x|\$)([0-9a-f]+)/i;
    let currentVirtAddr: number | undefined;
    let isFirstOrg = true;

    for (let i = 0; i < this.instructions.length; i++) {
      const instr = this.instructions[i][0];
      const isDirective = this.instructions[i][2];

      const match = orgRegex.exec(instr);
      if (match) {
        const orgAddr = parseInt(match[1], 16);

        if (!isFirstOrg) {
          this.orgBoundaryIndices.add(i);
          // Fill gap from previous segment's end to this ORG's base
          if (currentVirtAddr !== undefined && orgAddr > currentVirtAddr) {
            for (let addr = currentVirtAddr; addr < orgAddr; addr += 4) {
              if (!this.virtualToRawPC.has(addr)) {
                this.virtualToRawPC.set(addr, i * 4);
              }
            }
          }
        }

        isFirstOrg = false;
        currentVirtAddr = orgAddr;
        this.instrVirtualAddr[i] = -1;
        continue;
      }

      if (isDirective) {
        this.instrVirtualAddr[i] = -1;
        continue;
      }

      // Real instruction
      if (currentVirtAddr !== undefined) {
        this.instrVirtualAddr[i] = currentVirtAddr;
        this.virtualToRawPC.set(currentVirtAddr, i * 4);
        currentVirtAddr += 4;
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
    return this.virtualToRawPC.get(virtualAddr);
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
            this.errors.push('.' + size + ' is an ' + Strings.INVALID_OP_SIZE + Strings.AT_LINE + this.line);
          }
          return CODE_WORD;
      }
    }
    // Default to WORD if no size specified
    return CODE_WORD;
  }

  /**
   * Parse register name to index
   */
  private parseRegisters(register: string): number | undefined {
    switch (register.toLowerCase()) {
      case 'a0':
        return 0;
      case 'a1':
        return 1;
      case 'a2':
        return 2;
      case 'a3':
        return 3;
      case 'a4':
        return 4;
      case 'a5':
        return 5;
      case 'a6':
        return 6;
      case 'a7':
      case 'sp':
        return 7;
      case 'd0':
        return 8;
      case 'd1':
        return 9;
      case 'd2':
        return 10;
      case 'd3':
        return 11;
      case 'd4':
        return 12;
      case 'd5':
        return 13;
      case 'd6':
        return 14;
      case 'd7':
        return 15;
      default:
        this.errors.push(register + ' is an ' + Strings.INVALID_REGISTER + Strings.AT_LINE + this.line);
        return undefined;
    }
  }

  /**
   * Parse an operand token into type and value
   */
  private parseOperand(token: string): Operand | undefined {
    const res: Operand = {
      value: 0,
      type: 0,
      offset: undefined,
    };

    token = token.trim();

    // Handle address register with offset: (a0), $10(a0), etc.
    if (token.indexOf('(') !== -1 && token.indexOf(')') !== -1) {
      if (token.indexOf('-') !== -1) {
        const result = this.parseOperand(
          token.substring(token.indexOf('(') + 1, token.indexOf(')'))
        );
        if (result === undefined || result.type === TOKEN_REG_DATA) {
          this.errors.push(Strings.NOT_AN_ADDRESS_REGISTER + Strings.AT_LINE + this.line);
          return undefined;
        }
        res.value = result.value;
        res.type = TOKEN_OFFSET_ADDR;
        res.offset = -0x1;
        return res;
      }

      if (token.indexOf('+') !== -1) {
        const result = this.parseOperand(
          token.substring(token.indexOf('(') + 1, token.indexOf(')'))
        );
        if (result === undefined || result.type === TOKEN_REG_DATA) {
          this.errors.push(Strings.NOT_AN_ADDRESS_REGISTER + Strings.AT_LINE + this.line);
          return undefined;
        }
        res.value = result.value;
        res.type = TOKEN_OFFSET_ADDR;
        res.offset = 0x1;
        return res;
      }

      if (token.charAt(0) === '(') {
        const result = this.parseOperand(
          token.substring(token.indexOf('(') + 1, token.indexOf(')'))
        );
        if (result === undefined || result.type === TOKEN_REG_DATA) {
          this.errors.push(Strings.NOT_AN_ADDRESS_REGISTER + Strings.AT_LINE + this.line);
          return undefined;
        }
        // If inner content is an absolute address, preserve as TOKEN_OFFSET
        if (result.type === TOKEN_OFFSET) {
          return result;
        }
        res.value = result.value;
        res.type = TOKEN_OFFSET_ADDR;
        res.offset = 0x0;
        return res;
      }

      // Extract offset and address register
      res.offset = parseInt('0x' + token.substring(token.indexOf('$') + 1, token.indexOf('(')), 16);
      const result = this.parseOperand(
        token.substring(token.indexOf('(') + 1, token.indexOf(')'))
      );
      if (result === undefined || result.type === TOKEN_REG_DATA) {
        this.errors.push(Strings.NOT_AN_ADDRESS_REGISTER + Strings.AT_LINE + this.line);
        return undefined;
      }
      res.value = result.value;
      res.type = TOKEN_OFFSET_ADDR;
      return res;
    }

    // Check for address register (a0-a7 or sp)
    if (/^(a[0-7]|sp)$/i.test(token)) {
      res.value = this.parseRegisters(token) ?? 0;
      res.type = TOKEN_REG_ADDR;
      return res;
    }

    // Check for data register (d0-d7)
    if (/^d[0-7]$/i.test(token)) {
      res.value = this.parseRegisters(token) ?? 0;
      res.type = TOKEN_REG_DATA;
      return res;
    }

    // Check for immediate value
    if (token.charAt(0) === '#') {
      if (token.charAt(1) === '$') {
        res.value = parseInt('0x' + token.substring(2), 16);
        res.type = TOKEN_IMMEDIATE;
        return res;
      } else if (token.charAt(1) === '%') {
        res.value = parseInt(token.substring(2), 2);
        res.type = TOKEN_IMMEDIATE;
        return res;
      } else {
        res.value = parseInt(token.substring(1));
        res.type = TOKEN_IMMEDIATE;
        return res;
      }
    }

    // Check for offset/address
    if (token.charAt(0) === '$') {
      res.value = parseInt('0x' + token.substring(1), 16);
      res.type = TOKEN_OFFSET;
      return res;
    } else if (token.charAt(0) === '%') {
      res.value = parseInt(token.substring(1), 2);
      res.type = TOKEN_OFFSET;
      return res;
    } else if (!isNaN(parseInt(token))) {
      res.value = parseInt(token);
      res.type = TOKEN_OFFSET;
      return res;
    }

    // Check for CCR or SR register
    if (token.toLowerCase() === 'ccr') {
      res.value = 0; // CCR register
      res.type = TOKEN_CCR;
      return res;
    }
    if (token.toLowerCase() === 'sr') {
      res.value = 0; // SR register
      res.type = TOKEN_SR;
      return res;
    }

    // Check for label
    if (/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(token)) {
      res.value = 0; // Will be resolved later based on label position
      res.type = TOKEN_LABEL;
      res.label = token; // Store the label name
      return res;
    }

    this.errors.push(token + ' is an ' + Strings.UNKNOWN_OPERAND + Strings.AT_LINE + this.line);
    return undefined;
  }

  /**
   * Execute a single emulation step
   * Returns true if execution should stop
   */
  emulationStep(): boolean {
    // Check for previous exceptions
    if (this.exception) return true;

    // Check if we've reached end of program
    if (this.pc / 4 >= this.instructions.length) {
      console.log('Program ended');
      this.lastInstruction =
        this.instructions.length > 0
          ? this.instructions[this.instructions.length - 1][0]
          : '';
      return true;
    }

    // Check PC validity
    if (!this.checkPC(this.pc)) {
      this.exception = Strings.INVALID_PC_EXCEPTION;
      return true;
    }

    // Push current state to undo stack
    if (this.pc !== 0)
      this.undo.push(
        this.pc,
        this.ccr,
        this.registers,
        this.memory.getMemory(),
        this.errors,
        this.lastInstruction,
        this.line
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
        return true;
      }
      console.log('Skipping label or directive at line ' + this.line);
      return false;
    }

    // Parse and execute instruction
    return this.executeInstruction(instr);
  }

  /**
   * Execute a single instruction
   */
  private executeInstruction(instr: string): boolean {
    if (instr.indexOf(' ') === -1 && instr.length > 0) {
      // Single-operand or no-operand instruction
      switch (instr.toLowerCase()) {
        case 'nop':
          this.nop();
          break;
        case 'reset':
          this.reset_instr();
          break;
        case 'rte':
          this.rte();
          break;
        case 'rts':
          this.rts();
          break;
        case 'rtr':
          this.rtr();
          break;
        default:
          this.errors.push(instr + ' is a ' + Strings.UNRECOGNISED_INSTRUCTION + Strings.AT_LINE + this.line);
          return false;
      }
    } else {
      // Multi-operand instruction
      let operation: string;
      let operands: Operand[] = [];
      let size: number = CODE_WORD;

      if (instr.indexOf('.') !== -1) {
        operation = instr.substring(0, instr.indexOf('.')).trim();
      } else {
        operation = instr.substring(0, instr.indexOf(' ')).trim();
      }

      const operandStr = instr.substring(instr.indexOf(' ') + 1);
      const operandTokens = operandStr.split(',').map((s) => s.trim());
      size = this.parseOpSize(instr, false);

      // Logical and shift/rotate operations default to LONG when no size suffix is specified
      if (instr.indexOf('.') === -1) {
        const op = operation.toLowerCase();
        if (op === 'and' || op === 'andi' || op === 'or' || op === 'ori' || op === 'eor' || op === 'eori' || op === 'not'
            || op === 'lsl' || op === 'lsr' || op === 'asl' || op === 'asr'
            || op === 'rol' || op === 'ror' || op === 'roxl' || op === 'roxr') {
          size = CODE_LONG;
        }
      }

      // MOVEM uses its own register-list parser, so skip standard operand parsing
      if (operation.toLowerCase() !== 'movem') {
        operands = operandTokens
          .map((t) => this.parseOperand(t))
          .filter((o) => o !== undefined) as Operand[];
      }

      // Execute instruction
      switch (operation.toLowerCase()) {
        case 'add':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.add(size, operands[0], operands[1], false);
          break;
        case 'adda':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.adda(size, operands[0], operands[1]);
          break;
        case 'addi':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.addi(size, operands[0], operands[1]);
          break;
        case 'addq':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.addq(size, operands[0], operands[1]);
          break;
        case 'addx':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.addx(size, operands[0], operands[1]);
          break;
        case 'sub':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.add(size, operands[0], operands[1], true);
          break;
        case 'suba':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.suba(size, operands[0], operands[1]);
          break;
        case 'subi':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.subi(size, operands[0], operands[1]);
          break;
        case 'subq':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.subq(size, operands[0], operands[1]);
          break;
        case 'subx':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.subx(size, operands[0], operands[1]);
          break;
        case 'muls':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.muls(size, operands[0], operands[1]);
          break;
        case 'mulu':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.mulu(size, operands[0], operands[1]);
          break;
        case 'divs':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.divs(size, operands[0], operands[1]);
          break;
        case 'divu':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.divu(size, operands[0], operands[1]);
          break;
        case 'move':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.move(size, operands[0], operands[1]);
          break;
        case 'clr':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.clr(size, operands[0]);
          break;
        case 'cmp':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.cmp(size, operands[0], operands[1]);
          break;
        case 'cmpa':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.cmpa(operands[0], operands[1]);
          break;
        case 'cmpi':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.cmpi(size, operands[0], operands[1]);
          break;
        case 'cmpm':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.cmpm(size, operands[0], operands[1]);
          break;
        case 'tst':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.tst(size, operands[0]);
          break;
        case 'and':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.and(size, operands[0], operands[1]);
          break;
        case 'andi':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.andi(size, operands[0], operands[1]);
          break;
        case 'or':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.or(size, operands[0], operands[1]);
          break;
        case 'ori':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.ori(size, operands[0], operands[1]);
          break;
        case 'eor':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.eor(size, operands[0], operands[1]);
          break;
        case 'eori':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.eori(size, operands[0], operands[1]);
          break;
        case 'not':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.not(size, operands[0]);
          break;
        case 'neg':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.neg(size, operands[0]);
          break;
        case 'negx':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.negx(size, operands[0]);
          break;
        case 'jmp':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.jmp(operandTokens[0]);
          break;
        case 'jsr':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.jsr(operandTokens[0]);
          break;
        case 'mode':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.mode(operands[0], operands[1]);
          break;
        case 'movea':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.movea(size, operands[0], operands[1]);
          break;
        case 'exg':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.exg(operands[0], operands[1]);
          break;
        case 'swap':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.swap(operands[0]);
          break;
        case 'ext':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.ext(size, operands[0]);
          break;
        case 'lea':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.lea(operands[0], operands[1]);
          break;
        case 'moveq':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.moveq(operands[0], operands[1]);
          break;
        case 'movem': {
          // MOVEM needs special handling: the first or second operand can be a register list
          const movemTokens = operandStr.split(',').map((s) => s.trim());
          if (movemTokens.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.movemFull(size, movemTokens[0], movemTokens[1]);
        }
          break;
        case 'movep':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.movep(size, operands[0], operands[1]);
          break;
        case 'pea':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.pea(operands[0]);
          break;
        case 'bra':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bra(operandTokens[0]);
          break;
        case 'beq':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.beq(operandTokens[0]);
          break;
        case 'bne':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bne(operandTokens[0]);
          break;
        case 'bge':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bge(operandTokens[0]);
          break;
        case 'bgt':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bgt(operandTokens[0]);
          break;
        case 'ble':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.ble(operandTokens[0]);
          break;
        case 'blt':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.blt(operandTokens[0]);
          break;
        case 'bpl':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bpl(operandTokens[0]);
          break;
        case 'bcc':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bcc(operandTokens[0]);
          break;
        case 'bvc':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bvc(operandTokens[0]);
          break;
        case 'bsr':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bsr(operandTokens[0]);
          break;
        case 'bls':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bls(operandTokens[0]);
          break;
        case 'bhi':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bhi(operandTokens[0]);
          break;
        case 'bcs':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bcs(operandTokens[0]);
          break;
        case 'bmi':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bmi(operandTokens[0]);
          break;
        case 'bvs':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bvs(operandTokens[0]);
          break;
        case 'dbcc':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbcc(operands[0], operandTokens[1]);
          break;
        case 'dbcs':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbcs(operands[0], operandTokens[1]);
          break;
        case 'dbne':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbne(operands[0], operandTokens[1]);
          break;
        case 'dbeq':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbeq(operands[0], operandTokens[1]);
          break;
        case 'dbge':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbge(operands[0], operandTokens[1]);
          break;
        case 'dbgt':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbgt(operands[0], operandTokens[1]);
          break;
        case 'dble':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dble(operands[0], operandTokens[1]);
          break;
        case 'dblt':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dblt(operands[0], operandTokens[1]);
          break;
        case 'dbpl':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbpl(operands[0], operandTokens[1]);
          break;
        case 'dbmi':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbmi(operands[0], operandTokens[1]);
          break;
        case 'dbvc':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbvc(operands[0], operandTokens[1]);
          break;
        case 'dbvs':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbvs(operands[0], operandTokens[1]);
          break;
        case 'dbhi':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbhi(operands[0], operandTokens[1]);
          break;
        case 'dbls':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbls(operands[0], operandTokens[1]);
          break;
        case 'dbf':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbf(operands[0], operandTokens[1]);
          break;
        case 'dbt':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.dbt(operands[0], operandTokens[1]);
          break;
        case 'scc':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.scc(operands[0]);
          break;
        case 'scs':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.scs(operands[0]);
          break;
        case 'sne':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.sne(operands[0]);
          break;
        case 'seq':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.seq(operands[0]);
          break;
        case 'sge':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.sge(operands[0]);
          break;
        case 'sgt':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.sgt(operands[0]);
          break;
        case 'sle':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.sle(operands[0]);
          break;
        case 'slt':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.slt(operands[0]);
          break;
        case 'spl':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.spl(operands[0]);
          break;
        case 'smi':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.smi(operands[0]);
          break;
        case 'svc':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.svc(operands[0]);
          break;
        case 'svs':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.svs(operands[0]);
          break;
        case 'sls':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.sls(operands[0]);
          break;
        case 'shi':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.shi(operands[0]);
          break;
        case 'sf':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.sf(operands[0]);
          break;
        case 'st':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.st(operands[0]);
          break;
        case 'stop':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.stop(operands[0]);
          break;
        case 'asl':
          if (operands.length === 1) {
            this.asl(size, { type: TOKEN_IMMEDIATE, value: 1 }, operands[0]);
          } else if (operands.length === 2) {
            this.asl(size, operands[0], operands[1]);
          } else {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
          }
          break;
        case 'asr':
          if (operands.length === 1) {
            this.asr(size, { type: TOKEN_IMMEDIATE, value: 1 }, operands[0]);
          } else if (operands.length === 2) {
            this.asr(size, operands[0], operands[1]);
          } else {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
          }
          break;
        case 'lsl':
          if (operands.length === 1) {
            this.lsl(size, { type: TOKEN_IMMEDIATE, value: 1 }, operands[0]);
          } else if (operands.length === 2) {
            this.lsl(size, operands[0], operands[1]);
          } else {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
          }
          break;
        case 'lsr':
          if (operands.length === 1) {
            this.lsr(size, { type: TOKEN_IMMEDIATE, value: 1 }, operands[0]);
          } else if (operands.length === 2) {
            this.lsr(size, operands[0], operands[1]);
          } else {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
          }
          break;
        case 'rol':
          if (operands.length === 1) {
            this.rol(size, { type: TOKEN_IMMEDIATE, value: 1 }, operands[0]);
          } else if (operands.length === 2) {
            this.rol(size, operands[0], operands[1]);
          } else {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
          }
          break;
        case 'ror':
          if (operands.length === 1) {
            this.ror(size, { type: TOKEN_IMMEDIATE, value: 1 }, operands[0]);
          } else if (operands.length === 2) {
            this.ror(size, operands[0], operands[1]);
          } else {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
          }
          break;
        case 'bset':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bset(operands[0], operands[1]);
          break;
        case 'roxl':
          if (operands.length === 1) {
            this.roxl(size, { type: TOKEN_IMMEDIATE, value: 1 }, operands[0]);
          } else if (operands.length === 2) {
            this.roxl(size, operands[0], operands[1]);
          } else {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
          }
          break;
        case 'roxr':
          if (operands.length === 1) {
            this.roxr(size, { type: TOKEN_IMMEDIATE, value: 1 }, operands[0]);
          } else if (operands.length === 2) {
            this.roxr(size, operands[0], operands[1]);
          } else {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
          }
          break;
        case 'btst':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.btst(operands[0], operands[1]);
          break;
        case 'bclr':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bclr(operands[0], operands[1]);
          break;
        case 'bchg':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.bchg(operands[0], operands[1]);
          break;
        case 'rtd':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.rtd(operands[0]);
          break;
        case 'trap':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.trap(operands[0]);
          break;
        case 'trapv':
          if (operands.length !== 0) {
            this.errors.push(operation + ' takes no parameters' + Strings.AT_LINE + this.line);
            break;
          }
          this.trapv();
          break;
        case 'chk':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.chk(size, operands[0], operands[1]);
          break;
        case 'link':
          if (operands.length !== 2) {
            this.errors.push(operation + ' ' + Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.link(operands[0], operands[1]);
          break;
        case 'unlk':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.unlk(operands[0]);
          break;
        case 'tas':
          if (operands.length !== 1) {
            this.errors.push(operation + ' ' + Strings.ONE_PARAMETER_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.tas(operands[0]);
          break;
        default:
          this.errors.push(operation + ' is a ' + Strings.UNRECOGNISED_INSTRUCTION + Strings.AT_LINE + this.line);
          return false;
      }
    }

    return false;
  }

  // ============== Instruction Implementations ==============

  private add(size: number, op1: Operand, op2: Operand, isSub: boolean): void {
    if (op1 === undefined || op2 === undefined) return;

    if (op2.type === TOKEN_REG_DATA) {
      const src =
        op1.type === TOKEN_REG_ADDR || op1.type === TOKEN_REG_DATA
          ? this.registers[op1.value]
          : op1.value;

      const [result, newCCR] = addOP(src, this.registers[op2.value], this.ccr, size, isSub);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private adda(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_ADDR || op1.type === TOKEN_REG_DATA) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    // ADDA.W sign-extends the source word operand to 32 bits before adding
    if (size === CODE_WORD) {
      src = (src << 16) >> 16;
    }

    // ADDA always affects address register (no CCR update)
    if (op2.type === TOKEN_REG_ADDR) {
      this.registers[op2.value] += src;
    }
  }

  private addi(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    // ADDI: Add immediate value
    // op1 must be immediate, op2 is destination
    if (op1.type !== TOKEN_IMMEDIATE) {
      this.errors.push('operand expects immediate value, ' + Strings.UNKNOWN_OPERAND + Strings.AT_LINE + this.line);
      return;
    }

    if (op2.type === TOKEN_REG_DATA) {
      const [result, newCCR] = addOP(op1.value, this.registers[op2.value], this.ccr, size, false);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private addq(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    // ADDQ: Add quick (immediate 1-8)
    if (op1.type !== TOKEN_IMMEDIATE) {
      this.errors.push('operand expects immediate value, ' + Strings.UNKNOWN_OPERAND + Strings.AT_LINE + this.line);
      return;
    }

    if (op2.type === TOKEN_REG_DATA) {
      const [result, newCCR] = addOP(op1.value, this.registers[op2.value], this.ccr, size, false);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_REG_ADDR) {
      // ADDQ on address register doesn't affect CCR
      this.registers[op2.value] += op1.value;
    }
  }

  private addx(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    // ADDX: Add extended (with X bit for multi-precision)
    if (op2.type === TOKEN_REG_DATA) {
      const src =
        op1.type === TOKEN_REG_ADDR || op1.type === TOKEN_REG_DATA
          ? this.registers[op1.value]
          : op1.value;

      const [result, newCCR] = addxOP(src, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private suba(_size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_ADDR || op1.type === TOKEN_REG_DATA) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    // SUBA always affects address register (no CCR update)
    if (op2.type === TOKEN_REG_ADDR) {
      this.registers[op2.value] -= src;
    }
  }

  private subi(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    // SUBI: Subtract immediate value
    if (op1.type !== TOKEN_IMMEDIATE) {
      this.errors.push('operand expects immediate value, ' + Strings.UNKNOWN_OPERAND + Strings.AT_LINE + this.line);
      return;
    }

    if (op2.type === TOKEN_REG_DATA) {
      const [result, newCCR] = addOP(op1.value, this.registers[op2.value], this.ccr, size, true);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private subq(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    // SUBQ: Subtract quick (immediate 1-8)
    if (op1.type !== TOKEN_IMMEDIATE) {
      this.errors.push('operand expects immediate value, ' + Strings.UNKNOWN_OPERAND + Strings.AT_LINE + this.line);
      return;
    }

    if (op2.type === TOKEN_REG_DATA) {
      const [result, newCCR] = addOP(op1.value, this.registers[op2.value], this.ccr, size, true);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_REG_ADDR) {
      // SUBQ on address register doesn't affect CCR
      this.registers[op2.value] -= op1.value;
    }
  }

  private subx(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    // SUBX: Subtract extended (with X bit for multi-precision)
    if (op2.type === TOKEN_REG_DATA) {
      const src =
        op1.type === TOKEN_REG_ADDR || op1.type === TOKEN_REG_DATA
          ? this.registers[op1.value]
          : op1.value;

      const [result, newCCR] = subxOP(src, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private muls(size: number, op1: Operand, op2: Operand): void {
    // MULS: Signed multiply
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = mulsOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private mulu(size: number, op1: Operand, op2: Operand): void {
    // MULU: Unsigned multiply
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = muluOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private divs(size: number, op1: Operand, op2: Operand): void {
    // DIVS: Signed division
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = divsOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private divu(size: number, op1: Operand, op2: Operand): void {
    // DIVU: Unsigned division
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = divuOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private move(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    // Determine increment size for post-increment/pre-decrement addressing
    const incrementSize = size === CODE_LONG ? 4 : size === CODE_WORD ? 2 : 1;

    let srcValue = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      srcValue = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      srcValue = op1.value;
    } else if (op1.type === TOKEN_OFFSET) {
      srcValue = this.memory.getLong(op1.value);
    } else if (op1.type === TOKEN_CCR) {
      srcValue = this.ccr;
    } else if (op1.type === TOKEN_SR) {
      srcValue = this.getSR();
    } else if (op1.type === TOKEN_OFFSET_ADDR) {
      // Handle source indirect addressing: (An), (An)+, -(An)
      if (op1.offset === -0x1) {
        this.registers[op1.value] -= incrementSize;
      }
      const addr = this.registers[op1.value];
      if (size === CODE_LONG) {
        srcValue = this.memory.getLong(addr);
      } else if (size === CODE_WORD) {
        srcValue = this.memory.getWord(addr);
      } else {
        srcValue = this.memory.getByte(addr);
      }
      if (op1.offset === 0x1) {
        this.registers[op1.value] += incrementSize;
      }
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = moveOP(srcValue, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_CCR) {
      this.ccr = (srcValue & 0xFF) >>> 0;
    } else if (op2.type === TOKEN_SR) {
      this.setSR((srcValue & 0xFFFF) >>> 0);
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      // Handle destination indirect addressing: (An), (An)+, -(An)
      if (op2.offset === -0x1) {
        this.registers[op2.value] -= incrementSize;
      }
      const addr = this.registers[op2.value];

      if (size === CODE_LONG) {
        this.memory.setLong(addr, srcValue);
      } else if (size === CODE_WORD) {
        this.memory.setWord(addr, srcValue & 0xFFFF);
      } else {
        this.memory.setByte(addr, srcValue & 0xFF);
      }

      if (op2.offset === 0x1) {
        this.registers[op2.value] += incrementSize;
      }
    }
  }

  private clr(size: number, op: Operand): void {
    const incrementSize = size === CODE_LONG ? 4 : size === CODE_WORD ? 2 : 1;

    if (op.type === TOKEN_REG_DATA) {
      const [result, newCCR] = clrOP(size, this.registers[op.value], this.ccr);
      this.registers[op.value] = result;
      this.ccr = newCCR;
    } else if (op.type === TOKEN_OFFSET) {
      const [, newCCR] = clrOP(size, 0, this.ccr);
      if (size === CODE_LONG) this.memory.setLong(op.value, 0);
      else if (size === CODE_WORD) this.memory.setWord(op.value, 0);
      else this.memory.setByte(op.value, 0);
      this.ccr = newCCR;
    } else if (op.type === TOKEN_OFFSET_ADDR) {
      if (op.offset === -0x1) this.registers[op.value] -= incrementSize;
      const addr = this.registers[op.value];
      const [, newCCR] = clrOP(size, 0, this.ccr);
      if (size === CODE_LONG) this.memory.setLong(addr, 0);
      else if (size === CODE_WORD) this.memory.setWord(addr, 0);
      else this.memory.setByte(addr, 0);
      this.ccr = newCCR;
      if (op.offset === 0x1) this.registers[op.value] += incrementSize;
    }
  }

  private cmp(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    let dest = 0;
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      dest = this.registers[op2.value];
    }

    this.ccr = cmpOP(src, dest, this.ccr, size);
  }

  private cmpa(op1: Operand, op2: Operand): void {
    // CMPA: Compare with address register (always long size)
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    let dest = 0;
    if (op2.type === TOKEN_REG_ADDR) {
      dest = this.registers[op2.value];
    }

    // CMPA always uses long size (32-bit)
    this.ccr = cmpOP(src, dest, this.ccr, CODE_LONG);
  }

  private cmpi(size: number, op1: Operand, op2: Operand): void {
    // CMPI: Compare immediate (first operand must be immediate)
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    let dest = 0;
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      dest = this.registers[op2.value];
    }

    this.ccr = cmpOP(src, dest, this.ccr, size);
  }

  private cmpm(size: number, op1: Operand, op2: Operand): void {
    // CMPM: Compare memory with post-increment addressing
    // (A0)+, (A1)+ - compares and increments both address registers
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_ADDR) {
      src = this.memory.getLong(this.registers[op1.value]);
      this.registers[op1.value] += 4; // Post-increment
    } else if (op1.type === TOKEN_REG_DATA) {
      src = this.registers[op1.value];
    }

    let dest = 0;
    if (op2.type === TOKEN_REG_ADDR) {
      dest = this.memory.getLong(this.registers[op2.value]);
      this.registers[op2.value] += 4; // Post-increment
    } else if (op2.type === TOKEN_REG_DATA) {
      dest = this.registers[op2.value];
    }

    this.ccr = cmpmOP(src, dest, this.ccr, size);
  }

  private tst(size: number, op: Operand): void {
    // TST: Test operand (set condition codes based on value)
    if (op === undefined) return;

    let value = 0;
    if (op.type === TOKEN_REG_DATA || op.type === TOKEN_REG_ADDR) {
      value = this.registers[op.value];
    }

    this.ccr = tstOP(value, this.ccr, size);
  }

  private and(size: number, op1: Operand, op2: Operand): void {
    // AND: Bitwise AND
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = andOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private andi(size: number, op1: Operand, op2: Operand): void {
    // ANDI: AND immediate
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = andOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_CCR) {
      // ANDI to CCR: Perform AND operation on CCR (byte operation)
      this.ccr = (this.ccr & src) >>> 0;
    } else if (op2.type === TOKEN_SR) {
      // ANDI to SR: Perform AND operation on SR (word operation)
      const sr = this.getSR();
      this.setSR((sr & src) >>> 0);
    }
  }

  private or(size: number, op1: Operand, op2: Operand): void {
    // OR: Bitwise OR
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = orOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private ori(size: number, op1: Operand, op2: Operand): void {
    // ORI: OR immediate
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = orOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_CCR) {
      // ORI to CCR: Perform OR operation on CCR (byte operation)
      this.ccr = (this.ccr | src) >>> 0;
    } else if (op2.type === TOKEN_SR) {
      // ORI to SR: Perform OR operation on SR (word operation)
      const sr = this.getSR();
      this.setSR((sr | src) >>> 0);
    }
  }

  private eor(size: number, op1: Operand, op2: Operand): void {
    // EOR: Exclusive OR (XOR)
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = eorOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private eori(size: number, op1: Operand, op2: Operand): void {
    // EORI: EOR immediate
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = eorOP(size, src, this.registers[op2.value], this.ccr);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_CCR) {
      // EORI to CCR: Perform XOR operation on CCR (byte operation)
      this.ccr = (this.ccr ^ src) >>> 0;
    } else if (op2.type === TOKEN_SR) {
      // EORI to SR: Perform XOR operation on SR (word operation)
      const sr = this.getSR();
      this.setSR((sr ^ src) >>> 0);
    }
  }

  private not(size: number, op: Operand): void {
    // NOT: Bitwise complement
    if (op === undefined) return;

    if (op.type === TOKEN_REG_DATA || op.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = notOP(size, this.registers[op.value], this.ccr);
      this.registers[op.value] = result;
      this.ccr = newCCR;
    }
  }

  private neg(size: number, op: Operand): void {
    // NEG: Arithmetic negate (twos complement)
    if (op === undefined) return;

    if (op.type === TOKEN_REG_DATA || op.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = negOP(size, this.registers[op.value], this.ccr);
      this.registers[op.value] = result;
      this.ccr = newCCR;
    }
  }

  private negx(size: number, op: Operand): void {
    // NEGX: Arithmetic negate with extend (twos complement with X bit)
    if (op === undefined) return;

    if (op.type === TOKEN_REG_DATA || op.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = negxOP(size, this.registers[op.value], this.ccr);
      this.registers[op.value] = result;
      this.ccr = newCCR;
    }
  }

  private jmp(label: string): void {
    label = label.trim().toLowerCase();

    // Check for address register indirect: (An) or (SP)
    const arMatch = /^\(([as][p0-7])\)$/i.exec(label);
    if (arMatch) {
      const regIdx = this.parseRegisters(arMatch[1]);
      if (regIdx !== undefined) {
        const targetAddr = this.registers[regIdx] >>> 0;
        const rawPC = this.virtualToRaw(targetAddr);
        if (rawPC !== undefined) {
          this.pc = rawPC;
        } else {
          this.pc = this.instructions.length * 4;
        }
        return;
      }
    }

    // Check for hex address: $XXXX or 0xXXXX
    if (label.charAt(0) === '$' || label.startsWith('0x')) {
      const addr = label.charAt(0) === '$'
        ? parseInt('0x' + label.substring(1), 16)
        : parseInt(label, 16);
      const rawPC = this.virtualToRaw(addr);
      if (rawPC !== undefined) {
        this.pc = rawPC;
      } else {
        this.pc = this.instructions.length * 4;
      }
      return;
    }

    const labelKey = Object.keys(this.labels).find((k) => k.toLowerCase() === label);

    if (!labelKey || this.labels[labelKey] === undefined) {
      this.errors.push(Strings.UNKNOWN_LABEL + label + Strings.AT_LINE + this.line);
      return;
    }

    this.pc = this.labels[labelKey] * 4;
  }

  private jsr(label: string): void {
    // JSR: Jump to Subroutine - push return address and jump
    label = label.trim().toLowerCase();

    // Get BSR/JSR's own virtual address for the return address
    const bsrIndex = Math.floor((this.pc - 4) / 4);
    const virtualAddr = this.getVirtualAddr(bsrIndex);

    // Check for address register indirect: (An) or (SP)
    const arMatch = /^\(([as][p0-7])\)$/i.exec(label);
    if (arMatch) {
      const regIdx = this.parseRegisters(arMatch[1]);
      if (regIdx !== undefined) {
        const targetAddr = this.registers[regIdx] >>> 0;
        const rawPC = this.virtualToRaw(targetAddr);

        // Push return address (BSR's own virtual address) onto stack
        const stackPtr = this.registers[7]; // A7 is register 7
        this.memory.setLong(stackPtr - 4, virtualAddr);
        this.registers[7] = stackPtr - 4;

        if (rawPC !== undefined) {
          this.pc = rawPC;
        } else {
          this.pc = this.instructions.length * 4;
        }
        return;
      }
    }

    const labelKey = Object.keys(this.labels).find((k) => k.toLowerCase() === label);

    if (!labelKey || this.labels[labelKey] === undefined) {
      this.errors.push(Strings.UNKNOWN_LABEL + label + Strings.AT_LINE + this.line);
      return;
    }

    // Push return address (JSR's own virtual address) onto stack using A7
    const stackPtr = this.registers[7]; // A7 is register 7
    this.memory.setLong(stackPtr - 4, virtualAddr);
    this.registers[7] = stackPtr - 4;

    // Jump to subroutine
    this.pc = this.labels[labelKey] * 4;
  }

  private rts(): void {
    // Return from subroutine - pop return address from stack
    const stackPtr = this.registers[7]; // A7 is register 7
    const pushedAddr = this.memory.getLong(stackPtr);

    // The pushed address is the BSR/JSR's own virtual address.
    // Add 4 to get the next instruction's virtual address, then convert to raw PC.
    const returnVirtual = (pushedAddr + 4) >>> 0;
    const rawPC = this.virtualToRaw(returnVirtual);
    if (rawPC !== undefined) {
      this.pc = rawPC;
    } else {
      // Return address not mapped - halt execution
      this.pc = this.instructions.length * 4;
    }

    this.registers[7] = stackPtr + 4; // Increment stack pointer
    this.lastInstruction = 'RTS';
  }

  private rtr(): void {
    // Return and Restore - pop status register and return address from stack
    const stackPtr = this.registers[7]; // A7 is register 7
    
    // Pop status register (word) from stack
    const statusReg = this.memory.getWord(stackPtr);
    this.ccr = statusReg & 0xFF; // Update CCR with low byte
    
    // Pop return address (long) from stack
    this.pc = this.memory.getLong(stackPtr + 2);
    
    // Increment stack pointer by 6 (2 bytes for SR + 4 bytes for PC)
    this.registers[7] = stackPtr + 6;
    this.lastInstruction = 'RTR';
  }

  private rtd(op: Operand): void {
    // Return and Discard - pop return address from stack and add immediate value to stack pointer
    if (op === undefined) return;
    
    const stackPtr = this.registers[7]; // A7 is register 7
    
    // Pop return address from stack
    this.pc = this.memory.getLong(stackPtr);
    
    // Get the immediate value to add to stack pointer
    let displacement = 0;
    if (op.type === TOKEN_IMMEDIATE) {
      displacement = op.value;
    }
    
    // Update stack pointer: pop return address (4 bytes) + displacement
    this.registers[7] = stackPtr + 4 + displacement;
    this.lastInstruction = 'RTD #' + displacement;
  }

  private mode(op1: Operand, op2: Operand): void {
    // MODE instruction: move immediate value to register
    // Usage: mode #value, register
    if (op1 === undefined || op2 === undefined) return;

    let srcValue = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      srcValue = op1.value;
    } else if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      srcValue = this.registers[op1.value];
    }

    // Destination must be a register
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      this.registers[op2.value] = srcValue;
      this.lastInstruction = `MODE #${srcValue}, ${op2.type === TOKEN_REG_DATA ? 'd' : 'a'}${op2.value % 8}`;
    }
  }

  private movea(size: number, op1: Operand, op2: Operand): void {
    // MOVEA: Move to address register
    if (op1 === undefined || op2 === undefined) return;

    let srcValue = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      srcValue = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      srcValue = op1.value;
    } else if (op1.type === TOKEN_OFFSET) {
      srcValue = this.memory.getLong(op1.value);
    } else if (op1.type === TOKEN_OFFSET_ADDR) {
      if (op1.offset === -0x1) {
        this.registers[op1.value] -= size === CODE_LONG ? 4 : size === CODE_WORD ? 2 : 1;
      }
      const addr = this.registers[op1.value];
      srcValue = size === CODE_LONG ? this.memory.getLong(addr) : this.memory.getWord(addr);
      if (op1.offset === 0x1) {
        this.registers[op1.value] += size === CODE_LONG ? 4 : size === CODE_WORD ? 2 : 1;
      }
    }

    // Sign-extend word to longword for MOVEA.W
    if (size === CODE_WORD) {
      srcValue = (srcValue << 16) >> 16;
    }

    // Destination must be an address register
    if (op2.type === TOKEN_REG_ADDR) {
      this.registers[op2.value] = srcValue;
    }
  }

  private exg(op1: Operand, op2: Operand): void {
    // EXG: Exchange registers
    if (op1 === undefined || op2 === undefined) return;

    if ((op1.type === TOKEN_REG_DATA && op2.type === TOKEN_REG_DATA) ||
        (op1.type === TOKEN_REG_ADDR && op2.type === TOKEN_REG_ADDR) ||
        (op1.type === TOKEN_REG_DATA && op2.type === TOKEN_REG_ADDR) ||
        (op1.type === TOKEN_REG_ADDR && op2.type === TOKEN_REG_DATA)) {
      const [newOp1, newOp2] = exgOP(this.registers[op1.value], this.registers[op2.value]);
      this.registers[op1.value] = newOp1;
      this.registers[op2.value] = newOp2;
    } else {
      this.errors.push(Strings.EXG_RESTRICTIONS + Strings.AT_LINE + this.line);
    }
  }

  private swap(op: Operand): void {
    // SWAP: Exchange word halves in a data register
    if (op === undefined) return;

    if (op.type === TOKEN_REG_DATA) {
      const [result, newCCR] = swapOP(this.registers[op.value], this.ccr);
      this.registers[op.value] = result;
      this.ccr = newCCR;
    } else {
      this.errors.push(Strings.DATA_ONLY_SWAP + Strings.AT_LINE + this.line);
    }
  }

  private ext(size: number, op: Operand): void {
    // EXT: Sign extend
    if (op === undefined) return;

    if (op.type === TOKEN_REG_DATA) {
      if (size === CODE_BYTE) {
        this.errors.push(Strings.EXT_ON_BYTE + Strings.AT_LINE + this.line);
        return;
      }
      const [result, newCCR] = extOP(size, this.registers[op.value], this.ccr);
      this.registers[op.value] = result;
      this.ccr = newCCR;
    } else {
      this.errors.push(Strings.DATA_ONLY_EXT + Strings.AT_LINE + this.line);
    }
  }

  private lea(op1: Operand, op2: Operand): void {
    // LEA: Load effective address
    if (op1 === undefined || op2 === undefined) return;

    let address = 0;
    if (op1.type === TOKEN_OFFSET) {
      address = op1.value;
    } else if (op1.type === TOKEN_OFFSET_ADDR) {
      // For address register with offset, calculate effective address
      address = this.registers[op1.value] + (op1.offset || 0);
    }

    // Destination must be an address register
    if (op2.type === TOKEN_REG_ADDR) {
      this.registers[op2.value] = address;
    }
  }

  private moveq(op1: Operand, op2: Operand): void {
    // MOVEQ: Move quick (8-bit immediate, sign-extended to 32-bit)
    if (op1 === undefined || op2 === undefined) return;

    if (op1.type !== TOKEN_IMMEDIATE) {
      this.errors.push(Strings.IMMEDIATE_VALUE_EXPECTED + Strings.AT_LINE + this.line);
      return;
    }

    // Sign-extend 8-bit immediate to 32-bit
    let value = op1.value & 0xFF;
    if (value & 0x80) {
      value = value | 0xFFFFFF00; // Sign extend
    }

    // Destination must be a data register
    if (op2.type === TOKEN_REG_DATA) {
      const [result, newCCR] = moveOP(value, this.registers[op2.value], this.ccr, CODE_LONG);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else {
      this.errors.push('MOVEQ: Destination must be a data register' + Strings.AT_LINE + this.line);
    }
  }

  /**
   * Parse a register list string like "D0-D3/A0-A2" into an array of register indices.
   * Supports individual registers (D0), ranges (D0-D3), and slash-separated groups.
   * Returns indices in the same order used by registers array: A0-A7 = 0-7, D0-D7 = 8-15.
   */
  private parseRegisterList(listStr: string): number[] {
    const regs: number[] = [];
    const groups = listStr.split('/');
    for (const group of groups) {
      const trimmed = group.trim();
      if (trimmed.indexOf('-') !== -1) {
        const [startStr, endStr] = trimmed.split('-');
        const startIdx = this.parseRegisters(startStr.trim());
        const endIdx = this.parseRegisters(endStr.trim());
        if (startIdx === undefined || endIdx === undefined) continue;
        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        for (let i = lo; i <= hi; i++) {
          if (regs.indexOf(i) === -1) regs.push(i);
        }
      } else {
        const idx = this.parseRegisters(trimmed);
        if (idx !== undefined && regs.indexOf(idx) === -1) regs.push(idx);
      }
    }
    return regs;
  }

  private movemFull(size: number, token1: string, token2: string): void {
    // Determine direction: register list -> memory  OR  memory -> register list
    const isPreDec = token2.indexOf('-(') !== -1;  // e.g. -(A7)
    const isPostInc = token1.indexOf(')+') !== -1 || (token1.indexOf('(') !== -1 && token1.indexOf('+') !== -1); // e.g. (A7)+

    const bytesPer = size === CODE_LONG ? 4 : 2;

    if (isPreDec) {
      // Registers -> memory with pre-decrement: MOVEM.L D0-D3/A0, -(A7)
      const regList = this.parseRegisterList(token1);
      const addrOp = this.parseOperand(token2);
      if (!addrOp || addrOp.type !== TOKEN_OFFSET_ADDR) {
        this.errors.push('MOVEM: destination must be address register indirect' + Strings.AT_LINE + this.line);
        return;
      }
      let sp = this.registers[addrOp.value];
      // In pre-decrement mode, registers are pushed in reverse order (A7 first, D0 last)
      const sorted = [...regList].sort((a, b) => {
        // Sort: address regs (0-7) after data regs (8-15) => higher index first
        return b - a;
      });
      for (const regIdx of sorted) {
        sp -= bytesPer;
        if (size === CODE_LONG) {
          this.memory.setLong(sp, this.registers[regIdx]);
        } else {
          this.memory.setWord(sp, this.registers[regIdx] & 0xFFFF);
        }
      }
      this.registers[addrOp.value] = sp;
    } else if (isPostInc) {
      // Memory -> registers with post-increment: MOVEM.L (A7)+, D0-D3/A0
      const regList = this.parseRegisterList(token2);
      const addrOp = this.parseOperand(token1);
      if (!addrOp || addrOp.type !== TOKEN_OFFSET_ADDR) {
        this.errors.push('MOVEM: source must be address register indirect' + Strings.AT_LINE + this.line);
        return;
      }
      let sp = this.registers[addrOp.value];
      // In post-increment mode, registers are loaded in order (D0 first, A7 last)
      const sorted = [...regList].sort((a, b) => {
        // Data regs (8-15) before address regs (0-7) for standard ordering
        // D0(8) < D1(9) ... < D7(15) < A0(0) < A1(1) ... < A7(7)
        const orderA = a >= 8 ? a - 8 : a + 8;
        const orderB = b >= 8 ? b - 8 : b + 8;
        return orderA - orderB;
      });
      for (const regIdx of sorted) {
        if (size === CODE_LONG) {
          this.registers[regIdx] = this.memory.getLong(sp);
        } else {
          // Sign-extend word to long for address registers
          let val = this.memory.getWord(sp);
          if (regIdx <= 7 && (val & 0x8000)) {
            val = val | 0xFFFF0000;
          }
          this.registers[regIdx] = val;
        }
        sp += bytesPer;
      }
      this.registers[addrOp.value] = sp;
    } else {
      // Fallback: try as simple register-to-register or register-to-address
      const op1 = this.parseOperand(token1);
      const op2 = this.parseOperand(token2);
      if (!op1 || !op2) return;

      let srcValue = 0;
      if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
        srcValue = this.registers[op1.value];
      } else if (op1.type === TOKEN_IMMEDIATE) {
        srcValue = op1.value;
      }

      if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
        const [result, newCCR] = moveOP(srcValue, this.registers[op2.value], this.ccr, CODE_LONG);
        this.registers[op2.value] = result;
        this.ccr = newCCR;
      }
    }
  }

  private movep(_size: number, op1: Operand, op2: Operand): void {
    // MOVEP: Move peripheral data
    // Transfers data between register and memory in odd-byte addressing mode
    if (op1 === undefined || op2 === undefined) return;

    // TODO: Full MOVEP implementation with proper odd-byte addressing
    // For now, basic implementation
    let value = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      value = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      value = op1.value;
    } else if (op1.type === TOKEN_OFFSET) {
      value = this.memory.getLong(op1.value);
    }

    if (op2.type === TOKEN_REG_DATA) {
      this.registers[op2.value] = value;
    }
  }

  private pea(op: Operand): void {
    // PEA: Push effective address
    if (op === undefined) return;

    let address = 0;
    if (op.type === TOKEN_OFFSET) {
      address = op.value;
    } else if (op.type === TOKEN_OFFSET_ADDR) {
      address = this.registers[op.value] + (op.offset || 0);
    }

    // Push address onto stack using A7 (register 7 - stack pointer)
    const stackPtr = this.registers[7];
    this.memory.setLong(stackPtr - 4, address);
    this.registers[7] = stackPtr - 4; // Decrement stack pointer
  }

  private bra(label: string): void {
    // BRA: Branch Always
    label = label.trim().toLowerCase();

    // Check for hex address: $XXXX or 0xXXXX
    if (label.charAt(0) === '$' || label.startsWith('0x')) {
      const addr = label.charAt(0) === '$'
        ? parseInt('0x' + label.substring(1), 16)
        : parseInt(label, 16);
      const rawPC = this.virtualToRaw(addr);
      if (rawPC !== undefined) {
        this.pc = rawPC;
      } else {
        this.pc = this.instructions.length * 4;
      }
      return;
    }

    const labelKey = Object.keys(this.labels).find((k) => k.toLowerCase() === label);

    if (!labelKey || this.labels[labelKey] === undefined) {
      this.errors.push(Strings.UNKNOWN_LABEL + label + Strings.AT_LINE + this.line);
      return;
    }

    this.pc = this.labels[labelKey] * 4;
  }

  private beq(label: string): void {
    // BEQ: Branch if Equal (Z flag set)
    if (this.getZFlag()) {
      this.bra(label);
    }
  }

  private bne(label: string): void {
    // BNE: Branch if Not Equal (Z flag clear)
    if (!this.getZFlag()) {
      this.bra(label);
    }
  }

  private bge(label: string): void {
    // BGE: Branch if Greater or Equal (N flag == V flag)
    if (this.getNFlag() === this.getVFlag()) {
      this.bra(label);
    }
  }

  private bgt(label: string): void {
    // BGT: Branch if Greater Than (N flag == V flag AND Z flag clear)
    if (this.getNFlag() === this.getVFlag() && !this.getZFlag()) {
      this.bra(label);
    }
  }

  private ble(label: string): void {
    // BLE: Branch if Less or Equal (N flag != V flag OR Z flag set)
    if (this.getNFlag() !== this.getVFlag() || this.getZFlag()) {
      this.bra(label);
    }
  }

  private blt(label: string): void {
    // BLT: Branch if Less Than (N flag != V flag)
    if (this.getNFlag() !== this.getVFlag()) {
      this.bra(label);
    }
  }

  private bpl(label: string): void {
    // BPL: Branch if Plus (N flag clear)
    if (!this.getNFlag()) {
      this.bra(label);
    }
  }

  private bcc(label: string): void {
    // BCC: Branch if Carry Clear (C flag clear)
    if (!this.getCFlag()) {
      this.bra(label);
    }
  }

  private bvc(label: string): void {
    // BVC: Branch if Overflow Clear (V flag clear)
    if (!this.getVFlag()) {
      this.bra(label);
    }
  }

  private bsr(label: string): void {
    // BSR: Branch to Subroutine - push return address and branch
    label = label.trim().toLowerCase();
    const labelKey = Object.keys(this.labels).find((k) => k.toLowerCase() === label);

    if (!labelKey || this.labels[labelKey] === undefined) {
      this.errors.push(Strings.UNKNOWN_LABEL + label + Strings.AT_LINE + this.line);
      return;
    }

    // Push BSR's own virtual address onto stack using A7 (register 7)
    const bsrIndex = Math.floor((this.pc - 4) / 4);
    const virtualAddr = this.getVirtualAddr(bsrIndex);
    const stackPtr = this.registers[7]; // A7 is register 7
    this.memory.setLong(stackPtr - 4, virtualAddr);
    this.registers[7] = stackPtr - 4;

    // Branch to subroutine
    this.pc = this.labels[labelKey] * 4;
  }

  private bls(label: string): void {
    // BLS: Branch if Lower or Same (C flag set OR Z flag set)
    if (this.getCFlag() || this.getZFlag()) {
      this.bra(label);
    }
  }

  private bhi(label: string): void {
    // BHI: Branch if Higher (C flag clear AND Z flag clear)
    if (!this.getCFlag() && !this.getZFlag()) {
      this.bra(label);
    }
  }

  private bcs(label: string): void {
    // BCS: Branch if Carry Set (C flag set)
    if (this.getCFlag()) {
      this.bra(label);
    }
  }

  private bmi(label: string): void {
    // BMI: Branch if Minus (N flag set)
    if (this.getNFlag()) {
      this.bra(label);
    }
  }

  private bvs(label: string): void {
    // BVS: Branch if Overflow Set (V flag set)
    if (this.getVFlag()) {
      this.bra(label);
    }
  }

  // DBcc - Decrement and Branch on Condition
  private dbcc(op: Operand, label: string): void {
    // DBCC: Decrement and Branch if Carry Clear
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF; // 16-bit decrement
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && !this.getCFlag()) {
      this.bra(label);
    }
  }

  private dbcs(op: Operand, label: string): void {
    // DBCS: Decrement and Branch if Carry Set
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && this.getCFlag()) {
      this.bra(label);
    }
  }

  private dbne(op: Operand, label: string): void {
    // DBNE: Decrement and Branch if Not Equal
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && !this.getZFlag()) {
      this.bra(label);
    }
  }

  private dbeq(op: Operand, label: string): void {
    // DBEQ: Decrement and Branch if Equal
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && this.getZFlag()) {
      this.bra(label);
    }
  }

  private dbge(op: Operand, label: string): void {
    // DBGE: Decrement and Branch if Greater or Equal
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && this.getNFlag() === this.getVFlag()) {
      this.bra(label);
    }
  }

  private dbgt(op: Operand, label: string): void {
    // DBGT: Decrement and Branch if Greater Than
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && this.getNFlag() === this.getVFlag() && !this.getZFlag()) {
      this.bra(label);
    }
  }

  private dble(op: Operand, label: string): void {
    // DBLE: Decrement and Branch if Less or Equal
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && (this.getNFlag() !== this.getVFlag() || this.getZFlag())) {
      this.bra(label);
    }
  }

  private dblt(op: Operand, label: string): void {
    // DBLT: Decrement and Branch if Less Than
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && this.getNFlag() !== this.getVFlag()) {
      this.bra(label);
    }
  }

  private dbpl(op: Operand, label: string): void {
    // DBPL: Decrement and Branch if Plus
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && !this.getNFlag()) {
      this.bra(label);
    }
  }

  private dbmi(op: Operand, label: string): void {
    // DBMI: Decrement and Branch if Minus
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && this.getNFlag()) {
      this.bra(label);
    }
  }

  private dbvc(op: Operand, label: string): void {
    // DBVC: Decrement and Branch if Overflow Clear
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && !this.getVFlag()) {
      this.bra(label);
    }
  }

  private dbvs(op: Operand, label: string): void {
    // DBVS: Decrement and Branch if Overflow Set
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && this.getVFlag()) {
      this.bra(label);
    }
  }

  private dbhi(op: Operand, label: string): void {
    // DBHI: Decrement and Branch if Higher
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && !this.getCFlag() && !this.getZFlag()) {
      this.bra(label);
    }
  }

  private dbls(op: Operand, label: string): void {
    // DBLS: Decrement and Branch if Lower or Same
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    if (value !== 0xFFFF && (this.getCFlag() || this.getZFlag())) {
      this.bra(label);
    }
  }

  private dbf(op: Operand, _label: string): void {
    // DBF: Decrement and Branch Never (always decrement, never branch)
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    // Never branch, just decrement
  }

  private dbt(op: Operand, label: string): void {
    // DBT: Decrement and Branch Always (always decrement and branch if Dn != -1)
    if (op === undefined || op.type !== TOKEN_REG_DATA) {
      this.errors.push('operand must be a data register ' + Strings.AT_LINE + this.line);
      return;
    }
    
    const regIndex = op.value;
    let value = this.registers[regIndex] & 0xFFFF;
    value = (value - 1) & 0xFFFF;
    this.registers[regIndex] = (this.registers[regIndex] & 0xFFFF0000) | value;
    
    // Always branch if counter != -1 (0xFFFF)
    if (value !== 0xFFFF) {
      this.bra(label);
    }
  }

  // Scc - Set according to Condition
  private scc(op: Operand): void {
    // SCC: Set if Carry Clear (set byte to 0xFF if condition true, 0x00 if false)
    if (op === undefined) return;
    
    const value = !this.getCFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private scs(op: Operand): void {
    // SCS: Set if Carry Set
    if (op === undefined) return;
    
    const value = this.getCFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private sne(op: Operand): void {
    // SNE: Set if Not Equal
    if (op === undefined) return;
    
    const value = !this.getZFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private seq(op: Operand): void {
    // SEQ: Set if Equal
    if (op === undefined) return;
    
    const value = this.getZFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private sge(op: Operand): void {
    // SGE: Set if Greater or Equal
    if (op === undefined) return;
    
    const value = this.getNFlag() === this.getVFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private sgt(op: Operand): void {
    // SGT: Set if Greater Than
    if (op === undefined) return;
    
    const value = this.getNFlag() === this.getVFlag() && !this.getZFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private sle(op: Operand): void {
    // SLE: Set if Less or Equal
    if (op === undefined) return;
    
    const value = this.getNFlag() !== this.getVFlag() || this.getZFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private slt(op: Operand): void {
    // SLT: Set if Less Than
    if (op === undefined) return;
    
    const value = this.getNFlag() !== this.getVFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private spl(op: Operand): void {
    // SPL: Set if Plus
    if (op === undefined) return;
    
    const value = !this.getNFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private smi(op: Operand): void {
    // SMI: Set if Minus
    if (op === undefined) return;
    
    const value = this.getNFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private svc(op: Operand): void {
    // SVC: Set if Overflow Clear
    if (op === undefined) return;
    
    const value = !this.getVFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private svs(op: Operand): void {
    // SVS: Set if Overflow Set
    if (op === undefined) return;
    
    const value = this.getVFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private sls(op: Operand): void {
    // SLS: Set if Lower or Same
    if (op === undefined) return;
    
    const value = this.getCFlag() || this.getZFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private shi(op: Operand): void {
    // SHI: Set if Higher
    if (op === undefined) return;
    
    const value = !this.getCFlag() && !this.getZFlag() ? 0xFF : 0x00;
    this.setByteOperand(op, value);
  }

  private sf(op: Operand): void {
    // SF: Set if False (always clear)
    if (op === undefined) return;
    
    this.setByteOperand(op, 0x00);
  }

  private st(op: Operand): void {
    // ST: Set if True (always set)
    if (op === undefined) return;
    
    this.setByteOperand(op, 0xFF);
  }

  private setByteOperand(op: Operand, value: number): void {
    // Helper function to set a byte operand
    if (op.type === TOKEN_REG_DATA) {
      // For data registers, set the low byte
      this.registers[op.value] = (this.registers[op.value] & 0xFFFFFF00) | (value & 0xFF);
    } else if (op.type === TOKEN_OFFSET_ADDR) {
      // For memory addresses with offset
      const addr = this.registers[op.value] + (op.offset || 0);
      this.memory.set(addr, this.line, CODE_BYTE);
      if (value !== 0x00) {
        this.memory.setByte(addr, value);
      }
    }
  }

  private stop(op1: Operand): void {
    // STOP: Stop processor
    // Loads immediate operand into status register and halts execution
    // For emulator purposes, we just halt by setting an exception
    if (op1 === undefined) return;

    // For now, we just accept the immediate value but don't use it
    // In a full implementation, this would update the status register
    if (op1.type === TOKEN_IMMEDIATE) {
      // Accept the immediate value and halt
      this.lastInstruction = 'STOP #' + (op1.value).toString(16);
    }
    
    // Halt execution by advancing PC past the end of the program
    this.pc = (this.instructions.length * 4);
  }

  private asl(size: number, op1: Operand, op2: Operand): void {
    // ASL: Arithmetic Shift Left
    if (op1 === undefined || op2 === undefined) return;

    let shiftCount = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      shiftCount = op1.value;
    } else if (op1.type === TOKEN_REG_DATA) {
      shiftCount = this.registers[op1.value] & 0x3F; // Only lower 6 bits used
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = aslOP(shiftCount, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      const addr = this.registers[op2.value] + (op2.offset || 0);
      const memValue = size === CODE_LONG ? this.memory.getLong(addr) : size === CODE_WORD ? this.memory.getWord(addr) : this.memory.getByte(addr);
      const [result, newCCR] = aslOP(shiftCount, memValue, this.ccr, size);
      this.memory.set(addr, result, size);
      this.ccr = newCCR;
    }
  }

  private asr(size: number, op1: Operand, op2: Operand): void {
    // ASR: Arithmetic Shift Right
    if (op1 === undefined || op2 === undefined) return;

    let shiftCount = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      shiftCount = op1.value;
    } else if (op1.type === TOKEN_REG_DATA) {
      shiftCount = this.registers[op1.value] & 0x3F;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = asrOP(shiftCount, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      const addr = this.registers[op2.value] + (op2.offset || 0);
      const memValue = size === CODE_LONG ? this.memory.getLong(addr) : size === CODE_WORD ? this.memory.getWord(addr) : this.memory.getByte(addr);
      const [result, newCCR] = asrOP(shiftCount, memValue, this.ccr, size);
      this.memory.set(addr, result, size);
      this.ccr = newCCR;
    }
  }

  private lsl(size: number, op1: Operand, op2: Operand): void {
    // LSL: Logical Shift Left
    if (op1 === undefined || op2 === undefined) return;

    let shiftCount = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      shiftCount = op1.value;
    } else if (op1.type === TOKEN_REG_DATA) {
      shiftCount = this.registers[op1.value] & 0x3F;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = lslOP(shiftCount, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      const addr = this.registers[op2.value] + (op2.offset || 0);
      const memValue = size === CODE_LONG ? this.memory.getLong(addr) : size === CODE_WORD ? this.memory.getWord(addr) : this.memory.getByte(addr);
      const [result, newCCR] = lslOP(shiftCount, memValue, this.ccr, size);
      this.memory.set(addr, result, size);
      this.ccr = newCCR;
    }
  }

  private lsr(size: number, op1: Operand, op2: Operand): void {
    // LSR: Logical Shift Right
    if (op1 === undefined || op2 === undefined) return;

    let shiftCount = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      shiftCount = op1.value;
    } else if (op1.type === TOKEN_REG_DATA) {
      shiftCount = this.registers[op1.value] & 0x3F;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = lsrOP(shiftCount, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      const addr = this.registers[op2.value] + (op2.offset || 0);
      const memValue = size === CODE_LONG ? this.memory.getLong(addr) : size === CODE_WORD ? this.memory.getWord(addr) : this.memory.getByte(addr);
      const [result, newCCR] = lsrOP(shiftCount, memValue, this.ccr, size);
      this.memory.set(addr, result, size);
      this.ccr = newCCR;
    }
  }

  private rol(size: number, op1: Operand, op2: Operand): void {
    // ROL: Rotate Left
    if (op1 === undefined || op2 === undefined) return;

    let shiftCount = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      shiftCount = op1.value;
    } else if (op1.type === TOKEN_REG_DATA) {
      shiftCount = this.registers[op1.value] & 0x3F;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = rolOP(shiftCount, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      const addr = this.registers[op2.value] + (op2.offset || 0);
      const memValue = size === CODE_LONG ? this.memory.getLong(addr) : size === CODE_WORD ? this.memory.getWord(addr) : this.memory.getByte(addr);
      const [result, newCCR] = rolOP(shiftCount, memValue, this.ccr, size);
      this.memory.set(addr, result, size);
      this.ccr = newCCR;
    }
  }

  private ror(size: number, op1: Operand, op2: Operand): void {
    // ROR: Rotate Right
    if (op1 === undefined || op2 === undefined) return;

    let shiftCount = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      shiftCount = op1.value;
    } else if (op1.type === TOKEN_REG_DATA) {
      shiftCount = this.registers[op1.value] & 0x3F;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = rorOP(shiftCount, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      const addr = this.registers[op2.value] + (op2.offset || 0);
      const memValue = size === CODE_LONG ? this.memory.getLong(addr) : size === CODE_WORD ? this.memory.getWord(addr) : this.memory.getByte(addr);
      const [result, newCCR] = rorOP(shiftCount, memValue, this.ccr, size);
      this.memory.set(addr, result, size);
      this.ccr = newCCR;
    }
  }

  private bset(op1: Operand, op2: Operand): void {
    // BSET: Bit SET - set specified bit to 1
    // op1: bit number (immediate or data register)
    // op2: destination (data register or memory)
    if (op1 === undefined || op2 === undefined) return;

    let bitNum = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      bitNum = op1.value & 0x1F; // Only lower 5 bits for bit number
    } else if (op1.type === TOKEN_REG_DATA) {
      bitNum = this.registers[op1.value] & 0x1F;
    }

    // Set the bit in the destination
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const destValue = this.registers[op2.value];
      const bitMask = 1 << bitNum;
      const oldBit = (destValue & bitMask) !== 0 ? 1 : 0;
      const newValue = (destValue | bitMask) >>> 0;
      this.registers[op2.value] = newValue;
      
      // Update Z flag: Z = 1 if old bit was 0
      if (oldBit === 0) {
        this.ccr = (this.ccr | 0x04) >>> 0; // Set Z flag
      } else {
        this.ccr = (this.ccr & 0xfb) >>> 0; // Clear Z flag
      }
    }
  }

  private roxl(size: number, op1: Operand, op2: Operand): void {
    // ROXL: Rotate Left including X flag
    if (op1 === undefined || op2 === undefined) return;

    let shiftCount = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      shiftCount = op1.value;
    } else if (op1.type === TOKEN_REG_DATA) {
      shiftCount = this.registers[op1.value] & 0x3F;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = roxlOP(shiftCount, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      const addr = this.registers[op2.value] + (op2.offset || 0);
      const memValue = size === CODE_LONG ? this.memory.getLong(addr) : size === CODE_WORD ? this.memory.getWord(addr) : this.memory.getByte(addr);
      const [result, newCCR] = roxlOP(shiftCount, memValue, this.ccr, size);
      this.memory.set(addr, result, size);
      this.ccr = newCCR;
    }
  }

  private roxr(size: number, op1: Operand, op2: Operand): void {
    // ROXR: Rotate Right including X flag
    if (op1 === undefined || op2 === undefined) return;

    let shiftCount = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      shiftCount = op1.value;
    } else if (op1.type === TOKEN_REG_DATA) {
      shiftCount = this.registers[op1.value] & 0x3F;
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = roxrOP(shiftCount, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    } else if (op2.type === TOKEN_OFFSET_ADDR) {
      const addr = this.registers[op2.value] + (op2.offset || 0);
      const memValue = size === CODE_LONG ? this.memory.getLong(addr) : size === CODE_WORD ? this.memory.getWord(addr) : this.memory.getByte(addr);
      const [result, newCCR] = roxrOP(shiftCount, memValue, this.ccr, size);
      this.memory.set(addr, result, size);
      this.ccr = newCCR;
    }
  }

  private btst(op1: Operand, op2: Operand): void {
    // BTST: Bit TEST - test and set Z flag based on bit value
    // op1: bit number (immediate or data register)
    // op2: source (data register or memory)
    if (op1 === undefined || op2 === undefined) return;

    let bitNum = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      bitNum = op1.value & 0x1F; // Only lower 5 bits for bit number
    } else if (op1.type === TOKEN_REG_DATA) {
      bitNum = this.registers[op1.value] & 0x1F;
    }

    // Test the bit in the source
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const srcValue = this.registers[op2.value];
      const bitMask = 1 << bitNum;
      const bit = (srcValue & bitMask) !== 0 ? 1 : 0;
      
      // Update Z flag: Z = 1 if bit was 0
      if (bit === 0) {
        this.ccr = (this.ccr | 0x04) >>> 0; // Set Z flag
      } else {
        this.ccr = (this.ccr & 0xfb) >>> 0; // Clear Z flag
      }
    }
  }

  private bclr(op1: Operand, op2: Operand): void {
    // BCLR: Bit CLEAR - clear specified bit to 0
    // op1: bit number (immediate or data register)
    // op2: destination (data register or memory)
    if (op1 === undefined || op2 === undefined) return;

    let bitNum = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      bitNum = op1.value & 0x1F; // Only lower 5 bits for bit number
    } else if (op1.type === TOKEN_REG_DATA) {
      bitNum = this.registers[op1.value] & 0x1F;
    }

    // Clear the bit in the destination
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const destValue = this.registers[op2.value];
      const bitMask = 1 << bitNum;
      const oldBit = (destValue & bitMask) !== 0 ? 1 : 0;
      const newValue = (destValue & ~bitMask) >>> 0;
      this.registers[op2.value] = newValue;
      
      // Update Z flag: Z = 1 if old bit was 0
      if (oldBit === 0) {
        this.ccr = (this.ccr | 0x04) >>> 0; // Set Z flag
      } else {
        this.ccr = (this.ccr & 0xfb) >>> 0; // Clear Z flag
      }
    }
  }

  private bchg(op1: Operand, op2: Operand): void {
    // BCHG: Bit CHANGE - toggle specified bit
    // op1: bit number (immediate or data register)
    // op2: destination (data register or memory)
    if (op1 === undefined || op2 === undefined) return;

    let bitNum = 0;
    if (op1.type === TOKEN_IMMEDIATE) {
      bitNum = op1.value & 0x1F; // Only lower 5 bits for bit number
    } else if (op1.type === TOKEN_REG_DATA) {
      bitNum = this.registers[op1.value] & 0x1F;
    }

    // Toggle the bit in the destination
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const destValue = this.registers[op2.value];
      const bitMask = 1 << bitNum;
      const oldBit = (destValue & bitMask) !== 0 ? 1 : 0;
      const newValue = (destValue ^ bitMask) >>> 0;
      this.registers[op2.value] = newValue;
      
      // Update Z flag: Z = 1 if old bit was 0
      if (oldBit === 0) {
        this.ccr = (this.ccr | 0x04) >>> 0; // Set Z flag
      } else {
        this.ccr = (this.ccr & 0xfb) >>> 0; // Clear Z flag
      }
    }
  }

  // ============== Getters ==============

  getPC(): number {
    // Use the virtual address map if available
    const instrIdx = Math.floor(this.pc / 4);
    if (instrIdx >= 0 && instrIdx < this.instrVirtualAddr.length) {
      const vaddr = this.instrVirtualAddr[instrIdx];
      if (vaddr >= 0) return vaddr;
    }
    // Past end or at a directive: find last real instruction's virtual address + offset
    for (let j = Math.min(instrIdx, this.instrVirtualAddr.length) - 1; j >= 0; j--) {
      if (this.instrVirtualAddr[j] >= 0) {
        return this.instrVirtualAddr[j] + (instrIdx - j) * 4;
      }
    }
    // Fallback to the old logic
    if (this.orgAddress !== undefined) {
      return this.pc + this.orgAddress;
    }
    return this.pc;
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
    // Bits 14-15: Trace bits
    let sr = this.ccr & 0x1F; // Lower 5 bits: CCR
    sr |= (this.interruptMask & 0x07) << 8; // Bits 8-10: Interrupt mask
    if (this.supervisorMode) {
      sr |= 0x2000; // Bit 13: Supervisor mode
    }
    sr |= (this.traceBits & 0x03) << 14; // Bits 14-15: Trace bits
    return sr;
  }

  setSR(value: number): void {
    // Extract components from the 16-bit Status Register
    // Bits 0-4: CCR (condition code flags)
    // Bits 8-10: Interrupt mask
    // Bit 13: Supervisor mode
    // Bits 14-15: Trace bits
    this.ccr = value & 0x1F; // Extract CCR
    this.interruptMask = (value >> 8) & 0x07; // Extract interrupt mask
    this.supervisorMode = !!(value & 0x2000); // Extract supervisor mode
    this.traceBits = (value >> 14) & 0x03; // Extract trace bits
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
    this.ccr = frame.ccr;
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
    this.memory.clear();
    this.undo.clear();
    this.lastInstruction = Strings.LAST_INSTRUCTION_DEFAULT_TEXT;
    this.exception = undefined;
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
      this.line
    );
  }

  // ============== System Control Instructions ==============

  private nop(): void {
    // NOP: No Operation
    // Simply advances to the next instruction (PC already incremented)
    this.lastInstruction = 'NOP';
  }

  private reset_instr(): void {
    // RESET: Reset external devices
    // In the context of an emulator, we'll just acknowledge the instruction
    this.lastInstruction = 'RESET';
  }

  private rte(): void {
    // Return from Exception - pop status register and return address from stack
    const stackPtr = this.registers[7]; // A7 is register 7
    
    // Pop status register (word) from stack
    const statusReg = this.memory.getWord(stackPtr);
    this.ccr = statusReg & 0xFF; // Update CCR with low byte
    
    // Pop return address (long) from stack
    this.pc = this.memory.getLong(stackPtr + 2);
    
    // Increment stack pointer by 6 (2 bytes for SR + 4 bytes for PC)
    this.registers[7] = stackPtr + 6;
    this.lastInstruction = 'RTE';
  }

  private trap(op: Operand): void {
    // TRAP: Trap to exception handler
    // op is the vector number (0-15)
    if (op === undefined) return;
    
    if (op.type === TOKEN_IMMEDIATE) {
      const vectorNum = op.value & 0x0F;
      
      // Push PC and SR to stack
      const stackPtr = this.registers[7];
      
      // Push current PC to stack
      this.memory.setLong(stackPtr - 4, this.pc);
      // Push SR (CCR for now) to stack
      this.memory.setWord(stackPtr - 6, this.ccr);
      
      // Update stack pointer
      this.registers[7] = stackPtr - 6;
      
      // Set exception flag
      this.exception = `TRAP #${vectorNum}`;
      this.lastInstruction = `TRAP #${vectorNum}`;
      
      // In a real implementation, we'd jump to the trap handler
      // For now, we'll halt execution
      this.pc = this.instructions.length * 4;
    }
  }

  private trapv(): void {
    // TRAPV: Trap on Overflow
    // If V (overflow) flag is set, generate a TRAP #7
    if ((this.ccr & 0x02) !== 0) {
      // Overflow flag is set
      const stackPtr = this.registers[7];
      
      // Push current PC to stack
      this.memory.setLong(stackPtr - 4, this.pc);
      // Push SR (CCR for now) to stack
      this.memory.setWord(stackPtr - 6, this.ccr);
      
      // Update stack pointer
      this.registers[7] = stackPtr - 6;
      
      // Set exception flag
      this.exception = 'TRAPV';
      this.lastInstruction = 'TRAPV';
      
      // Halt execution
      this.pc = this.instructions.length * 4;
    } else {
      this.lastInstruction = 'TRAPV';
    }
  }

  private chk(_size: number, op1: Operand, op2: Operand): void {
    // CHK: Check Register
    // Raises exception if op2 value is out of range [-32768, op1]
    // For 16-bit: checks if op2 is < 0 or > op1
    if (op1 === undefined || op2 === undefined) return;
    
    let checkValue = op1.value;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      checkValue = this.registers[op1.value];
    }
    
    let dataValue = 0;
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      dataValue = this.registers[op2.value];
    }
    
    // Sign-extend to handle signed comparison
    const isNegative = (dataValue & 0x8000) !== 0;
    if (isNegative) {
      dataValue = dataValue | 0xFFFF0000; // Sign extend
    }
    
    // Check bounds
    if (dataValue < 0 || dataValue > checkValue) {
      this.exception = 'CHK: Value out of bounds';
      this.lastInstruction = `CHK ${checkValue},${dataValue}`;
      
      // Halt execution
      this.pc = this.instructions.length * 4;
    } else {
      this.lastInstruction = `CHK ${checkValue},${dataValue}`;
    }
  }

  private link(op1: Operand, op2: Operand): void {
    // LINK: Link stack frame
    // LINK An, #displacement
    // 1. SP - 4 → SP; 2. An → (SP); 3. SP → An; 4. SP + d → SP
    if (op1 === undefined || op2 === undefined) return;
    
    const regNum = op1.value; // Register number
    if (op1.type !== TOKEN_REG_ADDR) {
      this.errors.push('LINK expects address register, got invalid operand');
      return;
    }
    
    let offset = op2.value;
    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      offset = this.registers[op2.value];
    }
    
    // Push current address register value to stack
    const stackPtr = this.registers[7]; // A7 is register 7
    this.memory.setLong(stackPtr - 4, this.registers[regNum]);
    
    // Update address register with current stack pointer (minus 4 for the push)
    this.registers[regNum] = stackPtr - 4;
    
    // Adjust stack pointer by offset
    this.registers[7] = stackPtr - 4 + offset;
    
    this.lastInstruction = `LINK A${regNum},#${offset}`;
  }

  private unlk(op: Operand): void {
    // UNLK: Unlink stack frame
    // UNLK An
    // Restores stack pointer from address register, then pops address register
    if (op === undefined) return;
    
    const regNum = op.value; // Register number
    if (op.type !== TOKEN_REG_ADDR) {
      this.errors.push('UNLK expects address register');
      return;
    }
    
    // Set stack pointer to address register value
    this.registers[7] = this.registers[regNum];
    
    // Pop address register from stack
    const stackPtr = this.registers[7];
    this.registers[regNum] = this.memory.getLong(stackPtr);
    
    // Increment stack pointer
    this.registers[7] = stackPtr + 4;
    
    this.lastInstruction = `UNLK A${regNum}`;
  }

  private tas(op: Operand): void {
    // TAS: Test and Set
    // Tests the byte operand, sets N and Z flags based on the result,
    // then sets the MSB (bit 7) of the operand to 1
    if (op === undefined) return;
    
    let value = 0;
    if (op.type === TOKEN_REG_DATA) {
      value = this.registers[op.value] & 0xFF;
    } else if (op.type === TOKEN_IMMEDIATE) {
      value = op.value & 0xFF;
    }
    
    // Set N flag if MSB is 1
    if ((value & 0x80) !== 0) {
      this.ccr |= 0x08; // Set N flag
    } else {
      this.ccr &= ~0x08;
    }
    
    // Set Z flag if value is 0
    if (value === 0) {
      this.ccr |= 0x04; // Set Z flag
    } else {
      this.ccr &= ~0x04;
    }
    
    // Set MSB
    value |= 0x80;
    
    // Store result back
    if (op.type === TOKEN_REG_DATA) {
      const regNum = op.value;
      const regValue = this.registers[regNum];
      this.registers[regNum] = (regValue & 0xFFFFFF00) | (value & 0xFF);
    }
    
    this.lastInstruction = `TAS ${value}`;
  }
}

