
class Memory {

    constructor() {
        this.memory = {};
    }

    getMemory() {
        return this.memory;
    }

    setMemory(memory) {
        this.memory = {... memory};
    }

    // Gets a single byte from memory
    getByte(address) {
        address = address >>> 0; 
        if (this.memory[address] === undefined) // If the byte is not defined in the hashMap it means it would be 0x00 in the actual emlated computer
            return 0x00;
        return this.memory[address];
    }

    // Gets a word from memory
    getWord(address) {
        var firstBytes = this.getByte(address + 0);

        if(!this.isValidAddress(address + 1))  // Check if the next byte is still in a valid address
            return undefined;

        var secondBytes = this.getByte(address + 1);
        return parseInt( firstBytes + secondBytes, 16);
    }

    // Gets a long-word from memory
    getLong(address) {
        var firstBytes = this.getByte(address + 0);
        if(!this.isValidAddress(address + 1)) 
            return undefined;

        var secondBytes = this.getByte(address + 1);
        if(!this.isValidAddress(address + 2)) 
            return undefined;

        var thirdBytes = this.getByte(address + 2);
        if(!this.isValidAddress(address + 3)) 
            return undefined;

        var fourthBytes = this.getByte(address + 3);
        return parseInt(firstBytes + secondBytes + thirdBytes + fourthBytes, 16);
    }

    set(address, value, size) {
        switch(size) {
            case Emulator.CODE_LONG :
                this.setLong(address, value);
                break;
            case Emulator.CODE_WORD :
                this.setWord(address, value);
                break;
            case Emulator.CODE_BYTE :
                this.setByte(address, value);
                break;
        }
    }

    setByte(address, value) {
        address = address >>> 0 ;
        value = value.toString(16).slice(-2); 
        this.memory[address] = value;
    }
    
    setWord(address, value) {
        address = address >>> 0;
        this.setByte(address + 0, value  >>> 8);
        this.setByte(address + 1, value);
    }

    setLong(address, value) {
        address = address >>> 0;
        this.setByte(address + 0, value >>> 24);
        this.setByte(address + 1, value >>> 16); 
        this.setByte(address + 2, value >>> 8);
        this.setByte(address + 3, value >>> 0);
    }

    isValidAddress(address) {
        address = address >>> 0;
        return 0 <= address && address <= 0x7fffffff;  /// Address must be between 0 and 0111 1111 1111 1111 1111 1111 1111 1111‬
    }
}