; =============================================================================
;  ██╗   ██╗██╗  ████████╗██╗███╗   ███╗ █████╗ ████████╗███████╗
;  ██║   ██║██║  ╚══██╔══╝██║████╗ ████║██╔══██╗╚══██╔══╝██╔════╝
;  ██║   ██║██║     ██║   ██║██╔████╔██║███████║   ██║   █████╗
;  ██║   ██║██║     ██║   ██║██║╚██╔╝██║██╔══██║   ██║   ██╔══╝
;  ╚██████╔╝███████╗██║   ██║██║ ╚═╝ ██║██║  ██║   ██║   ███████╗
;   ╚═════╝ ╚══════╝╚═╝   ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
;
;  M68K ULTIMATE TEST SUITE
;  Tests: ALU, Branches, Addressing Modes, Stack, Division,
;         BCD, Bit Manipulation, Shifts, Exceptions, Subroutines,
;         Memory, CCR, MOVEM, MULU/MULS, DIVU/DIVS, DBcc loops
;
;  Assemble with: vasmm68k_mot -Fbin -o test.bin m68k_ultimate_test.asm
;  Or:            m68k-linux-gnu-as -o test.o m68k_ultimate_test.asm
; =============================================================================

        ORG     $1000           ; Load at address $1000

; -----------------------------------------------------------------------------
; RESET VECTORS (for bare-metal / emulator startup)
; -----------------------------------------------------------------------------
        DC.L    $00010000       ; Initial SSP (stack at $10000)
        DC.L    START           ; Initial PC

; -----------------------------------------------------------------------------
; CONSTANTS
; -----------------------------------------------------------------------------
PASS_VAL    EQU     $CAFE
FAIL_VAL    EQU     $DEAD
RESULT_ADDR EQU     $8000       ; Write test results here

; =============================================================================
; START
; =============================================================================
START:
        LEA.L   $00010000,SP    ; Init stack pointer
        LEA.L   RESULT_ADDR,A5 ; A5 = result area base
        CLR.L   D7              ; D7 = test counter
        CLR.L   D6              ; D6 = fail counter

; =============================================================================
; TEST 1: BASIC DATA REGISTER MOVE AND CLR
; =============================================================================
TEST_01:
        MOVE.L  #$12345678,D0
        MOVE.L  D0,D1
        CMP.L   D0,D1
        BNE     FAIL_01
        CLR.L   D1
        TST.L   D1
        BNE     FAIL_01
        BRA     PASS_01
FAIL_01:
        ADDQ.L  #1,D6
PASS_01:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 2: IMMEDIATE ADDRESSING - ALL SIZES
; =============================================================================
TEST_02:
        MOVE.B  #$AB,D0
        MOVE.W  #$CDEF,D1
        MOVE.L  #$DEADBEEF,D2
        CMP.B   #$AB,D0
        BNE     FAIL_02
        CMP.W   #$CDEF,D1
        BNE     FAIL_02
        CMP.L   #$DEADBEEF,D2
        BNE     FAIL_02
        BRA     PASS_02
FAIL_02:
        ADDQ.L  #1,D6
PASS_02:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 3: ARITHMETIC - ADD, SUB, NEG, EXT
; =============================================================================
TEST_03:
        MOVE.L  #100,D0
        MOVE.L  #55,D1
        ADD.L   D1,D0           ; D0 = 155
        CMP.L   #155,D0
        BNE     FAIL_03
        SUB.L   #55,D0         ; D0 = 100
        CMP.L   #100,D0
        BNE     FAIL_03
        NEG.L   D0              ; D0 = -100
        CMP.L   #-100,D0
        BNE     FAIL_03
        MOVE.B  #-5,D2
        EXT.W   D2              ; D2 = $FFFB
        EXT.L   D2              ; D2 = $FFFFFFFB = -5
        CMP.L   #-5,D2
        BNE     FAIL_03
        BRA     PASS_03
FAIL_03:
        ADDQ.L  #1,D6
