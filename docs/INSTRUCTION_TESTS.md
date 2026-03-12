# M68K Interpreter - Instruction Set Test Results

## Test Execution Instructions
To test each instruction category, follow these steps:
1. Open the M68K Interpreter at: http://localhost:3000/m68k-interpreter/
2. Copy the assembly code from one of the test-*.asm files into the editor
3. Click "Run" to execute the entire program or "Step" to step through instructions
4. Check the register values in the Registers panel to verify expected results
5. Note: Use the hex input in the GUI to convert between decimal and hex values

## Test Files and Expected Results

### TEST 1: ARITHMETIC INSTRUCTIONS (test-arithmetic.asm)
**Instructions Tested:** ADD, ADDA, ADDI, ADDQ, SUB, SUBA, SUBI, SUBQ

Expected Register Values After Execution:
- D0 = 15 (ADD: 10 + 5)
- D1 = 5 (source register)
- D2 = 35 (ADDI: 20 + 15)
- D3 = 35 (ADDQ: 30 + 5)
- D4 = 12 (SUB: 20 - 8)
- D5 = 8 (source register)
- D6 = 35 (SUBI: 50 - 15)
- D7 = 30 (SUBQ: 40 - 10)
- A0 = 150 (ADDA: 100 + 50)
- A1 = 50 (source)
- A2 = 150 (SUBA: 200 - 50)
- A3 = 50 (source)

✅ STATUS: Ready for testing

---

### TEST 2: LOGIC INSTRUCTIONS (test-logic.asm)
**Instructions Tested:** AND, ANDI, OR, ORI, EOR, EORI, NOT, NEG

Expected Register Values After Execution:
- D0 = $F0 (EORI: $FF XOR $0F)
- D1 = $FFFF (NOT: ~$0000)
- D2 = $FFFFFFF6 (NEG: -10, twos complement)
- D2 = $F0 (ANDI: $FF AND $F0)
- D3 = $FF (OR: $F0 OR $0F)
- D5 = $FF (ORI: $F0 OR $0F)
- D6 = $F0 (EOR: $FF XOR $0F)

✅ STATUS: Ready for testing

---

### TEST 3: BASIC OPERATIONS (test-basic.asm)
**Instructions Tested:** MOVE, MOVEA, CLR, EXG, SWAP, EXT, LEA

Expected Register Values After Execution:
- D0 = $FFFFFFFF (EXT sign extension from $FF)
- D1 = 100 (MOVE: D0 to D1)
- D4 = 0 (CLR)
- D5 = 20 (EXG: exchanged, was 10)
- D6 = 10 (EXG: exchanged, was 20)
- D7 = $56781234 (SWAP: $12345678)
- A0 = 100 (MOVE to address register)
- A1 = 500 (MOVEA)
- A2 = $2000 (LEA)

✅ STATUS: Ready for testing

---

### TEST 4: SHIFT INSTRUCTIONS (test-shifts.asm)
**Instructions Tested:** ASL, ASR, LSL, LSR, ROL, ROR

Expected Register Values After Execution:
- D0 = 20 (ASL: 5 << 2 = 5 * 4 = 20)
- D1 = 5 (ASR: 20 >> 2 = 20 / 4 = 5)
- D2 = 20 (LSL: 5 << 2 = 20)
- D3 = 5 (LSR: 20 >> 2 = 5)
- D4 = $00000001 (ROL: $80000000 << 1 wraps)
- D5 = $80000000 (ROR: $00000001 >> 1 wraps)
- D7 = 128 (ASL by register: 16 << 3 = 128)

✅ STATUS: Ready for testing

---

### TEST 5: COMPARISON INSTRUCTIONS (test-compare.asm)
**Instructions Tested:** CMP, CMPA, CMPI, TST

