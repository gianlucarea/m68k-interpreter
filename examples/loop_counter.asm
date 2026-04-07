;-------------------------------------------------------
; M68K Example - Loop Counter
; Sums values 10 + 9 + ... + 1
; Result: D1 = 55
;-------------------------------------------------------

    ORG     $1000

START:
    MOVEQ   #10, D0         ; Counter
    MOVEQ   #0, D1          ; Accumulator

COUNT_LOOP:
    ADD.W   D0, D1
    SUBQ.W  #1, D0
    BNE     COUNT_LOOP

LOOP_DONE:
    BRA     LOOP_DONE

    END     START