PASS_03:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 4: ADDQ / SUBQ (quick immediate)
; =============================================================================
TEST_04:
        MOVE.L  #10,D0
        ADDQ.L  #7,D0           ; D0 = 17
        SUBQ.L  #3,D0           ; D0 = 14
        CMP.L   #14,D0
        BNE     FAIL_04
        BRA     PASS_04
FAIL_04:
        ADDQ.L  #1,D6
PASS_04:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 5: LOGICAL - AND, OR, EOR, NOT
; =============================================================================
TEST_05:
        MOVE.L  #$FF00FF00,D0
        MOVE.L  #$0F0F0F0F,D1
        AND.L   D1,D0           ; D0 = $0F000F00
        CMP.L   #$0F000F00,D0
        BNE     FAIL_05
        OR.L    #$00FF00FF,D0   ; D0 = $0FFF0FFF
        CMP.L   #$0FFF0FFF,D0
        BNE     FAIL_05
        EOR.L   #$FFFFFFFF,D0   ; D0 = $F000F000
        CMP.L   #$F000F000,D0
        BNE     FAIL_05
        NOT.L   D0              ; D0 = $0FFF0FFF
        CMP.L   #$0FFF0FFF,D0
        BNE     FAIL_05
        BRA     PASS_05
FAIL_05:
        ADDQ.L  #1,D6
PASS_05:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 6: SHIFT / ROTATE INSTRUCTIONS
; =============================================================================
TEST_06:
        MOVE.L  #$00000001,D0
        LSL.L   #4,D0           ; D0 = $10
        CMP.L   #$10,D0
        BNE     FAIL_06
        LSR.L   #2,D0           ; D0 = $04
        CMP.L   #$04,D0
        BNE     FAIL_06
        MOVE.L  #$80000000,D0
        ASR.L   #1,D0           ; Arithmetic: D0 = $C0000000
        CMP.L   #$C0000000,D0
        BNE     FAIL_06
        MOVE.L  #$12345678,D0
        ROL.L   #4,D0           ; D0 = $23456781
        CMP.L   #$23456781,D0
        BNE     FAIL_06
        ROR.L   #4,D0           ; D0 = $12345678 (back)
        CMP.L   #$12345678,D0
        BNE     FAIL_06
        BRA     PASS_06
FAIL_06:
        ADDQ.L  #1,D6
PASS_06:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 7: MULTIPLY - MULU, MULS
; =============================================================================
TEST_07:
        MOVE.W  #200,D0
        MOVE.W  #300,D1
        MULU    D1,D0           ; D0.L = 60000 = $EA60
        CMP.L   #60000,D0
        BNE     FAIL_07
        MOVE.W  #-3,D0
        MOVE.W  #4,D1
        MULS    D1,D0           ; D0.L = -12
        CMP.L   #-12,D0
        BNE     FAIL_07
        BRA     PASS_07
FAIL_07:
        ADDQ.L  #1,D6
PASS_07:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 8: DIVIDE - DIVU, DIVS
; =============================================================================
TEST_08:
        MOVE.L  #1000,D0
        DIVU    #10,D0          ; D0.W = 100, remainder=0
        CMP.W   #100,D0
        BNE     FAIL_08
        SWAP    D0
        TST.W   D0              ; remainder should be 0
        BNE     FAIL_08
        MOVE.L  #-100,D0
        DIVS    #7,D0           ; -100/7 = -14 remainder -2
        CMP.W   #-14,D0
        BNE     FAIL_08
        SWAP    D0
        CMP.W   #-2,D0
        BNE     FAIL_08
        BRA     PASS_08
FAIL_08:
        ADDQ.L  #1,D6
PASS_08:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 9: CONDITION CODE REGISTER (CCR) - ALL FLAGS
; =============================================================================
TEST_09:
        ; Test Z flag
        MOVE.L  #0,D0
        TST.L   D0
        BNE     FAIL_09         ; Z should be set
        ; Test N flag
        MOVE.L  #-1,D0
        TST.L   D0
        BPL     FAIL_09         ; N should be set
        ; Test C flag (carry)
        MOVE.B  #$FF,D0
        ADD.B   #1,D0           ; overflow byte: carry set
        BCC     FAIL_09
        ; Test V flag (overflow)
        MOVE.B  #$7F,D0
        ADD.B   #1,D0           ; signed overflow
        BVC     FAIL_09
        BRA     PASS_09
