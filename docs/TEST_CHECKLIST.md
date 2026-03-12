# M68K Interpreter - Instruction Set Test Checklist

## Quick Test Execution Guide

### Prerequisites
- Browser with access to: http://localhost:3000/m68k-interpreter/
- All test files in the project directory:
  - test-arithmetic.asm
  - test-logic.asm
  - test-basic.asm
  - test-shifts.asm
  - test-compare.asm
  - test-branches.asm
  - test-jumps.asm
  - test-muldiv.asm
  - COMPREHENSIVE_TEST.asm

---

## Testing Procedure

### Option 1: Individual Category Testing (Recommended for detailed verification)

#### ✓ Test 1: Arithmetic Instructions
- **File**: `test-arithmetic.asm`
- **Time**: ~2 minutes
- **Steps**:
  1. Copy entire contents of test-arithmetic.asm
  2. Paste into the editor
  3. Click "Run" or use "Step" to go line by line
  4. Check registers: D0-D7, A0-A3
  5. Verify all values match expected results below
  
**Expected Results**:
```
D0 = 15   (ADD)
D1 = 5 
D2 = 35   (ADDI)
D3 = 35   (ADDQ)
D4 = 12   (SUB)
D5 = 8
D6 = 35   (SUBI)
D7 = 30   (SUBQ)
A0 = 150  (ADDA)
A1 = 50
A2 = 150  (SUBA)
A3 = 50
```
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

#### ✓ Test 2: Logic Instructions
- **File**: `test-logic.asm`
- **Time**: ~2 minutes
- **Steps**: (Same as above)
  
**Expected Results**:
```
D0 = $F0 (EORI)
D1 = $FFFF (NOT)
D2 = $FFFFFFF6 (NEG -10)
D3 = (from OR instruction)
```
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

#### ✓ Test 3: Basic Operations
- **File**: `test-basic.asm`
- **Time**: ~2 minutes

**Expected Results**:
```
D0 = $FFFFFFFF (EXT)
D1 = 100 (MOVE)
D4 = 0 (CLR)
D5 = 20 (EXG)
D6 = 10 (EXG)
D7 = $56781234 (SWAP)
A0 = 100 (MOVE)
A1 = 500 (MOVEA)
A2 = $2000 (LEA)
```
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

#### ✓ Test 4: Shift Instructions
- **File**: `test-shifts.asm`
- **Time**: ~2 minutes

**Expected Results**:
```
D0 = 20 (ASL)
D1 = 5 (ASR)
D2 = 20 (LSL)
D3 = 5 (LSR)
D4 = $00000001 (ROL)
D5 = $80000000 (ROR)
D7 = 128 (ASL by register)
```
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

#### ✓ Test 5: Comparison Instructions
- **File**: `test-compare.asm`
- **Time**: ~1 minute
- **Check**: Condition Code Flags (Z, N, V, C, X)

**Expected Flag States**:
```
After CMP D1, D0 (10==10): Z=1 (set)
After CMP D3, D2 (20≠10): Z=0 (clear)
After TST D5 (#0): Z=1 (set)
After TST D6 (#100): Z=0 (clear)
```
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

#### ✓ Test 6: Branch Instructions
- **File**: `test-branches.asm`
- **Time**: ~2 minutes

**Expected Results** (all #999 values should be skipped):
```
D0 = 555 (BGT executed)
D1 = 666 (BLE executed)
D3 = 777 (BLT executed)
D5 = 444 (BGE executed)
```
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

#### ✓ Test 7: Jump Instructions
- **File**: `test-jumps.asm`
- **Time**: ~1 minute

**Expected Results**:
```
D0 = 111 (JMP skipped #999)
D1 = 222 (JSR returned)
D2 = 333 (subroutine executed)
```
- **Check**: Stack pointer (A7) returns to normal after RTS
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

#### ✓ Test 8: Multiplication & Division
- **File**: `test-muldiv.asm`
- **Time**: ~1 minute

**Expected Results**:
```
D0 = 42 (MULS: 6*7)
D2 = $FFFFFFD6 (NEG -42)
D4 = 25 (DIVS: 100/4)
D6 = quotient:4, remainder:3
```
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

### Option 2: Comprehensive Testing (All-in-one)

#### ✓ Test All Instructions
- **File**: `COMPREHENSIVE_TEST.asm`
- **Time**: ~5 minutes
- **Steps**:
  1. Copy entire COMPREHENSIVE_TEST.asm
  2. Paste into editor
  3. Click "Run"
  4. Wait for completion
  5. Verify all 45 instructions executed without errors
  
- **Status**: [ ] PASS  [ ] FAIL  [ ] PARTIAL

---

## Detailed Test Report

### Test Session Information
- **Date**: ___________
- **Tester**: ___________
- **Build**: ___________

### Results Summary

| Category | File | Instructions | Pass | Fail | Notes |
|----------|------|--------------|------|------|-------|
| Arithmetic | test-arithmetic.asm | 8 | [ ] | [ ] | |
| Logic | test-logic.asm | 8 | [ ] | [ ] | |
| Basic | test-basic.asm | 7 | [ ] | [ ] | |
| Shifts | test-shifts.asm | 6 | [ ] | [ ] | |
| Compare | test-compare.asm | 4 | [ ] | [ ] | |
| Branches | test-branches.asm | 7 | [ ] | [ ] | |
| Jumps | test-jumps.asm | 3 | [ ] | [ ] | |
| Mul/Div | test-muldiv.asm | 2 | [ ] | [ ] | |
| **TOTAL** | | **45** | [ ] | [ ] | |

---

## Known Issues & Limitations

### Instruction-Specific Notes

**MULS/DIVS**:
- DIVS result: quotient in lower 16 bits, remainder in upper 16 bits
- Verify both quotient and remainder are correct

**Shifts with Register Count**:
- When using register as count (e.g., `ASL D6, D7`), count register is read as-is
- Values >31 may wrap or behave differently

**JSR/RTS**:
- Requires proper stack setup
- Watch A7 (stack pointer) value before and after

**Rotate Instructions** (ROL, ROR):
- ROXL/ROXR not yet tested in this suite
- Verify rotation actually wraps bits correctly

---

## Troubleshooting

### If test fails:
1. **Clear registers**: Click Reset button
2. **Review code**: Check for typos in assembly
3. **Step through**: Use Step button to debug instruction by instruction
4. **Check flags**: View condition code flags for conditional instructions
5. **Hex conversion**: Use UI tool to convert between decimal and hex for easier verification

### Common Issues:
- **Registers show unexpected values**: Check if previous test was fully reset
- **Branch not taken**: Verify CMP instruction executed before branch
- **Subroutine didn't execute**: Check JSR/RTS sequence and stack
- **Overflow/underflow**: Check register width in results

---

## Pass/Fail Criteria

### PASS if:
- ✅ All register values match expected results (within tolerance)
- ✅ No error messages displayed
- ✅ Condition flags set correctly for comparison instructions
- ✅ Branches execute correctly (skip #999 values)
- ✅ Subroutines return properly

### FAIL if:
- ❌ Any register value doesn't match expected result
- ❌ Error or exception displayed
- ❌ Condition flags incorrect
- ❌ Branch executes when it shouldn't (or vice versa)
- ❌ Program hangs or doesn't complete

---

## Final Verification

After completing all tests:

- [ ] All 45 instructions tested
- [ ] All tests PASSED
- [ ] No errors or exceptions
- [ ] Results documented
- [ ] Ready for release

---

## Test History Log

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
| | | | |
| | | | |
| | | | |

