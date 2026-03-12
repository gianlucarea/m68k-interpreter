; ==============================================================================
; TEST 7: JUMP INSTRUCTIONS (JMP, JSR, RTS)
; ==============================================================================

ORG $1000

; JMP - Unconditional Jump
    JMP JUMP_TARGET
    MOVE #999, D0       ; This should be skipped
JUMP_TARGET:
    MOVE #111, D0       ; Expected: D0 = 111

; JSR - Jump to Subroutine
    JSR MY_SUBROUTINE
    MOVE #222, D1       ; Executed after subroutine returns

    JMP END_PROGRAM

; Subroutine
MY_SUBROUTINE:
    MOVE #333, D2       ; Expected: D2 = 333
    RTS                 ; Return from subroutine

END_PROGRAM:
    RTS