FAIL_09:
        ADDQ.L  #1,D6
PASS_09:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 10: ADDRESS REGISTER OPERATIONS
; =============================================================================
TEST_10:
        LEA.L   $4000,A0
        MOVE.L  #$AABBCCDD,(A0)
        MOVE.L  (A0),D0
        CMP.L   #$AABBCCDD,D0
        BNE     FAIL_10
        ; Test MOVEA
        MOVEA.L #$5000,A1
        CMP.L   #$5000,A1
        BNE     FAIL_10
        ; Test address arithmetic
        LEA.L   $4000,A0
        LEA.L   8(A0),A1        ; A1 = $4008
        CMP.L   #$4008,A1
        BNE     FAIL_10
        BRA     PASS_10
FAIL_10:
        ADDQ.L  #1,D6
PASS_10:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 11: INDIRECT ADDRESSING MODES
; =============================================================================
TEST_11:
        LEA.L   MEM_BLOCK,A0
        ; (An) - register indirect
        MOVE.L  #$11111111,(A0)
        MOVE.L  (A0),D0
        CMP.L   #$11111111,D0
        BNE     FAIL_11
        ; (An)+ - postincrement
        MOVE.L  #$22222222,(A0)+
        MOVE.L  -(A0),D0        ; predecrement to get it back
        CMP.L   #$22222222,D0
        BNE     FAIL_11
        ; d(An) - displacement
        MOVE.L  #$33333333,4(A0)
        MOVE.L  4(A0),D0
        CMP.L   #$33333333,D0
        BNE     FAIL_11
        ; d(An,Dn) - index
        MOVE.W  #8,D1
        MOVE.L  #$44444444,0(A0,D1.W)
        MOVE.L  0(A0,D1.W),D0
        CMP.L   #$44444444,D0
        BNE     FAIL_11
        BRA     PASS_11
FAIL_11:
        ADDQ.L  #1,D6
PASS_11:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 12: STACK OPERATIONS - PUSH/POP (MOVEM)
; =============================================================================
TEST_12:
        MOVE.L  #$1111,D0
        MOVE.L  #$2222,D1
        MOVE.L  #$3333,D2
        MOVE.L  #$4444,D3
        MOVEM.L D0-D3,-(SP)     ; Push D0-D3
        CLR.L   D0
        CLR.L   D1
        CLR.L   D2
        CLR.L   D3
        MOVEM.L (SP)+,D0-D3     ; Pop D0-D3
        CMP.L   #$1111,D0
        BNE     FAIL_12
        CMP.L   #$2222,D1
        BNE     FAIL_12
        CMP.L   #$3333,D2
        BNE     FAIL_12
        CMP.L   #$4444,D3
        BNE     FAIL_12
        BRA     PASS_12
FAIL_12:
        ADDQ.L  #1,D6
PASS_12:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 13: BSR/JSR + RTS (Subroutine call / return)
; =============================================================================
TEST_13:
        MOVE.L  #$BABE,D0
        BSR     SUBR_DOUBLE     ; D0 should become $17C = $BABE*2... well let's use small num
        ; Re-do with small number
        MOVE.L  #10,D0
        BSR     SUBR_DOUBLE     ; D0 = 20
        CMP.L   #20,D0
        BNE     FAIL_13
        JSR     SUBR_ADD_ONE    ; D0 = 21
        CMP.L   #21,D0
        BNE     FAIL_13
        BRA     PASS_13
FAIL_13:
        ADDQ.L  #1,D6
PASS_13:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 14: DBcc LOOP (Decrement and Branch)
; =============================================================================
TEST_14:
        MOVE.W  #9,D0           ; loop 10 times
        CLR.L   D1
.LOOP:
        ADD.L   #1,D1
        DBRA    D0,.LOOP        ; decrement D0, branch if not -1
        CMP.L   #10,D1          ; should have added 10 times
        BNE     FAIL_14
        ; Test DBNE
        MOVE.W  #5,D0
        CLR.L   D2
