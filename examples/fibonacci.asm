;-------------------------------------------------------
; M68K Example - Fibonacci (Iterative)
; Computes Fibonacci(n) for n=8
; Result: D4 = 21
;-------------------------------------------------------

    ORG     $1000

START:
    MOVEQ   #8, D0          ; n
    MOVEQ   #0, D1          ; a = F(0)
    MOVEQ   #1, D2          ; b = F(1)

    CMP.W   #0, D0
    BEQ     FIB_STORE_A

    SUBQ.W  #1, D0
    BEQ     FIB_STORE_B

FIB_LOOP:
    MOVE.L  D1, D3          ; next = a + b
    ADD.L   D2, D3
    MOVE.L  D2, D1          ; a = b
    MOVE.L  D3, D2          ; b = next
    SUBQ.W  #1, D0
    BNE     FIB_LOOP

FIB_STORE_B:
    MOVE.L  D2, D4
    BRA     FIB_DONE

FIB_STORE_A:
    MOVE.L  D1, D4

FIB_DONE:
    BRA     FIB_DONE

    END     START
