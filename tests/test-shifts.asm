; ==============================================================================
; TEST 4: SHIFT INSTRUCTIONS
; ==============================================================================

ORG $1000

; ASL - Arithmetic Shift Left
    MOVE #5, D0
    ASL #2, D0          ; Expected: D0 = 20 (5 * 2^2)

; ASR - Arithmetic Shift Right
    MOVE #20, D1
    ASR #2, D1          ; Expected: D1 = 5 (20 / 2^2)

; LSL - Logical Shift Left
    MOVE #5, D2
    LSL #2, D2          ; Expected: D2 = 20

; LSR - Logical Shift Right
    MOVE #20, D3
    LSR #2, D3          ; Expected: D3 = 5

; ROL - Rotate Left
    MOVE #$80000000, D4
    ROL #1, D4          ; Expected: D4 = $00000001 (bit rotates left)

; ROR - Rotate Right
    MOVE #$00000001, D5
    ROR #1, D5          ; Expected: D5 = $80000000 (bit rotates right)

; Shift by register count
    MOVE #3, D6
    MOVE #16, D7
    ASL D6, D7          ; Expected: D7 = 128 (16 << 3)

END
