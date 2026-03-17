/**
 * String constants for M68K emulator
 * Contains all error messages and UI strings
 */

export class Strings {
  // Exceptions
  static readonly INVALID_PC_EXCEPTION = 'Execution killed: Invalid program counter.';
  static readonly DIVISION_BY_ZERO = 'Execution killed: attempted a divide by zero operation.';
  static readonly DUPLICATE_LABEL = 'Execution killed: duplicate label found: ';
  static readonly UNKNOWN_LABEL = 'Execution killed: unknown label: ';
  static readonly END_MISSING = 'Execution killed: END directive missing';
  static readonly DUPLICATE_END = 'Execution killed: duplicate END directive';

  // Errors
  static readonly INVALID_OP_SIZE = 'Invalid operation size (defaulted to word)';
  static readonly INVALID_REGISTER = 'Invalid register name';
  static readonly NOT_AN_ADDRESS_REGISTER = 'Address register expected';
  static readonly UNKNOWN_OPERAND = 'Unknown operand';
  static readonly TWO_PARAMETERS_EXPECTED = 'Two parameters are expected';
  static readonly ONE_PARAMETER_EXPECTED = 'One parameter is expected';
  static readonly UNRECOGNISED_INSTRUCTION = 'unrecognised instruction';
  static readonly NO_MEMORY_MEMORY_ALLOWED = 'Memory to memory is not allowed for operation';
  static readonly INVALID_ADDRESS = 'Invalid address';
  static readonly DATA_ONLY_SWAP = 'Can only SWAP a data register';
  static readonly EXG_RESTRICTIONS = 'Wrong operands type for EXG';
  static readonly CLR_ON_ADDRESS = "Can't CLR an address register";
  static readonly NOT_ON_ADDRESS = "Can't apply NOT to an address register";
  static readonly NEG_ON_ADDRESS = "Can't negate an address register";
  static readonly EXT_ON_BYTE = "Can't EXT a byte";
  static readonly DATA_ONLY_EXT = 'Can only EXT a data register';
  static readonly ONE_BIT_MEMORY_SHIFT = 'Memory shifter for more than 1 bit';
  static readonly WORD_ONLY_MEMORY_SHIFT = 'You can only shift words in memory';
  static readonly IMMEDIATE_SHIFT_MAX_SIZE = 'You can only shift for at most 8 bits while using immediate values';
  static readonly ONE_BIT_MEMORY_ROTATE = 'Memory shifter for more than 1 bit';
  static readonly WORD_ONLY_MEMORY_ROTATE = 'You can only rotate words in memory';
  static readonly IMMEDIATE_ROTATE_MAX_SIZE =
    'You can only rotate for at most 8 bits while using immediate values';
  static readonly BRA_OFFSET_TOO_LONG = 'Offset too long for BRA';
  static readonly BEQ_OFFSET_TOO_LONG = 'Offset too long for BEQ';
  static readonly BNE_OFFSET_TOO_LONG = 'Offset too long for BNE';
  static readonly BGE_OFFSET_TOO_LONG = 'Offset too long for BGE';
  static readonly BGT_OFFSET_TOO_LONG = 'Offset too long for BGT';
  static readonly BLE_OFFSET_TOO_LONG = 'Offset too long for BLE';
  static readonly BLT_OFFSET_TOO_LONG = 'Offset too long for BLT';

  // Misc
  static readonly LAST_INSTRUCTION_DEFAULT_TEXT = 'Most recent instruction will be shown here.';
  static readonly AT_LINE = ' at line: ';
}
