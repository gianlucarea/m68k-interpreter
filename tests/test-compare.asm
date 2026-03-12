; ==============================================================================
; TEST 5: COMPARISON INSTRUCTIONS
; ==============================================================================

ORG $1000

; CMP - Compare (sets condition codes)
    MOVE #10, D0
    MOVE #10, D1
    CMP D1, D0          ; Expected: Z flag set (equal)

; CMP - Not equal
    MOVE #10, D2
    MOVE #20, D3
    CMP D3, D2          ; Expected: Z flag clear (not equal)

; CMPA - Compare address registers
    MOVE #100, A0
    MOVE #100, A1
    CMPA A1, A0         ; Expected: Z flag set

; CMPI - Compare immediate
    MOVE #50, D4
    CMPI #50, D4        ; Expected: Z flag set

; TST - Test register
    MOVE #0, D5
    TST D5              ; Expected: Z flag set (value is zero)

; TST - Non-zero
    MOVE #100, D6
    TST D6              ; Expected: Z flag clear (value is non-zero)

    RTS
