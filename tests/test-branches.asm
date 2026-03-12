; ==============================================================================
; TEST 6: BRANCH INSTRUCTIONS
; ==============================================================================

ORG $1000

; BRA - Branch Always
    BRA SKIP_INST
    MOVE #999, D0       ; This should be skipped
SKIP_INST:
    MOVE #111, D0       ; Expected: D0 = 111

; BEQ - Branch if Equal
    MOVE #5, D1
    MOVE #5, D2
    CMP D2, D1
    BEQ EQUAL_FOUND
    MOVE #999, D1       ; Skipped
EQUAL_FOUND:
    MOVE #222, D1       ; Expected: D1 = 222

; BNE - Branch if Not Equal
    MOVE #5, D3
    MOVE #6, D4
    CMP D4, D3
    BNE NOT_EQUAL
    MOVE #999, D3       ; Skipped
NOT_EQUAL:
    MOVE #333, D3       ; Expected: D3 = 333

; BGE - Branch if Greater or Equal
    MOVE #10, D5
    MOVE #5, D6
    CMP D6, D5
    BGE GE_COND
    MOVE #999, D5       ; Skipped
GE_COND:
    MOVE #444, D5       ; Expected: D5 = 444

; BGT - Branch if Greater Than
    MOVE #10, D0
    MOVE #5, D7
    CMP D7, D0
    BGT GT_COND
    MOVE #999, D0       ; Skipped
GT_COND:
    MOVE #555, D0       ; Expected: D0 = 555

; BLE - Branch if Less or Equal
    MOVE #5, D1
    MOVE #5, D2
    CMP D2, D1
    BLE LE_COND
    MOVE #999, D1       ; Skipped
LE_COND:
    MOVE #666, D1       ; Expected: D1 = 666

; BLT - Branch if Less Than
    MOVE #3, D3
    MOVE #5, D4
    CMP D4, D3
    BLT LT_COND
    MOVE #999, D3       ; Skipped
LT_COND:
    MOVE #777, D3       ; Expected: D3 = 777

    RTS
