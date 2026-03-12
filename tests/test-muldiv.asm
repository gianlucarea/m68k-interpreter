; ==============================================================================
; TEST 8: MULTIPLICATION AND DIVISION
; ==============================================================================

ORG $1000

; MULS - Signed Multiply
    MOVE #6, D0
    MOVE #7, D1
    MULS D1, D0         ; Expected: D0 = 42

; MULS - Negative result
    MOVE #-6, D2
    MOVE #7, D3
    MULS D3, D2         ; Expected: D2 = -42

; DIVS - Signed Division
    MOVE #100, D4
    MOVE #4, D5
    DIVS D5, D4         ; Expected: D4 = 25 (quotient in low word, remainder in high word)

; DIVS - Division with remainder
    MOVE #23, D6
    MOVE #5, D7
    DIVS D7, D6         ; Expected: quotient = 4, remainder = 3

END
