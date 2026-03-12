; ==============================================================================
; M68K COMPREHENSIVE INSTRUCTION SET TEST
; ==============================================================================
; This file tests all 45 supported M68K instructions
; Expected execution: All instructions complete without errors
; Verify by checking register values after execution
; ==============================================================================

ORG $1000

; ==============================================================================
; SECTION 1: ARITHMETIC (8 instructions)
; ==============================================================================
section_arithmetic:
    ; ADD - Add register to register
    MOVE #10, D0
    MOVE #5, D1
    ADD D1, D0              ; D0 = 15

    ; ADDA - Add to address register
    MOVE #100, A0
    MOVE #50, A1
    ADDA A1, A0             ; A0 = 150

    ; ADDI - Add immediate
    MOVE #20, D2
    ADDI #15, D2            ; D2 = 35

    ; ADDQ - Add quick (1-8)
    MOVE #30, D3
    ADDQ #5, D3             ; D3 = 35

    ; SUB - Subtract register from register
    MOVE #20, D4
    MOVE #8, D5
    SUB D5, D4              ; D4 = 12

    ; SUBA - Subtract from address register
    MOVE #200, A2
    MOVE #50, A3
    SUBA A3, A2             ; A2 = 150

    ; SUBI - Subtract immediate
    MOVE #50, D6
    SUBI #15, D6            ; D6 = 35

    ; SUBQ - Subtract quick
    MOVE #40, D7
    SUBQ #10, D7            ; D7 = 30

; ==============================================================================
; SECTION 2: MULTIPLICATION & DIVISION (2 instructions)
; ==============================================================================
section_muldiv:
    ; MULS - Signed multiply
    MOVE #6, D0
    MOVE #7, D1
    MULS D1, D0             ; D0 = 42

    ; DIVS - Signed divide
    MOVE #100, D2
    MOVE #4, D3
    DIVS D3, D2             ; D2 = 25 (quotient)

; ==============================================================================
; SECTION 3: LOGIC (8 instructions)
; ==============================================================================
section_logic:
    ; AND - Bitwise AND
    MOVE #$FF, D0
    MOVE #$0F, D1
    AND D1, D0              ; D0 = $0F

    ; ANDI - AND immediate
    MOVE #$FF, D2
    ANDI #$F0, D2           ; D2 = $F0

    ; OR - Bitwise OR
    MOVE #$F0, D3
    MOVE #$0F, D4
    OR D4, D3               ; D3 = $FF

    ; ORI - OR immediate
    MOVE #$F0, D5
    ORI #$0F, D5            ; D5 = $FF

    ; EOR - Exclusive OR (XOR)
    MOVE #$FF, D6
    MOVE #$0F, D7
    EOR D7, D6              ; D6 = $F0

    ; EORI - XOR immediate
    MOVE #$FF, D0
    EORI #$0F, D0           ; D0 = $F0

    ; NOT - Bitwise complement
    MOVE #$0000, D1
    NOT D1                  ; D1 = $FFFF

    ; NEG - Arithmetic negate
    MOVE #10, D2
    NEG D2                  ; D2 = -10

; ==============================================================================
; SECTION 4: BASIC OPERATIONS (7 instructions)
; ==============================================================================
section_basic:
    ; MOVE - Move immediate to register
    MOVE #100, D0           ; D0 = 100

    ; MOVE - Register to register
    MOVE D0, D1             ; D1 = 100

    ; MOVEA - Move to address register
    MOVE #500, D3
    MOVEA D3, A1            ; A1 = 500

    ; CLR - Clear register
    MOVE #999, D4
    CLR D4                  ; D4 = 0

    ; EXG - Exchange registers
    MOVE #10, D5
    MOVE #20, D6
    EXG D5, D6              ; D5 = 20, D6 = 10

    ; SWAP - Swap word halves
    MOVE #$12345678, D7
    SWAP D7                 ; D7 = $56781234

    ; EXT - Sign extend byte to word/long
    MOVE #$FF, D0
    EXT D0                  ; D0 = $FFFFFFFF

    ; LEA - Load effective address
    LEA $2000, A2           ; A2 = $2000