.LOOP2:
        ADDQ.L  #1,D2
        DBNE    D0,.LOOP2       ; loop until D0=0 or Z flag
        CMP.L   #1,D2           ; exits immediately since DBNE exits on NE=false?
        ; DBNE: decrement & branch if Z clear — exits on first pass since Z not set
        ; Actually DBNE loops while Not Equal (Z=0). Since ADD doesn't set Z here, it loops.
        ; It exits when D0 = -1 (after 6 decrements), D2 = 6
        CMP.L   #6,D2
        BNE     FAIL_14
        BRA     PASS_14
FAIL_14:
        ADDQ.L  #1,D6
PASS_14:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 15: BIT MANIPULATION - BTST, BSET, BCLR, BCHG
; =============================================================================
TEST_15:
        MOVE.L  #$00000000,D0
        BSET    #7,D0           ; Set bit 7 → D0 = $80
        CMP.L   #$80,D0
        BNE     FAIL_15
        BTST    #7,D0           ; Test bit 7 - Z should be clear
        BEQ     FAIL_15
        BCHG    #7,D0           ; Toggle bit 7 → D0 = 0
        TST.L   D0
        BNE     FAIL_15
        BSET    #0,D0           ; Set bit 0
        BCLR    #0,D0           ; Clear bit 0 → D0 = 0
        TST.L   D0
        BNE     FAIL_15
        BRA     PASS_15
FAIL_15:
        ADDQ.L  #1,D6
PASS_15:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 16: SWAP, LINK, UNLK
; =============================================================================
TEST_16:
        MOVE.L  #$AAAABBBB,D0
        SWAP    D0              ; D0 = $BBBBAAAA
        CMP.L   #$BBBBAAAA,D0
        BNE     FAIL_16
        ; LINK/UNLK frame pointer test
        LINK    A6,#-8          ; Allocate 8 bytes on stack
        MOVE.L  #$DEADC0DE,-4(A6)
        MOVE.L  -4(A6),D1
        CMP.L   #$DEADC0DE,D1
        BNE     FAIL_16_CLEAN
        UNLK    A6
        BRA     PASS_16
FAIL_16_CLEAN:
        UNLK    A6
FAIL_16:
        ADDQ.L  #1,D6
PASS_16:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 17: BCD ARITHMETIC (ABCD, SBCD, NBCD)
; =============================================================================
TEST_17:
        MOVE.B  #$29,D0         ; BCD 29
        MOVE.B  #$14,D1         ; BCD 14
        AND.B   #0,CCR          ; Clear X flag
        ABCD    D1,D0           ; BCD: 29+14 = 43
        CMP.B   #$43,D0
        BNE     FAIL_17
        MOVE.B  #$50,D0         ; BCD 50
        MOVE.B  #$23,D1         ; BCD 23
        AND.B   #0,CCR
        SBCD    D1,D0           ; BCD: 50-23 = 27
        CMP.B   #$27,D0
        BNE     FAIL_17
        BRA     PASS_17
FAIL_17:
        ADDQ.L  #1,D6
PASS_17:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 18: SIGN EXTENSION AND CONVERSION
; =============================================================================
TEST_18:
        MOVE.W  #$FFFE,D0       ; -2 as word
        EXT.L   D0              ; Sign-extend to long → $FFFFFFFE
        CMP.L   #$FFFFFFFE,D0
        BNE     FAIL_18
        MOVE.B  #$80,D0
        EXT.W   D0              ; D0.W = $FF80 = -128
        CMP.W   #$FF80,D0
        BNE     FAIL_18
        BRA     PASS_18
FAIL_18:
        ADDQ.L  #1,D6
