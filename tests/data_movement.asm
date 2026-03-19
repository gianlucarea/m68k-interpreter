;-------------------------------------------------------
; M68K Emulator Instruction Test Suite
; Target: Motorola 68000
; Initial State Assumption: All Regs = 0, SP = $2000
;-------------------------------------------------------

    ORG     $1000           ; Start code at address $1000

START:
    ; 1. MOVEQ - Move Quick (Sign-extended 8-bit to 32-bit)
    MOVEQ   #$2A, D0        ; D0 = $0000002A (Decimal 42)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 2. MOVE - Standard Data Movement
    MOVE.W  D0, D1          ; D1 = $0000002A (Word move, upper bits of D1 unchanged)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 3. MOVEA - Move Address (Always affects entire 32-bit Address Register)
    MOVEA.L #$00003000, A0  ; A0 = $00003000
                            ; Flags: Unchanged (Address ops don't touch CCR)

    ; 4. LEA - Load Effective Address
    LEA     $10(A0), A1     ; A1 = $00003010 (Calculates A0 + 16)
                            ; Flags: Unchanged

    ; 5. CLR - Clear Operand
    CLR.L   D0              ; D0 = $00000000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 6. EXG - Exchange Registers
    EXG     D1, A0          ; D1 = $00003000, A0 = $0000002A
                            ; Flags: Unchanged

    ; 7. SWAP - Swap Register Halves
    SWAP    D1              ; D1 = $30000000 (Upper $3000 moves to lower)
                            ; Flags: N=0, Z=0, V=0, C=0 (Based on 32-bit result)

    ; 8. PEA - Push Effective Address
    PEA     (A1)            ; Stack Pointer (A7) decreases by 4 ($1FFC)
                            ; Memory at ($1FFC) = $00003010
                            ; Flags: Unchanged

    ; 9. MOVEM - Move Multiple Registers (Pre-decrement mode)
    ; This pushes D1, A0, and A1 onto the stack.
    MOVEM.L D1/A0-A1, -(A7) ; SP decreases by 12 ($1FF0)
                            ; ($1FF0) = D1 ($30000000)
                            ; ($1FF4) = A0 ($0000002A)
                            ; ($1FF8) = A1 ($00003010)
                            ; Flags: Unchanged

    ; 10. MOVEP - Move Peripheral Data (Long word to alternate bytes)
    ; This is the "Odd/Even" byte test.
    MOVEP.L D1, 0(A0)       ; D1 is $30000000, A0 is $2A
                            ; Mem($2A) = $30
                            ; Mem($2C) = $00
                            ; Mem($2E) = $00
                            ; Mem($30) = $00
                            ; Flags: Unchanged

    SIMHALT:                ; Dummy label for end of test
    BRA.S   SIMHALT         ; Loop forever

    END     START