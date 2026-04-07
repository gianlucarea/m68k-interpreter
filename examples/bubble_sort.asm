;-------------------------------------------------------
; M68K Example - Bubble Sort (Ascending)
; Sorts 4 word values in memory: 9,3,7,1 -> 1,3,7,9
;-------------------------------------------------------

    ORG     $1000

START:
    MOVEQ   #3, D7          ; Outer pass counter (n-1)

OUTER_LOOP:
    LEA     ARRAY, A0       ; Start from first element each pass
    MOVEQ   #3, D6          ; Inner comparisons per pass

INNER_LOOP:
    MOVE.W  (A0), D0        ; left
    MOVE.W  2(A0), D1       ; right
    CMP.W   D1, D0
    BLE     NO_SWAP

    MOVE.W  D1, (A0)        ; swap when left > right
    MOVE.W  D0, 2(A0)

NO_SWAP:
    ADDA.L  #2, A0          ; advance to next pair
    SUBQ.W  #1, D6
    BNE     INNER_LOOP

    SUBQ.W  #1, D7
    BNE     OUTER_LOOP

SORT_DONE:
    BRA     SORT_DONE

ARRAY:
    DC.W    9, 3, 7, 1

    END     START
