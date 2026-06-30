;-------------------------------------------------------
; M68K Example - Stack Operations
; Demonstrates push/pop with A7 and a simple subroutine call
;-------------------------------------------------------

    ORG     $1000

START:
    MOVEA.L #$2000, A7      ; Initialize stack pointer

    MOVE.L  #$11111111, D0
    MOVE.L  #$22222222, D1

    MOVE.L  D0, -(A7)       ; push D0
    MOVE.L  D1, -(A7)       ; push D1

    MOVE.L  (A7)+, D2       ; pop -> D2 (gets D1)
    MOVE.L  (A7)+, D3       ; pop -> D3 (gets D0)

    BSR     ADD_VALUES
    BRA     STACK_DONE

ADD_VALUES:
    MOVE.L  D2, D4
    ADD.L   D3, D4          ; D4 = D2 + D3
    RTS

STACK_DONE:
    BRA     END

END:
    END     START
