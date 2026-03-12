; ==============================================================================
; TEST 3: BASIC OPERATIONS
; ==============================================================================

ORG $1000

; MOVE - Move immediate to register
    MOVE #100, D0       ; Expected: D0 = 100

; MOVE - Register to register
    MOVE D0, D1         ; Expected: D1 = 100 (same as D0)

; MOVE - Register to address register
    MOVE D0, A0         ; Expected: A0 = 100

; MOVEA - Move to address register
    MOVE #500, D3
    MOVEA D3, A1        ; Expected: A1 = 500

; CLR - Clear register
    MOVE #999, D4
    CLR D4              ; Expected: D4 = 0

; EXG - Exchange
    MOVE #10, D5
    MOVE #20, D6
    EXG D5, D6          ; Expected: D5 = 20, D6 = 10

; SWAP - Exchange word halves
    MOVE #$12345678, D7
    SWAP D7             ; Expected: D7 = $56781234

; EXT - Sign extend
    MOVE #$FF, D0
    EXT D0              ; Expected: D0 = $FFFFFFFF (signed extension)

; LEA - Load effective address
    LEA $2000, A2       ; Expected: A2 = $2000

    RTS
