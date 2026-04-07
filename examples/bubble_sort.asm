;-------------------------------------------------------
; M68K Example - Bubble Sort (Ascending)
; Sorts 5 word values in memory: 7,3,5,9,2 -> 2,3,5,7,9
;-------------------------------------------------------

ORG     $1000
        LEA     ARRAY,A0
        MOVEQ   #4,D4
        MOVEQ   #4,D5
        MOVEQ   #0,D7

OUTER:
        LEA     ARRAY,A0
        MOVEQ   #0,D6

INNER:
        MOVE.W  (A0),D0
        MOVE.W  2(A0),D1
        CMP.W   D1,D0
        BLS     SKIP
        MOVE.W  D1,(A0)
        MOVE.W  D0,2(A0)
SKIP:
        ADDQ.L  #2,A0
        ADDQ.W  #1,D6
        CMP.W   D5,D6
        BNE     INNER
        ADDQ.W  #1,D7
        CMP.W   D4,D7
        BNE     OUTER

ARRAY:  DC.W    7,3,5,9,2
END