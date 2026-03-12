; ==============================================================================
; TEST 1: ARITHMETIC INSTRUCTIONS
; ==============================================================================

ORG $1000

; ADD - Add register to register
    MOVE #10, D0
    MOVE #5, D1
    ADD D1, D0          ; Expected: D0 = 15

; ADDA - Add to address register
    MOVE #100, A0
    MOVE #50, A1
    ADDA A1, A0         ; Expected: A0 = 150

; ADDI - Add immediate
    MOVE #20, D2
    ADDI #15, D2        ; Expected: D2 = 35

; ADDQ - Add quick (immediate 1-8)
    MOVE #30, D3
    ADDQ #5, D3         ; Expected: D3 = 35

; SUB - Subtract
    MOVE #20, D4
    MOVE #8, D5
    SUB D5, D4          ; Expected: D4 = 12

; SUBA - Subtract from address register
    MOVE #200, A2
    MOVE #50, A3
    SUBA A3, A2         ; Expected: A2 = 150

; SUBI - Subtract immediate
    MOVE #50, D6
    SUBI #15, D6        ; Expected: D6 = 35

; SUBQ - Subtract quick
    MOVE #40, D7
    SUBQ #10, D7        ; Expected: D7 = 30

    RTS
