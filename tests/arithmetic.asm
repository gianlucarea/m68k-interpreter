;-------------------------------------------------------
; M68K Emulator Instruction Test Suite - Integer Arithmetic
; Target: Motorola 68000
; Instructions: ADD, ADDA, ADDI, ADDQ, ADDX,
;               SUB, SUBA, SUBI, SUBQ, SUBX,
;               MULS, MULU, DIVS, DIVU,
;               NEG, NEGX, EXT, CLR,
;               CMP, CMPA, CMPI, CMPM, TST
; Initial State Assumption: All Regs = 0, SP = $2000
;-------------------------------------------------------

    ORG     $1000           ; Start code at address $1000

START:

;=======================================================
; SECTION 1: ADD FAMILY
;=======================================================

    ; --- ADD: Add Data Registers / Memory ---

    ; 1a. ADD.B - Byte addition
    MOVEQ   #$10, D0        ; D0 = $00000010
    MOVEQ   #$20, D1        ; D1 = $00000020
    ADD.B   D1, D0          ; D0.B = $10 + $20 = $30
                            ; D0 = $00000030
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 1b. ADD.W - Word addition
    MOVE.W  #$1000, D2      ; D2 = $00001000
    MOVE.W  #$2000, D3      ; D3 = $00002000
    ADD.W   D3, D2          ; D2.W = $1000 + $2000 = $3000
                            ; D2 = $00003000
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 1c. ADD.L - Long addition
    MOVE.L  #$00010000, D4  ; D4 = $00010000
    MOVE.L  #$00020000, D5  ; D5 = $00020000
    ADD.L   D5, D4          ; D4 = $00010000 + $00020000 = $00030000
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 1d. ADD producing Zero flag
    MOVEQ   #$7F, D0        ; D0 = $7F
    MOVE.B  #$81, D1        ; D1.B = $81
    ADD.B   D1, D0          ; D0.B = $7F + $81 = $00 (with carry)
                            ; Flags: N=0, Z=1, V=0, C=1, X=1

    ; 1e. ADD producing Overflow (signed)
    MOVE.B  #$70, D0        ; D0.B = $70 (+112)
    MOVE.B  #$50, D1        ; D1.B = $50 (+80)
    ADD.B   D1, D0          ; D0.B = $70 + $50 = $C0 (-64, overflow!)
                            ; Flags: N=1, Z=0, V=1, C=0, X=0

    ; 1f. ADD.W - destination is memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$1234, (A0)    ; Mem[$3000] = $1234
    MOVE.W  #$0100, D0      ; D0.W = $0100
    ADD.W   D0, (A0)        ; Mem[$3000] = $1234 + $0100 = $1334
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; --- ADDA: Add to Address Register ---
    ; Note: ADDA never modifies the CCR flags.

    ; 2a. ADDA.W - Word (sign-extended) added to full 32-bit address register
    MOVEA.L #$00003000, A1  ; A1 = $00003000
    MOVE.W  #$0100, D0      ; D0.W = $0100
    ADDA.W  D0, A1          ; A1 = $00003000 + $0100 = $00003100
                            ; Flags: Unchanged

    ; 2b. ADDA.W with a negative (sign-extended) value
    MOVEA.L #$00003200, A1  ; A1 = $00003200
    MOVE.W  #$FF00, D0      ; D0.W = $FF00 (sign-extended to $FFFFFF00 = -256)
    ADDA.W  D0, A1          ; A1 = $00003200 + $FFFFFF00 = $00003100
                            ; Flags: Unchanged

    ; 2c. ADDA.L - Long word added to address register
    MOVEA.L #$00001000, A2  ; A2 = $00001000
    ADDA.L  #$00002000, A2  ; A2 = $00001000 + $00002000 = $00003000
                            ; Flags: Unchanged

    ; --- ADDI: Add Immediate ---

    ; 3a. ADDI.B
    MOVE.B  #$05, D0        ; D0.B = $05
    ADDI.B  #$0A, D0        ; D0.B = $05 + $0A = $0F
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 3b. ADDI.W
    MOVE.W  #$0100, D1      ; D1.W = $0100
    ADDI.W  #$00FF, D1      ; D1.W = $0100 + $00FF = $01FF
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 3c. ADDI.L
    MOVE.L  #$00001000, D2  ; D2 = $00001000
    ADDI.L  #$00001000, D2  ; D2 = $00001000 + $00001000 = $00002000
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 3d. ADDI to memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0010, (A0)    ; Mem[$3000] = $0010
    ADDI.W  #$0020, (A0)    ; Mem[$3000] = $0010 + $0020 = $0030
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; --- ADDQ: Add Quick (1-8 immediate) ---

    ; 4a. ADDQ.B
    MOVE.B  #$01, D0        ; D0.B = $01
    ADDQ.B  #7, D0          ; D0.B = $01 + $07 = $08
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 4b. ADDQ.W
    MOVE.W  #$FFFE, D1      ; D1.W = $FFFE
    ADDQ.W  #2, D1          ; D1.W = $FFFE + 2 = $0000 (wraps, carry)
                            ; Flags: N=0, Z=1, V=0, C=1, X=1

    ; 4c. ADDQ.L
    MOVE.L  #$FFFFFFFE, D2  ; D2 = $FFFFFFFE
    ADDQ.L  #1, D2          ; D2 = $FFFFFFFE + 1 = $FFFFFFFF
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 4d. ADDQ to Address Register (no flags affected)
    MOVEA.L #$00003000, A0  ; A0 = $00003000
    ADDQ.L  #4, A0          ; A0 = $00003004
                            ; Flags: Unchanged

    ; --- ADDX: Add with Extend ---
    ; ADDX uses the X flag as an extra carry bit.

    ; 5a. ADDX.B - Set up X=0 first, then add
    MOVE.W  #$0000, CCR     ; Clear all flags including X
    MOVE.B  #$10, D0        ; D0.B = $10
    MOVE.B  #$20, D1        ; D1.B = $20
    ADDX.B  D1, D0          ; D0.B = $10 + $20 + X(0) = $30
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 5b. ADDX.B - with X=1 (carry from previous operation)
    MOVE.W  #$0011, CCR     ; Set X=1 and C=1 (bits 4 and 0)
    MOVE.B  #$10, D0        ; D0.B = $10
    MOVE.B  #$20, D1        ; D1.B = $20
    ADDX.B  D1, D0          ; D0.B = $10 + $20 + X(1) = $31
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 5c. ADDX.L - Multi-precision addition (D5:D4 + D3:D2)
    ; Adding $000000FF_00000001 + $00000000_FFFFFFFF
    MOVE.L  #$000000FF, D5  ; High long of first operand
    MOVE.L  #$00000001, D4  ; Low long of first operand
    MOVE.L  #$00000000, D3  ; High long of second operand
    MOVE.L  #$FFFFFFFF, D2  ; Low long of second operand
    MOVE.W  #$0000, CCR     ; Clear X flag
    ADDX.L  D2, D4          ; D4 = $00000001 + $FFFFFFFF = $00000000, X=1
                            ; Flags: N=0, Z=1, V=0, C=1, X=1
    ADDX.L  D3, D5          ; D5 = $000000FF + $00000000 + X(1) = $00000100
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 5d. ADDX using memory (predecrement)
    MOVEA.L #$3004, A0      ; A0 = $3004 (points past data)
    MOVEA.L #$3008, A1      ; A1 = $3008
    MOVE.L  #$000000FE, $3000 ; Source operand at $3000
    MOVE.L  #$00000001, $3004 ; Dest operand at $3004
    MOVE.W  #$0010, CCR     ; Set X=1
    ADDX.L  -(A0), -(A1)    ; Mem[$3004] = $00000001 + $000000FE + X(1) = $00000100
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

