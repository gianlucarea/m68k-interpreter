;-------------------------------------------------------
; M68K Example - Factorial (Iterative)
; Computes n! for n=5
; Result: D1 = 120
;-------------------------------------------------------

    ORG     $1000

START:
    MOVEQ   #5, D0          ; n
    MOVEQ   #1, D1          ; result

    CMP.W   #1, D0
    BEQ     FACT_DONE

    TST.W   D0
    BEQ     FACT_DONE

FACT_LOOP:
    MULU.W  D0, D1          ; result *= n
    SUBQ.W  #1, D0          ; n--
    CMP.W   #1, D0
    BNE     FACT_LOOP

FACT_DONE:
    BRA     FACT_DONE

    END     START
