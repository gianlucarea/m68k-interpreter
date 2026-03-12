; M68K Instruction Set Test Suite
; Tests all supported instructions

ORG $1000

; ===== ARITHMETIC INSTRUCTIONS =====
; ADD
    MOVE #10, D0
    MOVE #5, D1
    ADD D1, D0          ; D0 = 15

; ADDA
    MOVE #100, A0
    MOVE #50, A1
    ADDA A1, A0         ; A0 = 150

; ADDI
    MOVE #20, D2
    ADDI #15, D2        ; D2 = 35

; ADDQ
    MOVE #30, D3
    ADDQ #5, D3         ; D3 = 35

; SUB
    MOVE #20, D4
    MOVE #8, D5
    SUB D5, D4          ; D4 = 12

; SUBA
    MOVE #200, A2
    MOVE #50, A3
    SUBA A3, A2         ; A2 = 150

; SUBI
    MOVE #50, D6
    SUBI #15, D6        ; D6 = 35

; SUBQ
    MOVE #40, D7
    SUBQ #10, D7        ; D7 = 30

; MULS (Signed multiply)
    MOVE #6, D0
    MOVE #7, D1
    MULS D1, D0         ; D0 = 42

; DIVS (Signed divide)
    MOVE #100, D2
    MOVE #4, D3
    DIVS D3, D2         ; D2 = 25 (quotient)

; ===== LOGIC INSTRUCTIONS =====
; AND
    MOVE #$FF, D0
    MOVE #$0F, D1
    AND D1, D0          ; D0 = $0F

; ANDI
    MOVE #$FF, D2
    ANDI #$F0, D2       ; D2 = $F0

; OR
    MOVE #$F0, D3
    MOVE #$0F, D4
    OR D4, D3           ; D3 = $FF

; ORI
    MOVE #$F0, D5
    ORI #$0F, D5        ; D5 = $FF

; EOR (XOR)
    MOVE #$FF, D6
    MOVE #$0F, D7
    EOR D7, D6          ; D6 = $F0

; EORI
    MOVE #$FF, D0
    EORI #$0F, D0       ; D0 = $F0

; NOT (Complement)
    MOVE #$0000, D1
    NOT D1              ; D1 = $FFFF

; NEG (Negate - twos complement)
    MOVE #10, D2
    NEG D2              ; D2 = -10 (0xFFFFFFF6)

; ===== BASIC OPERATIONS =====
; MOVE
    MOVE #100, D0       ; Move immediate to D0
    MOVE D0, D1         ; Move D0 to D1
    MOVE D0, A0         ; Move D0 to A0

; MOVEA
    MOVE #500, D3
    MOVEA D3, A1        ; Move to address register

; CLR
    MOVE #999, D4
    CLR D4              ; D4 = 0

; EXG (Exchange)
    MOVE #10, D5
    MOVE #20, D6
    EXG D5, D6          ; D5=20, D6=10

; SWAP (Exchange word halves)
    MOVE #$12345678, D7
    SWAP D7             ; D7 = $56781234

; EXT (Sign extend)
    MOVE #$FF, D0
    EXT D0              ; D0 = $FFFFFFFF (sign extended from byte to word/long)

; LEA (Load Effective Address)
    LEA $2000, A0       ; A0 = $2000

; ===== SHIFT INSTRUCTIONS =====
; ASL (Arithmetic Shift Left)
    MOVE #5, D0
    ASL #2, D0          ; D0 = 20

; ASR (Arithmetic Shift Right)
    MOVE #20, D1
    ASR #2, D1          ; D1 = 5

; LSL (Logical Shift Left)
    MOVE #5, D2
    LSL #2, D2          ; D2 = 20

; LSR (Logical Shift Right)
    MOVE #20, D3
    LSR #2, D3          ; D3 = 5

; ROL (Rotate Left)
    MOVE #$80000000, D4
    ROL #1, D4          ; D4 = $00000001

; ROR (Rotate Right)
    MOVE #$00000001, D5
    ROR #1, D5          ; D5 = $80000000

; ROXL (Rotate with Extend Left)
    MOVE #$80000000, D6
    ROXL #1, D6         ; D6 with extend

; ROXR (Rotate with Extend Right)
    MOVE #$00000001, D7
    ROXR #1, D7         ; D7 with extend

; ===== COMPARISON INSTRUCTIONS =====
; CMP (Compare)
    MOVE #10, D0
    MOVE #10, D1
    CMP D1, D0          ; Set flags (Z flag set since equal)

; CMPA
    MOVE #100, A0
    MOVE #100, A1
    CMPA A1, A0         ; Compare address registers

; CMPI
    MOVE #50, D2
    CMPI #50, D2        ; Compare immediate

; TST (Test)
    MOVE #0, D3
    TST D3              ; Test D3 (Z flag set)

; ===== CONTROL FLOW =====
; Simple jump test
    JMP END_JUMP
    MOVE #999, D0       ; This should be skipped
END_JUMP:
    MOVE #111, D0       ; D0 = 111

; BRA (Branch Always)
    BRA END_BRA
    MOVE #999, D1       ; This should be skipped
END_BRA:
    MOVE #222, D1       ; D1 = 222

; BEQ (Branch if Equal)
    MOVE #5, D2
    MOVE #5, D3
    CMP D3, D2
    BEQ EQUAL_FOUND
    MOVE #999, D3       ; Skipped
EQUAL_FOUND:
    MOVE #333, D3       ; D3 = 333

; BNE (Branch if Not Equal)
    MOVE #5, D4
    MOVE #6, D5
    CMP D5, D4
    BNE NOT_EQUAL
    MOVE #999, D4       ; Skipped
NOT_EQUAL:
    MOVE #444, D4       ; D4 = 444

; BGE (Branch if Greater or Equal)
    MOVE #10, D6
    MOVE #5, D7
    CMP D7, D6
    BGE GE_TRUE
    MOVE #999, D6       ; Skipped
GE_TRUE:
    MOVE #555, D6       ; D6 = 555

; BGT (Branch if Greater Than)
    MOVE #10, D0
    MOVE #5, D1
    CMP D1, D0
    BGT GT_TRUE
    MOVE #999, D0       ; Skipped
GT_TRUE:
    MOVE #666, D0       ; D0 = 666

; BLE (Branch if Less Than or Equal)
    MOVE #5, D2
    MOVE #5, D3
    CMP D3, D2
    BLE LE_TRUE
    MOVE #999, D2       ; Skipped
LE_TRUE:
    MOVE #777, D2       ; D2 = 777

; BLT (Branch if Less Than)
    MOVE #3, D4
    MOVE #5, D5
    CMP D5, D4
    BLT LT_TRUE
    MOVE #999, D4       ; Skipped
LT_TRUE:
    MOVE #888, D4       ; D4 = 888

; JSR and RTS (Jump to subroutine and Return)
    JSR TEST_SUB
    MOVE #1000, D6      ; After subroutine

    JMP PROGRAM_END

TEST_SUB:
    MOVE #999, D7       ; Test value
    RTS                 ; Return from subroutine

PROGRAM_END:
    RTS                 ; End of program