Expected Condition Code Flags After Execution:
- After CMP D1, D0 (10 vs 10): Z flag SET (equal)
- After CMP D3, D2 (20 vs 10): Z flag CLEAR, N flag SET (negative/less)
- After CMPA A1, A0 (100 vs 100): Z flag SET
- After CMPI #50, D4: Z flag SET
- After TST D5 (#0): Z flag SET
- After TST D6 (#100): Z flag CLEAR

Register Values:
- D0 = 10, D1 = 10 (unchanged by CMP)
- D2 = 10, D3 = 20 (unchanged by CMP)
- D4 = 50, D5 = 0, D6 = 100

✅ STATUS: Ready for testing

---

### TEST 6: BRANCH INSTRUCTIONS (test-branches.asm)
**Instructions Tested:** BRA, BEQ, BNE, BGE, BGT, BLE, BLT

Expected Register Values After Execution:
- D0 = 555 (BGT executed)
- D1 = 666 (BLE executed)
- D3 = 777 (BLT executed)
- D5 = 444 (BGE executed)
- + All values from BEQ and BNE tests...

All branches should execute and skip the #999 instructions (lines marked as "skipped").

✅ STATUS: Ready for testing

---

### TEST 7: JUMP INSTRUCTIONS (test-jumps.asm)
**Instructions Tested:** JMP, JSR, RTS

Expected Register Values After Execution:
- D0 = 111 (JMP executed, skipped #999)
- D1 = 222 (JSR returned and continued)
- D2 = 333 (JSR subroutine executed)

Stack Verification: 
- After JSR, return address should be on stack A7
- After RTS, stack should return and PC should continue

✅ STATUS: Ready for testing

---

### TEST 8: MULTIPLICATION & DIVISION (test-muldiv.asm)
**Instructions Tested:** MULS, DIVS

Expected Register Values After Execution:
- D0 = 42 (MULS: 6 * 7)
- D2 = $FFFFFFD6 (-42 as 32-bit signed)
- D4 = 25 (DIVS: 100 / 4 = 25 quotient)
- D6 = quotient 4, remainder 3 (DIVS: 23 / 5)

✅ STATUS: Ready for testing

---

## How to Execute Tests

### Quick Test Procedure:
1. Open the interpreter
2. Copy one test file content into the editor
3. Click **Run** to execute all instructions
4. Check the Registers panel for results
5. Compare actual values to expected values above

### Step-by-Step Testing:
1. Copy test code
2. Click **Step** repeatedly to execute one instruction at a time
3. Watch register changes in real-time
4. Compare to expected values

### Example Test Session:
```
Test: ADD D1, D0 where D0=10, D1=5
Expected: D0=15
Steps:
  MOVE #10, D0  → D0 becomes 10
  MOVE #5, D1   → D1 becomes 5
  ADD D1, D0    → D0 becomes 15 ✓
```

---

## Test Coverage Summary

| Category | Instructions | Count | Status |
|----------|--------------|-------|--------|
| Arithmetic | ADD, ADDA, ADDI, ADDQ, SUB, SUBA, SUBI, SUBQ | 8 | ✅ Ready |
| Multiplication/Division | MULS, DIVS | 2 | ✅ Ready |
| Logic | AND, ANDI, OR, ORI, EOR, EORI, NOT, NEG | 8 | ✅ Ready |
| Basic Operations | MOVE, MOVEA, CLR, EXG, SWAP, EXT, LEA | 7 | ✅ Ready |
| Shifts | ASL, ASR, LSL, LSR, ROL, ROR | 6 | ✅ Ready |
| Comparisons | CMP, CMPA, CMPI, TST | 4 | ✅ Ready |
| Branches | BRA, BEQ, BNE, BGE, BGT, BLE, BLT | 7 | ✅ Ready |
| Jumps | JMP, JSR, RTS | 3 | ✅ Ready |

**Total Instructions Tested: 45 out of 45 supported instructions**

---

## Notes for Testing

1. **Register Values**: All registers start at 0. Values shown are after instruction execution.
2. **Condition Codes**: Z (Zero), N (Negative), V (Overflow), C (Carry), X (Extend)
3. **Address Registers**: Testing uses A0-A3. A7 is the stack pointer.
4. **Hex Notation**: Values like $FF represent hexadecimal. The UI will show both decimal and hex.
5. **Signed Values**: NEG and DIVS produce signed results using twos complement.
6. **Rotate Instructions**: ROL and ROR wrap the rotated bit back into the register.

---

## How to Report Issues

If any instruction doesn't produce expected results:
1. Note the instruction name
2. Record the input values
3. Record the actual output values
4. Record the expected output values
5. Include test file name and line number
6. Report to the project maintainers