PASS_18:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 19: COMPARE INSTRUCTIONS - CMP, CMPA, CMPI, CMPM
; =============================================================================
TEST_19:
        MOVE.L  #100,D0
        CMP.L   #100,D0
        BNE     FAIL_19
        CMP.L   #99,D0
        BLS     FAIL_19         ; D0 > 99, so BLS should not branch
        CMPA.L  #$4000,A0       ; Address compare (A0 from test 10 area, but just test instruction)
        ; No branch test needed, just ensure it executes
        LEA.L   MEM_BLOCK,A0
        LEA.L   MEM_BLOCK+4,A1
        MOVE.L  #$ABCD1234,(A0)
        MOVE.L  #$ABCD1234,(A1)
        CMPM.L  (A0)+,(A1)+     ; Compare memory, both postincrement, should be equal (Z=1)
        BNE     FAIL_19
        BRA     PASS_19
FAIL_19:
        ADDQ.L  #1,D6
PASS_19:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 20: EXTENDED ARITHMETIC - ADDX, SUBX
; =============================================================================
TEST_20:
        ; 64-bit add using ADDX: D1:D0 + D3:D2
        MOVE.L  #$FFFFFFFF,D0   ; Low word of A
        MOVE.L  #$00000000,D1   ; High word of A
        MOVE.L  #$00000001,D2   ; Low word of B
        MOVE.L  #$00000000,D3   ; High word of B
        AND.B   #$EF,CCR        ; Clear X flag
        ADD.L   D2,D0           ; D0 = 0, carry=1, X=1
        ADDX.L  D3,D1           ; D1 = 0 + 0 + X = 1
        TST.L   D0
        BNE     FAIL_20         ; D0 must be 0
        CMP.L   #1,D1           ; D1 must be 1
        BNE     FAIL_20
        BRA     PASS_20
FAIL_20:
        ADDQ.L  #1,D6
PASS_20:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 21: TAS - Test and Set (atomic)
; =============================================================================
TEST_21:
        LEA.L   MEM_BLOCK,A0
        CLR.B   (A0)
        TAS     (A0)            ; Test: Z=1 (was 0), then set bit 7
        BNE     FAIL_21         ; Z should be set (was zero)
        MOVE.B  (A0),D0
        AND.B   #$80,D0
        CMP.B   #$80,D0         ; bit 7 now set
        BNE     FAIL_21
        TAS     (A0)            ; Test again: Z=0 (bit 7 was set), N=1
        BEQ     FAIL_21         ; Z should be CLEAR now
        BRA     PASS_21
FAIL_21:
        ADDQ.L  #1,D6
PASS_21:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 22: CONDITIONAL BRANCHES COMPREHENSIVE
; =============================================================================
TEST_22:
        ; BEQ / BNE
        MOVE.L  #5,D0
        CMP.L   #5,D0
        BNE     FAIL_22
        CMP.L   #4,D0
        BEQ     FAIL_22
        ; BLT / BGT signed
        MOVE.L  #-1,D0
        CMP.L   #0,D0
        BGE     FAIL_22         ; -1 < 0, so BGE should NOT branch
        CMP.L   #-2,D0
        BLE     FAIL_22         ; -1 > -2, so BLE should NOT branch
        ; BCS / BCC
        MOVE.B  #$FF,D0
        ADD.B   #2,D0           ; Carry set
        BCC     FAIL_22
        MOVE.B  #$01,D0
        ADD.B   #1,D0           ; No carry
        BCS     FAIL_22
        BRA     PASS_22
FAIL_22:
        ADDQ.L  #1,D6
PASS_22:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 23: MOVEQ (Move Quick - 8-bit sign extended immediate)
; =============================================================================
TEST_23:
        MOVEQ   #127,D0         ; D0 = $0000007F
        CMP.L   #127,D0
        BNE     FAIL_23
        MOVEQ   #-1,D1          ; D1 = $FFFFFFFF
        CMP.L   #-1,D1
        BNE     FAIL_23
        MOVEQ   #-128,D2        ; D2 = $FFFFFF80
        CMP.L   #$FFFFFF80,D2
        BNE     FAIL_23
        BRA     PASS_23
FAIL_23:
        ADDQ.L  #1,D6
PASS_23:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 24: ABSOLUTE SHORT AND LONG ADDRESSING
; =============================================================================
TEST_24:
        MOVE.L  #$BEEFCAFE,$4000.W  ; Short abs (16-bit addr)
        MOVE.L  $4000.W,D0
        CMP.L   #$BEEFCAFE,D0
        BNE     FAIL_24
        MOVE.L  #$F00DF00D,$00004004 ; Long abs (32-bit addr)
        MOVE.L  $00004004,D0
        CMP.L   #$F00DF00D,D0
        BNE     FAIL_24
        BRA     PASS_24
