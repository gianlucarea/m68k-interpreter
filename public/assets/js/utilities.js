function isBranch(operation) {
    var options = ["bra", "ble", "bsr", "beq", "bge", "bgt", "ble", "blt", "bne"];
    return options.some(opt => opt == operation);
}

function isJumpImmediate(operation) {
    var options = ["jmp", "jsr"];
    return options.some(opt => opt == operation);
}

function isNoOPsInstruction(operation) {
    var options = ["rts"];
    return options.some(opt => opt == operation);
}

function eraseWord(register) {
    return register & 0xFFFF0000;
}

function getShiftCeiling(size) {
    switch(size) {
        case Emulator.CODE_BYTE:
            return 0x08;
        case Emulator.CODE_WORD:
            return 0x10;
        case Emulator.CODE_LONG:
            return 0x1F;
    }
}

function getMSBMask(size) {
    switch(size) {
        case Emulator.CODE_BYTE:
            return Emulator.MSB_BYTE_MASK;
        case Emulator.CODE_WORD:
            return Emulator.MSB_WORD_MASK;
        case Emulator.CODE_LONG:
            return Emulator.MSB_LONG_MASK;
    }
}

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
}

function type_to_size(type) {
    switch(type) {
        case Emulator.CODE_BYTE:
            return Emulator.SIZE_BYTE;
        case Emulator.CODE_WORD:
            return Emulator.SIZE_WORD;
        case Emulator.CODE_LONG:
            return Emulator.SIZE_LONG;
    }
}
