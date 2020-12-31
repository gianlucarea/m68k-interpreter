class Undo {

    constructor() {
        this.stack = [];
    }
    
    getStack() {
        return this.stack;
    }

    // Create and returns a stack frame
    makeFrame(pc, ccr, registers, memory, errors, lastInstruction, line) {
        let frame = {
            pc: pc,
            ccr: ccr,
            lastInstruction: lastInstruction,
            line: line,
            registers: [... registers],
            memory: {... memory},
            errors: [... errors]
        }
        return frame;
    }

    push(pc, ccr, registers, memory, errors, lastInstruction, line) {
        this.stack.push(this.makeFrame(pc, ccr, registers, memory, errors, lastInstruction, line));
    }

    pop() {
        if(this.stack.length == 0)
            return undefined;
        return this.stack.pop();
    }

    peek() {
        return this.stack[this.stack.length - 1]; 
    }

    isEmpty() {
        if(this.stack.length == 0)
            return true;
        return false;
    }

    clearStack() {
        this.stack = [];
    }

}