;=======================================================
; SECTION 2: SUB FAMILY
;=======================================================

    ; --- SUB: Subtract ---

    ; 6a. SUB.B
    MOVEQ   #$30, D0        ; D0 = $30
    MOVEQ   #$10, D1        ; D1 = $10
    SUB.B   D1, D0          ; D0.B = $30 - $10 = $20
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 6b. SUB.W
    MOVE.W  #$5000, D2      ; D2.W = $5000
    MOVE.W  #$1000, D3      ; D3.W = $1000
    SUB.W   D3, D2          ; D2.W = $5000 - $1000 = $4000
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 6c. SUB.L
    MOVE.L  #$00050000, D4  ; D4 = $00050000
    MOVE.L  #$00020000, D5  ; D5 = $00020000
    SUB.L   D5, D4          ; D4 = $00050000 - $00020000 = $00030000
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 6d. SUB producing borrow (unsigned underflow, C=1)
    MOVE.B  #$10, D0        ; D0.B = $10
    MOVE.B  #$20, D1        ; D1.B = $20
    SUB.B   D1, D0          ; D0.B = $10 - $20 = $F0 (borrow)
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 6e. SUB producing Overflow (signed)
    MOVE.B  #$80, D0        ; D0.B = $80 (-128)
    MOVE.B  #$01, D1        ; D1.B = $01 (+1)
    SUB.B   D1, D0          ; D0.B = $80 - $01 = $7F (overflow: neg - pos = pos)
                            ; Flags: N=0, Z=0, V=1, C=0, X=0

    ; 6f. SUB producing zero
    MOVEQ   #$42, D0        ; D0 = $42
    MOVEQ   #$42, D1        ; D1 = $42
    SUB.B   D1, D0          ; D0.B = $42 - $42 = $00
                            ; Flags: N=0, Z=1, V=0, C=0, X=0

    ; --- SUBA: Subtract from Address Register ---
    ; Note: SUBA never modifies the CCR flags.

    ; 7a. SUBA.W (sign-extended word)
    MOVEA.L #$00003100, A1  ; A1 = $00003100
    MOVE.W  #$0100, D0      ; D0.W = $0100
    SUBA.W  D0, A1          ; A1 = $00003100 - $00000100 = $00003000
                            ; Flags: Unchanged

    ; 7b. SUBA.W with negative (sign-extended) value (effectively adds)
    MOVEA.L #$00003000, A1  ; A1 = $00003000
    MOVE.W  #$FF00, D0      ; D0.W = $FF00 (sign-extended to $FFFFFF00 = -256)
    SUBA.W  D0, A1          ; A1 = $00003000 - $FFFFFF00 = $00003100
                            ; Flags: Unchanged

    ; 7c. SUBA.L
    MOVEA.L #$00005000, A2  ; A2 = $00005000
    SUBA.L  #$00002000, A2  ; A2 = $00005000 - $00002000 = $00003000
                            ; Flags: Unchanged

    ; --- SUBI: Subtract Immediate ---

    ; 8a. SUBI.B
    MOVE.B  #$0F, D0        ; D0.B = $0F
    SUBI.B  #$05, D0        ; D0.B = $0F - $05 = $0A
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 8b. SUBI.W
    MOVE.W  #$01FF, D1      ; D1.W = $01FF
    SUBI.W  #$00FF, D1      ; D1.W = $01FF - $00FF = $0100
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 8c. SUBI.L
    MOVE.L  #$00002000, D2  ; D2 = $00002000
    SUBI.L  #$00001000, D2  ; D2 = $00002000 - $00001000 = $00001000
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 8d. SUBI to memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0050, (A0)    ; Mem[$3000] = $0050
    SUBI.W  #$0020, (A0)    ; Mem[$3000] = $0050 - $0020 = $0030
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; --- SUBQ: Subtract Quick (1-8 immediate) ---

    ; 9a. SUBQ.B
    MOVE.B  #$08, D0        ; D0.B = $08
    SUBQ.B  #3, D0          ; D0.B = $08 - $03 = $05
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 9b. SUBQ.W - producing zero
    MOVE.W  #$0008, D1      ; D1.W = $0008
    SUBQ.W  #8, D1          ; D1.W = $0008 - $0008 = $0000
                            ; Flags: N=0, Z=1, V=0, C=0, X=0

    ; 9c. SUBQ.L - with borrow
    MOVE.L  #$00000003, D2  ; D2 = $00000003
    SUBQ.L  #5, D2          ; D2 = $00000003 - $00000005 = $FFFFFFFE (borrow)
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 9d. SUBQ from Address Register (no flags affected)
    MOVEA.L #$00003010, A0  ; A0 = $00003010
    SUBQ.L  #4, A0          ; A0 = $0000300C
                            ; Flags: Unchanged

    ; --- SUBX: Subtract with Extend ---

    ; 10a. SUBX.B - X=0
    MOVE.W  #$0000, CCR     ; Clear flags, X=0
    MOVE.B  #$30, D0        ; D0.B = $30
    MOVE.B  #$10, D1        ; D1.B = $10
    SUBX.B  D1, D0          ; D0.B = $30 - $10 - X(0) = $20
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 10b. SUBX.B - X=1
    MOVE.W  #$0010, CCR     ; Set X=1
    MOVE.B  #$30, D0        ; D0.B = $30
    MOVE.B  #$10, D1        ; D1.B = $10
    SUBX.B  D1, D0          ; D0.B = $30 - $10 - X(1) = $1F
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 10c. SUBX.L - Multi-precision subtraction
    ; ($00000100_00000000) - ($000000FF_FFFFFFFF)
    MOVE.L  #$00000100, D5  ; High long of minuend
    MOVE.L  #$00000000, D4  ; Low long of minuend
    MOVE.L  #$000000FF, D3  ; High long of subtrahend
    MOVE.L  #$FFFFFFFF, D2  ; Low long of subtrahend
    MOVE.W  #$0000, CCR     ; Clear X
    SUBX.L  D2, D4          ; D4 = $00000000 - $FFFFFFFF = $00000001, X=1
                            ; Flags: N=0, Z=0, V=0, C=1, X=1
    SUBX.L  D3, D5          ; D5 = $00000100 - $000000FF - X(1) = $00000000
                            ; Flags: N=0, Z=1, V=0, C=0, X=0