; ==============================================================================
; SECTION 5: SHIFT INSTRUCTIONS (6 instructions)
; ==============================================================================
section_shifts:
    ; ASL - Arithmetic shift left
    MOVE #5, D0
    ASL #2, D0              ; D0 = 20

    ; ASR - Arithmetic shift right
    MOVE #20, D1
    ASR #2, D1              ; D1 = 5

    ; LSL - Logical shift left
    MOVE #5, D2
    LSL #2, D2              ; D2 = 20

    ; LSR - Logical shift right
    MOVE #20, D3
    LSR #2, D3              ; D3 = 5

    ; ROL - Rotate left
    MOVE #$80000000, D4
    ROL #1, D4              ; D4 = $00000001

    ; ROR - Rotate right
    MOVE #$00000001, D5
    ROR #1, D5              ; D5 = $80000000

; ==============================================================================
; SECTION 6: COMPARISON INSTRUCTIONS (4 instructions)
; ==============================================================================
section_compare:
    ; CMP - Compare registers
    MOVE #10, D0
    MOVE #10, D1
    CMP D1, D0              ; Z flag set (equal)

    ; CMPA - Compare address registers
    MOVE #100, A0
    MOVE #100, A1
    CMPA A1, A0             ; Z flag set

    ; CMPI - Compare immediate
    MOVE #50, D2
    CMPI #50, D2            ; Z flag set

    ; TST - Test register
    MOVE #100, D3
    TST D3                  ; Z flag clear (non-zero)

; ==============================================================================
; SECTION 7: BRANCH INSTRUCTIONS (7 instructions)
; ==============================================================================
section_branches:
    ; BRA - Branch always
    BRA after_bra
    MOVE #999, D0           ; Skipped
after_bra:
    MOVE #111, D0           ; D0 = 111

    ; BEQ - Branch if equal
    MOVE #5, D1
    MOVE #5, D2
    CMP D2, D1
    BEQ after_beq
    MOVE #999, D1           ; Skipped
after_beq:
    MOVE #222, D1           ; D1 = 222

    ; BNE - Branch if not equal
    MOVE #5, D3
    MOVE #6, D4
    CMP D4, D3
    BNE after_bne
    MOVE #999, D3           ; Skipped
after_bne:
    MOVE #333, D3           ; D3 = 333

    ; BGE - Branch if greater or equal
    MOVE #10, D5
    MOVE #5, D6
    CMP D6, D5
    BGE after_bge
    MOVE #999, D5           ; Skipped
after_bge:
    MOVE #444, D5           ; D5 = 444

    ; BGT - Branch if greater
    MOVE #10, D0
    MOVE #5, D7
    CMP D7, D0
    BGT after_bgt
    MOVE #999, D0           ; Skipped
after_bgt:
    MOVE #555, D0           ; D0 = 555

    ; BLE - Branch if less or equal
    MOVE #5, D1
    MOVE #5, D2
    CMP D2, D1
    BLE after_ble
    MOVE #999, D1           ; Skipped
after_ble:
    MOVE #666, D1           ; D1 = 666

    ; BLT - Branch if less
    MOVE #3, D3
    MOVE #5, D4
    CMP D4, D3
    BLT after_blt
    MOVE #999, D3           ; Skipped
after_blt:
    MOVE #777, D3           ; D3 = 777

; ==============================================================================
; SECTION 8: JUMP INSTRUCTIONS (3 instructions)
; ==============================================================================
section_jumps:
    ; JMP - Jump
    JMP after_jmp
    MOVE #999, D0           ; Skipped
after_jmp:
    MOVE #888, D0           ; D0 = 888

    ; JSR - Jump to subroutine
    JSR test_subroutine
    MOVE #999, D1           ; Skipped - wait no, this should execute

    JMP end_program

; Subroutine
test_subroutine:
    MOVE #999, D2           ; D2 = 999 (inside subroutine)
    RTS                     ; RTS - Return from subroutine

end_program:
    RTS                     ; Program end
