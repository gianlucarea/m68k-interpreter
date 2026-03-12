; ==============================================================================
; TEST 2: LOGIC INSTRUCTIONS
; ==============================================================================

ORG $1000

; AND - Bitwise AND
    MOVE #$FF, D0
    MOVE #$0F, D1
    AND D1, D0          ; Expected: D0 = $0F (0000 1111)

; ANDI - AND immediate
    MOVE #$FF, D2
    ANDI #$F0, D2       ; Expected: D2 = $F0 (1111 0000)

; OR - Bitwise OR
    MOVE #$F0, D3
    MOVE #$0F, D4
    OR D4, D3           ; Expected: D3 = $FF (1111 1111)

; ORI - OR immediate
    MOVE #$F0, D5
    ORI #$0F, D5        ; Expected: D5 = $FF

; EOR - Exclusive OR (XOR)
    MOVE #$FF, D6
    MOVE #$0F, D7
    EOR D7, D6          ; Expected: D6 = $F0 (1111 0000)

; EORI - XOR immediate
    MOVE #$FF, D0
    EORI #$0F, D0       ; Expected: D0 = $F0

; NOT - Bitwise complement
    MOVE #$0000, D1
    NOT D1              ; Expected: D1 = $FFFF (all bits set)

; NEG - Arithmetic negate (twos complement)
    MOVE #10, D2
    NEG D2              ; Expected: D2 = -10 (0xFFFFFFF6)

END