;=======================================================
; SECTION 3: MULTIPLY / DIVIDE
;=======================================================

    ; --- MULS: Multiply Signed ---
    ; Multiplies two 16-bit signed operands -> 32-bit signed result

    ; 11a. MULS - positive * positive
    MOVE.W  #5, D0          ; D0.W = $0005 (+5)
    MOVE.W  #4, D1          ; D1.W = $0004 (+4)
    MULS    D1, D0          ; D0 = 5 * 4 = $00000014 (+20)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 11b. MULS - negative * positive
    MOVE.W  #$FFFF, D0      ; D0.W = $FFFF (-1 signed)
    MOVE.W  #10, D1         ; D1.W = $000A (+10)
    MULS    D1, D0          ; D0 = -1 * 10 = $FFFFFFF6 (-10)
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 11c. MULS - negative * negative
    MOVE.W  #$FFFE, D0      ; D0.W = $FFFE (-2 signed)
    MOVE.W  #$FFFD, D1      ; D1.W = $FFFD (-3 signed)
    MULS    D1, D0          ; D0 = -2 * -3 = $00000006 (+6)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 11d. MULS - result is zero
    MOVE.W  #$0000, D0      ; D0.W = 0
    MOVE.W  #$1234, D1      ; D1.W = $1234
    MULS    D1, D0          ; D0 = 0 * $1234 = $00000000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 11e. MULS - max positive * max positive (overflow into upper word)
    MOVE.W  #$7FFF, D0      ; D0.W = $7FFF (+32767)
    MOVE.W  #$7FFF, D1      ; D1.W = $7FFF (+32767)
    MULS    D1, D0          ; D0 = 32767 * 32767 = $3FFF0001
                            ; Flags: N=0, Z=0, V=0, C=0

    ; --- MULU: Multiply Unsigned ---
    ; Multiplies two 16-bit unsigned operands -> 32-bit unsigned result

    ; 12a. MULU - basic
    MOVE.W  #$000A, D0      ; D0.W = 10
    MOVE.W  #$0005, D1      ; D1.W = 5
    MULU    D1, D0          ; D0 = 10 * 5 = $00000032 (50)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 12b. MULU - large unsigned values (treated as unsigned, not negative)
    MOVE.W  #$FFFF, D0      ; D0.W = $FFFF (65535 unsigned)
    MOVE.W  #$0002, D1      ; D1.W = 2
    MULU    D1, D0          ; D0 = 65535 * 2 = $0001FFFE
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 12c. MULU max * max
    MOVE.W  #$FFFF, D0      ; D0.W = $FFFF
    MOVE.W  #$FFFF, D1      ; D1.W = $FFFF
    MULU    D1, D0          ; D0 = $FFFF * $FFFF = $FFFE0001
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 12d. MULU - result is zero
    MOVE.W  #$0000, D0      ; D0.W = 0
    MOVE.W  #$ABCD, D1      ; D1.W = $ABCD
    MULU    D1, D0          ; D0 = 0 * $ABCD = $00000000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; --- DIVS: Divide Signed ---
    ; 32-bit / 16-bit -> 16-bit quotient (low word) : 16-bit remainder (high word)

    ; 13a. DIVS - basic positive division
    MOVE.L  #20, D0         ; D0 = $00000014 (20)
    MOVE.W  #4, D1          ; D1.W = $0004 (4)
    DIVS    D1, D0          ; D0 = 20/4: quotient=$0005, remainder=$0000
                            ; D0 = $00000005
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 13b. DIVS - with non-zero remainder
    MOVE.L  #22, D0         ; D0 = $00000016 (22)
    MOVE.W  #4, D1          ; D1.W = $0004 (4)
    DIVS    D1, D0          ; D0 = 22/4: quotient=5, remainder=2
                            ; D0 = $00020005
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 13c. DIVS - negative dividend
    MOVE.L  #-20, D0        ; D0 = $FFFFFFEC (-20)
    MOVE.W  #4, D1          ; D1.W = 4
    DIVS    D1, D0          ; D0 = -20/4: quotient=-5 ($FFFB), remainder=0
                            ; D0 = $0000FFFB
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 13d. DIVS - negative divisor
    MOVE.L  #20, D0         ; D0 = 20
    MOVE.W  #$FFFC, D1      ; D1.W = $FFFC (-4 signed)
    DIVS    D1, D0          ; D0 = 20 / -4: quotient=-5 ($FFFB), remainder=0
                            ; D0 = $0000FFFB
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 13e. DIVS - both negative (positive result)
    MOVE.L  #-20, D0        ; D0 = $FFFFFFEC (-20)
    MOVE.W  #$FFFC, D1      ; D1.W = $FFFC (-4)
    DIVS    D1, D0          ; D0 = -20 / -4: quotient=5, remainder=0
                            ; D0 = $00000005
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 13f. DIVS - quotient is zero
    MOVE.L  #3, D0          ; D0 = 3
    MOVE.W  #10, D1         ; D1.W = 10
    DIVS    D1, D0          ; D0 = 3/10: quotient=0, remainder=3
                            ; D0 = $00030000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; --- DIVU: Divide Unsigned ---

    ; 14a. DIVU - basic
    MOVE.L  #50, D0         ; D0 = $00000032 (50)
    MOVE.W  #5, D1          ; D1.W = 5
    DIVU    D1, D0          ; D0 = 50/5: quotient=10, remainder=0
                            ; D0 = $0000000A
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 14b. DIVU - with remainder
    MOVE.L  #17, D0         ; D0 = 17
    MOVE.W  #5, D1          ; D1.W = 5
    DIVU    D1, D0          ; D0 = 17/5: quotient=3, remainder=2
                            ; D0 = $00020003
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 14c. DIVU - large unsigned dividend
    MOVE.L  #$0000FFFF, D0  ; D0 = 65535
    MOVE.W  #$000F, D1      ; D1.W = 15
    DIVU    D1, D0          ; D0 = 65535/15: quotient=4369($1111), remainder=0
                            ; D0 = $00001111
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 14d. DIVU - quotient is zero (dividend < divisor)
    MOVE.L  #3, D0          ; D0 = 3
    MOVE.W  #100, D1        ; D1.W = 100
    DIVU    D1, D0          ; D0 = 3/100: quotient=0, remainder=3
                            ; D0 = $00030000
                            ; Flags: N=0, Z=1, V=0, C=0