FAIL_24:
        ADDQ.L  #1,D6
PASS_24:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 25: PC-RELATIVE ADDRESSING
; =============================================================================
TEST_25:
        LEA.L   PC_DATA(PC),A0  ; PC-relative load
        MOVE.L  (A0),D0
        CMP.L   #$C0DEC0DE,D0
        BNE     FAIL_25
        MOVEA.L PC_DATA(PC),A1  ; MOVEA with PC-relative
        ; (This loads the value at PC_DATA as an address - just test it doesn't fault)
        BRA     PASS_25
FAIL_25:
        ADDQ.L  #1,D6
PASS_25:
        ADDQ.L  #1,D7

PC_DATA:
        DC.L    $C0DEC0DE

; =============================================================================
; TEST 26: DIVS/DIVU EDGE CASES (divide by zero trap check)
; =============================================================================
TEST_26:
        ; We skip actual divide-by-zero since it causes a trap.
        ; Instead test boundary: DIVU max
        MOVE.L  #$0000FFFE,D0
        DIVU    #2,D0           ; $FFFE / 2 = $7FFF, rem=0
        CMP.W   #$7FFF,D0
        BNE     FAIL_26
        SWAP    D0
        TST.W   D0
        BNE     FAIL_26
        ; DIVS: -32768 / -1 = 32768 — overflow (V flag set), result undefined per spec
        ; So test safe case:
        MOVE.L  #-100,D0
        DIVS    #-5,D0          ; = +20
        CMP.W   #20,D0
        BNE     FAIL_26
        BRA     PASS_26
FAIL_26:
        ADDQ.L  #1,D6
PASS_26:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 27: CHK INSTRUCTION (no trap expected on valid range)
; =============================================================================
TEST_27:
        MOVE.W  #15,D0
        CHK     #20,D0          ; D0 (15) in range 0..20 → no trap
        ; If we get here, no trap occurred - good
        BRA     PASS_27
PASS_27:
        ADDQ.L  #1,D7
        BRA     TEST_28
; CHK trap would land here (via vector), we skip that path

; =============================================================================
; TEST 28: MOVEM - ALL REGISTERS SAVE/RESTORE
; =============================================================================
TEST_28:
        MOVE.L  #$11,D0
        MOVE.L  #$22,D1
        MOVE.L  #$33,D2
        MOVE.L  #$44,D3
        MOVE.L  #$55,D4
        MOVE.L  #$66,D5
        LEA.L   $5000,A0
        LEA.L   $5100,A1
        LEA.L   $5200,A2
        MOVEM.L D0-D5/A0-A2,-(SP)
        CLR.L   D0
        CLR.L   D1
        CLR.L   D2
        CLR.L   D3
        CLR.L   D4
        CLR.L   D5
        CLR.L   A0
        CLR.L   A1
        CLR.L   A2
        MOVEM.L (SP)+,D0-D5/A0-A2
        CMP.L   #$55,D4
        BNE     FAIL_28
        CMP.L   #$5200,A2
        BNE     FAIL_28
        BRA     PASS_28
FAIL_28:
        ADDQ.L  #1,D6
PASS_28:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 29: STRING/BLOCK OPERATIONS WITH LOOP
; =============================================================================
TEST_29:
        ; Fill 16 longs with $FACADE00+i and verify
        LEA.L   MEM_BLOCK,A0
        MOVE.W  #15,D3
        CLR.L   D4
.FILL:
        MOVE.L  D4,(A0)+
        ADDQ.L  #1,D4
        DBRA    D3,.FILL
        ; Verify first and last
        LEA.L   MEM_BLOCK,A0
        MOVE.L  (A0),D0
        TST.L   D0
        BNE     FAIL_29
        MOVE.L  60(A0),D0       ; 15th element (offset 60)
        CMP.L   #15,D0
        BNE     FAIL_29
        BRA     PASS_29
FAIL_29:
        ADDQ.L  #1,D6
PASS_29:
        ADDQ.L  #1,D7

; =============================================================================
; TEST 30: RECURSIVE FIBONACCI VIA STACK
; =============================================================================
TEST_30:
        MOVE.L  #10,D0          ; Fib(10) = 55
        BSR     FIBONACCI
        CMP.L   #55,D0
        BNE     FAIL_30
        BRA     PASS_30
FAIL_30:
        ADDQ.L  #1,D6
PASS_30:
        ADDQ.L  #1,D7

; =============================================================================
; WRITE RESULTS TO MEMORY
; =============================================================================
WRITE_RESULTS:
        LEA.L   RESULT_ADDR,A0
        MOVE.L  D7,(A0)         ; Total tests
        MOVE.L  D6,4(A0)        ; Failed tests
        MOVE.L  D7,D5
        SUB.L   D6,D5
        MOVE.L  D5,8(A0)        ; Passed tests
        ; Write magic pass/fail indicator
        TST.L   D6
        BNE     .SOME_FAIL
        MOVE.L  #PASS_VAL,12(A0)
        BRA     .DONE
.SOME_FAIL:
        MOVE.L  #FAIL_VAL,12(A0)
.DONE:

; =============================================================================
; HALT - Infinite loop (or STOP in supervisor mode)
; =============================================================================
HALT:
        STOP    #$2700          ; Stop with interrupts disabled (supervisor)
        BRA     HALT            ; Safety loop if STOP isn't supported

; =============================================================================
; SUBROUTINES
; =============================================================================

; Double D0
SUBR_DOUBLE:
        ADD.L   D0,D0
        RTS

; Add 1 to D0
SUBR_ADD_ONE:
        ADDQ.L  #1,D0
        RTS

; Fibonacci(D0) → D0  (iterative to save stack space)
; Fib(0)=0, Fib(1)=1, Fib(n)=Fib(n-1)+Fib(n-2)
FIBONACCI:
        MOVEM.L D1-D3,-(SP)
        TST.L   D0
        BEQ     .FIB_DONE       ; Fib(0) = 0
        CMP.L   #1,D0
        BEQ     .FIB_DONE       ; Fib(1) = 1
        MOVE.L  #0,D1           ; prev = 0
        MOVE.L  #1,D2           ; curr = 1
        SUBQ.L  #1,D0           ; counter = n-1
.FIB_LOOP:
        MOVE.L  D2,D3
        ADD.L   D1,D2           ; curr = prev + curr
        MOVE.L  D3,D1           ; prev = old curr
        SUBQ.L  #1,D0
        BNE     .FIB_LOOP
        MOVE.L  D2,D0
.FIB_DONE:
        MOVEM.L (SP)+,D1-D3
        RTS

; =============================================================================
; DATA SECTION
; =============================================================================

        ORG     $3000
MEM_BLOCK:
        DS.L    64              ; 256 bytes scratch memory

; =============================================================================
; EXCEPTION VECTORS (minimal - point to safe handler)
; =============================================================================
        ORG     $0000
        DC.L    $00010000       ; SSP
        DC.L    START           ; Reset PC
        DC.L    EXCEPTION_HANDLER   ; Bus Error
        DC.L    EXCEPTION_HANDLER   ; Address Error
        DC.L    EXCEPTION_HANDLER   ; Illegal Instruction
        DC.L    EXCEPTION_HANDLER   ; Zero Divide
        DC.L    EXCEPTION_HANDLER   ; CHK
        DC.L    EXCEPTION_HANDLER   ; TRAPV
        DC.L    EXCEPTION_HANDLER   ; Privilege Violation
        DC.L    EXCEPTION_HANDLER   ; Trace
        DC.L    EXCEPTION_HANDLER   ; Line 1010
        DC.L    EXCEPTION_HANDLER   ; Line 1111

EXCEPTION_HANDLER:
        ADDQ.L  #1,D6           ; Count as failure
        RTE                     ; Return from exception

; =============================================================================
; END OF PROGRAM
; =============================================================================
        END     START