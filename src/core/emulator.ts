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
  aslOP,
  asrOP,
  lslOP,
  lsrOP,
  rolOP,
  rorOP,
} from './operations';

// Token type constants
const TOKEN_IMMEDIATE = 0;
const TOKEN_OFFSET = 1;
const TOKEN_REG_ADDR = 2;
const TOKEN_REG_DATA = 3;
const TOKEN_OFFSET_ADDR = 4;
const TOKEN_LABEL = 5;

// Directive regexes
const DC_REGEX = /^[_a-zA-Z][_a-zA-Z0-9]*:\s+dc\.[wbl]\s+("[a-zA-Z0-9]+"|([0-9]+,)*[0-9]+)$/gmi;
const ORG_REGEX = /^org\s+(?:0x|\$)([0-9]+)/gmi;

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
  private memory: Memory;
  private undo: Undo;
  
  // Parsed instructions
  private instructions: Array<[string, number, boolean]> = []; // [instruction, line, isDirective]
  private clonedInstructions: string[] = []; // Original instructions for display
  
  // State
  private labels: Record<string, number> = {};
  private endPointer: [number, number] | undefined;
  private orgOffset: number | undefined;
  private lastInstruction: string = Strings.LAST_INSTRUCTION_DEFAULT_TEXT;
  private exception: string | undefined;
  private errors: string[] = [];
  private line: number = 0;

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

    if (!this.endPointer) {
      this.exception = Strings.END_MISSING;
      return;
    }

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
        this.orgOffset = parseInt(match[1], 16);
        this.instructions[i][2] = true; // Mark as directive
        this.memory.set(this.orgOffset++, lineNum, CODE_BYTE);
        this.memory.set(this.orgOffset++, lineNum, CODE_BYTE);
        ORG_REGEX.lastIndex = 0;
        continue;
      }

      // Check for END directive
      if (instr === 'end') {
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

    // Check for address register
    if (token.charAt(0).toLowerCase() === 'a') {
      res.value = this.parseRegisters(token) ?? 0;
      res.type = TOKEN_REG_ADDR;
      return res;
    }

    // Check for data register
    if (token.charAt(0).toLowerCase() === 'd') {
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
        case 'rts':
          this.rts();
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
      operands = operandTokens
        .map((t) => this.parseOperand(t))
        .filter((o) => o !== undefined) as Operand[];

      size = this.parseOpSize(instr, false);

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
        case 'asl':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.asl(size, operands[0], operands[1]);
          break;
        case 'asr':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.asr(size, operands[0], operands[1]);
          break;
        case 'lsl':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.lsl(size, operands[0], operands[1]);
          break;
        case 'lsr':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.lsr(size, operands[0], operands[1]);
          break;
        case 'rol':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.rol(size, operands[0], operands[1]);
          break;
        case 'ror':
          if (operands.length !== 2) {
            this.errors.push(Strings.TWO_PARAMETERS_EXPECTED + Strings.AT_LINE + this.line);
            break;
          }
          this.ror(size, operands[0], operands[1]);
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

  private adda(_size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    let src = 0;
    if (op1.type === TOKEN_REG_ADDR || op1.type === TOKEN_REG_DATA) {
      src = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      src = op1.value;
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

  private move(size: number, op1: Operand, op2: Operand): void {
    if (op1 === undefined || op2 === undefined) return;

    let srcValue = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      srcValue = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      srcValue = op1.value;
    } else if (op1.type === TOKEN_OFFSET) {
      srcValue = this.memory.getLong(op1.value);
    }

    if (op2.type === TOKEN_REG_DATA || op2.type === TOKEN_REG_ADDR) {
      const [result, newCCR] = moveOP(srcValue, this.registers[op2.value], this.ccr, size);
      this.registers[op2.value] = result;
      this.ccr = newCCR;
    }
  }

  private clr(size: number, op: Operand): void {
    if (op.type === TOKEN_REG_DATA) {
      const [result, newCCR] = clrOP(size, this.registers[op.value], this.ccr);
      this.registers[op.value] = result;
      this.ccr = newCCR;
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

  private jmp(label: string): void {
    label = label.trim().toLowerCase();
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
    const labelKey = Object.keys(this.labels).find((k) => k.toLowerCase() === label);

    if (!labelKey || this.labels[labelKey] === undefined) {
      this.errors.push(Strings.UNKNOWN_LABEL + label + Strings.AT_LINE + this.line);
      return;
    }

    // Push current PC (return address) onto stack using A7 (stack pointer)
    const stackPtr = this.registers[15]; // A7 is register 15
    this.memory.setLong(stackPtr - 4, this.pc);
    this.registers[15] = stackPtr - 4; // Decrement stack pointer

    // Jump to subroutine
    this.pc = this.labels[labelKey] * 4;
  }

  private rts(): void {
    // Return from subroutine - pop return address from stack
    const stackPtr = this.registers[15]; // A7 is register 15
    this.pc = this.memory.getLong(stackPtr);
    this.registers[15] = stackPtr + 4; // Increment stack pointer
    this.lastInstruction = 'RTS';
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

  private movea(_size: number, op1: Operand, op2: Operand): void {
    // MOVEA: Move to address register
    if (op1 === undefined || op2 === undefined) return;

    let srcValue = 0;
    if (op1.type === TOKEN_REG_DATA || op1.type === TOKEN_REG_ADDR) {
      srcValue = this.registers[op1.value];
    } else if (op1.type === TOKEN_IMMEDIATE) {
      srcValue = op1.value;
    } else if (op1.type === TOKEN_OFFSET) {
      srcValue = this.memory.getLong(op1.value);
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
      const [newOp2, newOp1] = exgOP(this.registers[op1.value], this.registers[op2.value]);
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
      address = op1.value;
    }

    // Destination must be an address register
    if (op2.type === TOKEN_REG_ADDR) {
      this.registers[op2.value] = address;
    }
  }

  private bra(label: string): void {
    // BRA: Branch Always
    label = label.trim().toLowerCase();
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
    }
  }

  // ============== Getters ==============

  getPC(): number {
    return this.pc;
  }

  getRegisters(): Int32Array {
    return this.registers;
  }

  getMemory(): Record<number, number> {
    return this.memory.getMemory();
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
}