;=======================================================
; SECTION 4: NEG, NEGX, EXT, CLR
;=======================================================

    ; --- NEG: Negate (Two's Complement) ---
    ; NEG Dn is equivalent to 0 - Dn

    ; 15a. NEG.B - positive value
    MOVE.B  #$05, D0        ; D0.B = $05 (+5)
    NEG.B   D0              ; D0.B = -5 = $FB
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 15b. NEG.B - negative value
    MOVE.B  #$FB, D0        ; D0.B = $FB (-5)
    NEG.B   D0              ; D0.B = +5 = $05
                            ; Flags: N=0, Z=0, V=0, C=1, X=1

    ; 15c. NEG.B - zero
    MOVE.B  #$00, D0        ; D0.B = $00
    NEG.B   D0              ; D0.B = 0 (no change)
                            ; Flags: N=0, Z=1, V=0, C=0, X=0

    ; 15d. NEG.B - overflow case ($80 = -128, can't represent +128)
    MOVE.B  #$80, D0        ; D0.B = $80 (-128)
    NEG.B   D0              ; D0.B = $80 (stays -128, overflow!)
                            ; Flags: N=1, Z=0, V=1, C=1, X=1

    ; 15e. NEG.W
    MOVE.W  #$0100, D1      ; D1.W = $0100 (+256)
    NEG.W   D1              ; D1.W = $FF00 (-256)
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 15f. NEG.L
    MOVE.L  #$00001000, D2  ; D2 = $00001000
    NEG.L   D2              ; D2 = $FFFFF000
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 15g. NEG of memory operand
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0005, (A0)    ; Mem[$3000] = $0005
    NEG.W   (A0)            ; Mem[$3000] = $FFFB
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; --- NEGX: Negate with Extend ---
    ; NEGX Dn is equivalent to 0 - Dn - X

    ; 16a. NEGX.B - X=0
    MOVE.W  #$0000, CCR     ; Clear flags, X=0
    MOVE.B  #$05, D0        ; D0.B = $05
    NEGX.B  D0              ; D0.B = 0 - $05 - X(0) = $FB
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 16b. NEGX.B - X=1
    MOVE.W  #$0010, CCR     ; Set X=1
    MOVE.B  #$05, D0        ; D0.B = $05
    NEGX.B  D0              ; D0.B = 0 - $05 - X(1) = $FA
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 16c. NEGX.B - zero with X=0 (Z flag preserved if result is zero)
    MOVE.W  #$0004, CCR     ; Z=1, X=0
    MOVE.B  #$00, D0        ; D0.B = $00
    NEGX.B  D0              ; D0.B = 0 - 0 - 0 = 0; Z stays 1 (not cleared)
                            ; Flags: N=0, Z=1, V=0, C=0, X=0

    ; 16d. NEGX.B - zero with X=1
    MOVE.W  #$0010, CCR     ; X=1
    MOVE.B  #$00, D0        ; D0.B = $00
    NEGX.B  D0              ; D0.B = 0 - 0 - X(1) = $FF
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 16e. NEGX.L - multi-precision negate high word (after low word)
    MOVE.W  #$0000, CCR     ; Clear X
    MOVE.L  #$00000000, D0  ; Low long = 0
    NEGX.L  D0              ; D0 = 0 - 0 - 0 = 0, X=0, Z preserved=1
    MOVE.L  #$00000001, D1  ; High long = 1
    NEGX.L  D1              ; D1 = 0 - 1 - X(0) = $FFFFFFFF
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; --- EXT: Sign Extend ---

    ; 17a. EXT.W - sign-extend byte to word (positive)
    MOVE.L  #$00000042, D0  ; D0 = $00000042 (D0.B = $42, bit7=0)
    EXT.W   D0              ; D0.W = $0042 (bit7=0, zero-fill)
                            ; D0 = $00000042
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 17b. EXT.W - sign-extend byte to word (negative)
    MOVE.L  #$000000FF, D1  ; D1.B = $FF (bit7=1, i.e. -1)
    EXT.W   D1              ; D1.W = $FFFF (sign-extended)
                            ; D1 = $0000FFFF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 17c. EXT.W - negative byte $80 (-128)
    MOVE.L  #$00000080, D2  ; D2.B = $80
    EXT.W   D2              ; D2.W = $FF80
                            ; D2 = $0000FF80
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 17d. EXT.L - sign-extend word to long (positive)
    MOVE.L  #$00007FFF, D3  ; D3.W = $7FFF (+32767)
    EXT.L   D3              ; D3 = $00007FFF
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 17e. EXT.L - sign-extend word to long (negative)
    MOVE.L  #$0000FFFF, D4  ; D4.W = $FFFF (-1 signed)
    EXT.L   D4              ; D4 = $FFFFFFFF (-1 as 32-bit)
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 17f. EXT.L - sign-extend word $8000 (-32768)
    MOVE.L  #$00008000, D5  ; D5.W = $8000
    EXT.L   D5              ; D5 = $FFFF8000
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 17g. EXT.W producing zero
    MOVE.L  #$00000000, D6  ; D6.B = $00
    EXT.W   D6              ; D6.W = $0000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; --- CLR: Clear Operand ---

    ; 18a. CLR.B
    MOVE.L  #$12345678, D0  ; D0 = $12345678
    CLR.B   D0              ; D0 = $12345600
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 18b. CLR.W
    MOVE.L  #$12345678, D1  ; D1 = $12345678
    CLR.W   D1              ; D1 = $12340000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 18c. CLR.L
    MOVE.L  #$12345678, D2  ; D2 = $12345678
    CLR.L   D2              ; D2 = $00000000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 18d. CLR in memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.L  #$DEADBEEF, (A0) ; Mem[$3000] = $DEADBEEF
    CLR.W   (A0)            ; Mem[$3000].W = $0000 -> Mem[$3000] = $0000BEEF
                            ; Flags: N=0, Z=1, V=0, C=0

;=======================================================
; SECTION 5: COMPARE FAMILY
;=======================================================

    ; --- CMP: Compare (Dn - src, only flags affected) ---

    ; 19a. CMP.B - equal values
    MOVE.B  #$42, D0        ; D0.B = $42
    MOVE.B  #$42, D1        ; D1.B = $42
    CMP.B   D1, D0          ; $42 - $42 = 0
                            ; Flags: N=0, Z=1, V=0, C=0
                            ; D0 UNCHANGED = $42

    ; 19b. CMP.B - Dn > src (no borrow)
    MOVE.B  #$50, D0        ; D0.B = $50
    MOVE.B  #$30, D1        ; D1.B = $30
    CMP.B   D1, D0          ; $50 - $30 = $20 (positive)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 19c. CMP.B - Dn < src (borrow)
    MOVE.B  #$30, D0        ; D0.B = $30
    MOVE.B  #$50, D1        ; D1.B = $50
    CMP.B   D1, D0          ; $30 - $50 = $E0 (borrow)
                            ; Flags: N=1, Z=0, V=0, C=1

    ; 19d. CMP.B - signed overflow
    MOVE.B  #$80, D0        ; D0.B = $80 (-128)
    MOVE.B  #$01, D1        ; D1.B = $01
    CMP.B   D1, D0          ; $80 - $01 = $7F (V=1: neg - pos = pos)
                            ; Flags: N=0, Z=0, V=1, C=0

    ; 19e. CMP.W
    MOVE.W  #$1234, D0      ; D0.W = $1234
    MOVE.W  #$1234, D1      ; D1.W = $1234
    CMP.W   D1, D0          ; Equal
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 19f. CMP.L
    MOVE.L  #$00001000, D0  ; D0 = $00001000
    MOVE.L  #$00002000, D1  ; D1 = $00002000
    CMP.L   D1, D0          ; $1000 - $2000 (borrow)
                            ; Flags: N=1, Z=0, V=0, C=1

    ; 19g. CMP with memory source
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$ABCD, (A0)    ; Mem[$3000] = $ABCD
    MOVE.W  #$ABCD, D0      ; D0.W = $ABCD
    CMP.W   (A0), D0        ; $ABCD - $ABCD = 0
                            ; Flags: N=0, Z=1, V=0, C=0

    ; --- CMPA: Compare Address Register ---
    ; Note: Always full 32-bit comparison. Does NOT update the CCR X flag.

    ; 20a. CMPA.W - source word sign-extended, equal
    MOVEA.L #$00003000, A0  ; A0 = $00003000
    MOVE.W  #$3000, D0      ; D0.W = $3000 (sign-extended = $00003000)
    CMPA.W  D0, A0          ; $00003000 - $00003000 = 0
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 20b. CMPA.W - with negative sign-extension
    MOVEA.L #$FFFFFF00, A0  ; A0 = $FFFFFF00
    MOVE.W  #$FF00, D0      ; D0.W = $FF00 (sign-extended = $FFFFFF00)
    CMPA.W  D0, A0          ; $FFFFFF00 - $FFFFFF00 = 0
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 20c. CMPA.L - A0 > A1
    MOVEA.L #$00005000, A0  ; A0 = $5000
    MOVEA.L #$00003000, A1  ; A1 = $3000
    CMPA.L  A1, A0          ; $5000 - $3000 = $2000 (positive)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 20d. CMPA.L - A0 < A1
    MOVEA.L #$00003000, A0  ; A0 = $3000
    MOVEA.L #$00005000, A1  ; A1 = $5000
    CMPA.L  A1, A0          ; $3000 - $5000 (borrow)
                            ; Flags: N=1, Z=0, V=0, C=1

    ; --- CMPI: Compare Immediate ---

    ; 21a. CMPI.B - equal
    MOVE.B  #$7F, D0        ; D0.B = $7F
    CMPI.B  #$7F, D0        ; $7F - $7F = 0
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 21b. CMPI.W - less than
    MOVE.W  #$0100, D1      ; D1.W = $0100
    CMPI.W  #$0200, D1      ; $0100 - $0200 (borrow)
                            ; Flags: N=1, Z=0, V=0, C=1

    ; 21c. CMPI.L - greater than
    MOVE.L  #$00003000, D2  ; D2 = $3000
    CMPI.L  #$00001000, D2  ; $3000 - $1000 = $2000
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 21d. CMPI to memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$1234, (A0)    ; Mem[$3000] = $1234
    CMPI.W  #$1234, (A0)    ; $1234 - $1234 = 0
                            ; Flags: N=0, Z=1, V=0, C=0

    ; --- CMPM: Compare Memory to Memory (postincrement only) ---

    ; 22a. CMPM.B - equal bytes
    MOVEA.L #$3000, A0      ; Source pointer
    MOVEA.L #$3010, A1      ; Destination pointer
    MOVE.B  #$AB, (A0)      ; Mem[$3000] = $AB
    MOVE.B  #$AB, (A1)      ; Mem[$3010] = $AB
    CMPM.B  (A0)+, (A1)+    ; Compare Mem[$3000] - Mem[$3010]: $AB - $AB = 0
                            ; A0 = $3001, A1 = $3011
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 22b. CMPM.W - src > dst
    MOVEA.L #$3000, A0      ; Reset source pointer
    MOVEA.L #$3010, A1      ; Reset destination pointer
    MOVE.W  #$5000, (A0)    ; Mem[$3000] = $5000 (src = compare operand)
    MOVE.W  #$3000, (A1)    ; Mem[$3010] = $3000 (dst = register operand)
    CMPM.W  (A0)+, (A1)+    ; Mem[$3010] - Mem[$3000]: $3000 - $5000 (borrow)
                            ; A0 = $3002, A1 = $3012
                            ; Flags: N=1, Z=0, V=0, C=1

    ; 22c. CMPM.L - scanning an array for a match
    MOVEA.L #$3020, A0      ; Source array pointer
    MOVEA.L #$3030, A1      ; Destination array pointer
    MOVE.L  #$DEADBEEF, $3020 ; Source[0]
    MOVE.L  #$DEADBEEF, $3030 ; Dest[0]
    CMPM.L  (A0)+, (A1)+    ; Compare longs: $DEADBEEF - $DEADBEEF = 0
                            ; Flags: N=0, Z=1, V=0, C=0

    ; --- TST: Test an Operand (sets flags, doesn't modify data) ---

    ; 23a. TST.B - positive (non-zero)
    MOVE.B  #$42, D0        ; D0.B = $42
    TST.B   D0              ; Test D0.B: N=0 (bit7=0), Z=0 (non-zero)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 23b. TST.B - zero
    MOVE.B  #$00, D1        ; D1.B = $00
    TST.B   D1              ; Test D1.B: Z=1
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 23c. TST.B - negative (bit 7 set)
    MOVE.B  #$FF, D2        ; D2.B = $FF (-1 signed)
    TST.B   D2              ; Test D2.B: N=1 (bit7=1), Z=0
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 23d. TST.W - positive word
    MOVE.W  #$1234, D3      ; D3.W = $1234
    TST.W   D3              ; N=0 (bit15=0), Z=0
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 23e. TST.W - negative word
    MOVE.W  #$8000, D4      ; D4.W = $8000 (most-negative 16-bit)
    TST.W   D4              ; N=1 (bit15=1), Z=0
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 23f. TST.W - zero
    MOVE.W  #$0000, D5      ; D5.W = $0000
    TST.W   D5              ; Z=1
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 23g. TST.L - positive long
    MOVE.L  #$00ABCDEF, D6  ; D6 = $00ABCDEF
    TST.L   D6              ; N=0, Z=0
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 23h. TST.L - negative long
    MOVE.L  #$80000000, D7  ; D7 = $80000000 (most-negative 32-bit)
    TST.L   D7              ; N=1, Z=0
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 23i. TST of memory operand
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.L  #$00000000, (A0) ; Mem[$3000] = 0
    TST.L   (A0)            ; Z=1
                            ; Flags: N=0, Z=1, V=0, C=0

;=======================================================
; END OF TEST SUITE
;=======================================================

SIMHALT:
    BRA.S   SIMHALT         ; Loop forever (halt simulation)

    END     START