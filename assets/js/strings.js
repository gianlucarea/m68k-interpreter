class Strings {

    // Exceptions
    static get INVALID_PC_EXCEPTION() {return "Execution killed: Invalid program counter."};
    static get DIVISION_BY_ZERO() {return "Execution killed: attempted a divide by zero operation."};
    static get DUPLICATE_LABEL() {return "Execution killed: duplicate label found: "};
    static get UNKNOWN_LABEL() {return "Execution killed: unknown label: "};
    static get END_MISSING() {return "Execution killed: END directive missing"};
    static get DUPLICATE_END() {return "Execution killed: duplicate END directive"};
    
    // Errors
    static get INVALID_OP_SIZE() {return "Invalid operation size (defaulted to word)"};
    static get INVALID_REGISTER() {return "Invalid register name"};
    static get NOT_AN_ADDRESS_REGISTER() {return "Address register expected"};
    static get UNKNOWN_OPERAND() {return "Unknown operand"};
    static get TWO_PARAMETERS_EXPECTED() {return "Two parameters are expected"};
    static get ONE_PARAMETER_EXPECTED() {return "One parameter is expected"};
    static get UNRECOGNISED_INSTRUCTION() {return "Unrecognised instruction"};
    static get NO_MEMORY_MEMORY_ALLOWED() {return "Memory to memory is not allowed for operation"};
    static get INVALID_ADDRESS() {return "Invalid address"};
    static get DATA_ONLY_SWAP() {return "Can only SWAP a data register"};
    static get EXG_RESTRICTIONS() {return "Wrong operands type for EXG"};
    static get CLR_ON_ADDRESS() {return "Can't CLR an address register"};
    static get NOT_ON_ADDRESS() {return "Can't apply NOT to an address register"};
    static get NEG_ON_ADDRESS() {return "Can't negate an address register"};
    static get EXT_ON_BYTE() {return "Can't EXT a byte"};
    static get DATA_ONLY_EXT() {return "Can only EXT a data register"};
    static get ONE_BIT_MEMORY_SHIFT() {return "Memory shifter for more than 1 bit"};
    static get WORD_ONLY_MEMORY_SHIFT() {return "You can only shift words in memory"};
    static get IMMEDIATE_SHIFT_MAX_SIZE() {return "You can only shift for at most 8 bits while using immediate values"};
    static get ONE_BIT_MEMORY_ROTATE() {return "Memory shifter for more than 1 bit"};
    static get WORD_ONLY_MEMORY_ROTATE() {return "You can only rotate words in memory"};
    static get IMMEDIATE_ROTATE_MAX_SIZE() {return "You can only rotate for at most 8 bits while using immediate values"};
    static get BRA_OFFSET_TOO_LONG() {return "Offset too long for BRA"};
    static get BEQ_OFFSET_TOO_LONG() {return "Offset too long for BEQ"};
    static get BNE_OFFSET_TOO_LONG() {return "Offset too long for BNE"};
    static get BGE_OFFSET_TOO_LONG() {return "Offset too long for BGE"};
    static get BGT_OFFSET_TOO_LONG() {return "Offset too long for BGT"};
    static get BLE_OFFSET_TOO_LONG() {return "Offset too long for BLE"};
    static get BLT_OFFSET_TOO_LONG() {return "Offset too long for BLT"};
    
    // Misc
    static get LAST_INSTRUCTION_DEFAULT_TEXT() {return "Most recent instruction will be shown here."};
    static get AT_LINE() {return " at line: "};
}