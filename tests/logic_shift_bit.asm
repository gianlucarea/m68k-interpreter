;-------------------------------------------------------
; M68K Emulator Instruction Test Suite
; Target: Motorola 68000
; Instructions:
;   Logical:        AND, ANDI, OR, ORI, EOR, EORI, NOT
;   Shift/Rotate:   ASL, ASR, LSL, LSR, ROL, ROR, ROXL, ROXR
;   Bit Manip:      BTST, BSET, BCLR, BCHG
; Initial State Assumption: All Regs = 0, SP = $2000
;-------------------------------------------------------

    ORG     $1000

START:

;=======================================================
; SECTION 1: LOGICAL OPERATIONS
;=======================================================

;-------------------------------------------------------
; AND - Logical AND (dest & src -> dest)
; Flags: N, Z updated; V=0, C=0; X unchanged
;-------------------------------------------------------

    ; 1a. AND.B - basic masking
    MOVE.B  #$FF, D0        ; D0.B = 1111 1111
    MOVE.B  #$0F, D1        ; D1.B = 0000 1111
    AND.B   D1, D0          ; D0.B = 1111 1111 & 0000 1111 = 0000 1111 = $0F
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 1b. AND.B - result is zero
    MOVE.B  #$AA, D0        ; D0.B = 1010 1010
    MOVE.B  #$55, D1        ; D1.B = 0101 0101
    AND.B   D1, D0          ; D0.B = 1010 1010 & 0101 0101 = 0000 0000 = $00
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 1c. AND.B - result has bit7 set (N=1)
    MOVE.B  #$F0, D0        ; D0.B = 1111 0000
    MOVE.B  #$80, D1        ; D1.B = 1000 0000
    AND.B   D1, D0          ; D0.B = 1111 0000 & 1000 0000 = 1000 0000 = $80
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 1d. AND.W
    MOVE.W  #$FFFF, D0      ; D0.W = $FFFF
    MOVE.W  #$A5A5, D1      ; D1.W = $A5A5
    AND.W   D1, D0          ; D0.W = $FFFF & $A5A5 = $A5A5
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 1e. AND.L
    MOVE.L  #$FFFF0000, D0  ; D0 = $FFFF0000
    MOVE.L  #$0F0F0F0F, D1  ; D1 = $0F0F0F0F
    AND.L   D1, D0          ; D0 = $FFFF0000 & $0F0F0F0F = $0F0F0000
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 1f. AND to memory (dest in memory, src is Dn)
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$FFFF, (A0)    ; Mem[$3000] = $FFFF
    MOVE.W  #$0F0F, D0      ; D0.W = $0F0F
    AND.W   D0, (A0)        ; Mem[$3000] = $FFFF & $0F0F = $0F0F
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 1g. AND from memory (src in memory, dest is Dn)
    MOVE.W  #$F0F0, (A0)    ; Mem[$3000] = $F0F0
    MOVE.W  #$FF00, D0      ; D0.W = $FF00
    AND.W   (A0), D0        ; D0.W = $FF00 & $F0F0 = $F000
                            ; Flags: N=1, Z=0, V=0, C=0

;-------------------------------------------------------
; ANDI - AND Immediate
; Also: ANDI to CCR, ANDI to SR
;-------------------------------------------------------

    ; 2a. ANDI.B
    MOVE.B  #$FF, D0        ; D0.B = $FF
    ANDI.B  #$3C, D0        ; D0.B = $FF & $3C = $3C (0011 1100)
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 2b. ANDI.B - result zero
    MOVE.B  #$AA, D0        ; D0.B = $AA (1010 1010)
    ANDI.B  #$55, D0        ; D0.B = $AA & $55 = $00
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 2c. ANDI.W
    MOVE.W  #$ABCD, D1      ; D1.W = $ABCD
    ANDI.W  #$FF00, D1      ; D1.W = $ABCD & $FF00 = $AB00
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 2d. ANDI.L
    MOVE.L  #$DEADBEEF, D2  ; D2 = $DEADBEEF
    ANDI.L  #$FFFF0000, D2  ; D2 = $DEADBEEF & $FFFF0000 = $DEAD0000
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 2e. ANDI to memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$FFFF, (A0)    ; Mem[$3000] = $FFFF
    ANDI.W  #$0FF0, (A0)    ; Mem[$3000] = $FFFF & $0FF0 = $0FF0
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 2f. ANDI #imm, CCR - clear specific flag bits
    ;     CCR bits: 4=X, 3=N, 2=Z, 1=V, 0=C
    MOVE.W  #$001F, CCR     ; Set all CCR bits: X=1,N=1,Z=1,V=1,C=1
    ANDI.B  #$F0, CCR       ; Clear bits 0-3 (N,Z,V,C), keep X
                            ; CCR = X=1, N=0, Z=0, V=0, C=0

;-------------------------------------------------------
; OR - Logical Inclusive OR (dest | src -> dest)
; Flags: N, Z updated; V=0, C=0; X unchanged
;-------------------------------------------------------

    ; 3a. OR.B - basic
    MOVE.B  #$0F, D0        ; D0.B = 0000 1111
    MOVE.B  #$F0, D1        ; D1.B = 1111 0000
    OR.B    D1, D0          ; D0.B = 0000 1111 | 1111 0000 = 1111 1111 = $FF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 3b. OR.B - idempotent (OR with itself, no change)
    MOVE.B  #$42, D0        ; D0.B = $42
    OR.B    D0, D0          ; D0.B = $42 | $42 = $42
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 3c. OR.B - OR with zero (no change)
    MOVE.B  #$AB, D0        ; D0.B = $AB
    MOVE.B  #$00, D1        ; D1.B = $00
    OR.B    D1, D0          ; D0.B = $AB | $00 = $AB
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 3d. OR.W
    MOVE.W  #$00FF, D0      ; D0.W = $00FF
    MOVE.W  #$FF00, D1      ; D1.W = $FF00
    OR.W    D1, D0          ; D0.W = $00FF | $FF00 = $FFFF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 3e. OR.L
    MOVE.L  #$00FF00FF, D0  ; D0 = $00FF00FF
    MOVE.L  #$FF00FF00, D1  ; D1 = $FF00FF00
    OR.L    D1, D0          ; D0 = $FFFFFFFF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 3f. OR to memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0F0F, (A0)    ; Mem[$3000] = $0F0F
    MOVE.W  #$F0F0, D0      ; D0.W = $F0F0
    OR.W    D0, (A0)        ; Mem[$3000] = $0F0F | $F0F0 = $FFFF
                            ; Flags: N=1, Z=0, V=0, C=0

;-------------------------------------------------------
; ORI - OR Immediate
; Also: ORI to CCR
;-------------------------------------------------------

    ; 4a. ORI.B
    MOVE.B  #$0F, D0        ; D0.B = $0F
    ORI.B   #$F0, D0        ; D0.B = $0F | $F0 = $FF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 4b. ORI.B - no change (OR with $00)
    MOVE.B  #$AB, D0        ; D0.B = $AB
    ORI.B   #$00, D0        ; D0.B = $AB | $00 = $AB
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 4c. ORI.W
    MOVE.W  #$0000, D1      ; D1.W = $0000
    ORI.W   #$A5A5, D1      ; D1.W = $0000 | $A5A5 = $A5A5
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 4d. ORI.L
    MOVE.L  #$00000000, D2  ; D2 = 0
    ORI.L   #$DEADBEEF, D2  ; D2 = $00000000 | $DEADBEEF = $DEADBEEF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 4e. ORI to memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0000, (A0)    ; Mem[$3000] = $0000
    ORI.W   #$1234, (A0)    ; Mem[$3000] = $0000 | $1234 = $1234
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 4f. ORI #imm, CCR - set specific flag bits
    MOVE.W  #$0000, CCR     ; Clear all CCR bits
    ORI.B   #$1F, CCR       ; Set all CCR bits: X=1,N=1,Z=1,V=1,C=1

;-------------------------------------------------------
; EOR - Exclusive OR (dest ^ src -> dest)
; Note: EOR src must always be a data register Dn
; Flags: N, Z updated; V=0, C=0; X unchanged
;-------------------------------------------------------

    ; 5a. EOR.B - basic toggle
    MOVE.B  #$FF, D0        ; D0.B = 1111 1111
    MOVE.B  #$0F, D1        ; D1.B = 0000 1111
    EOR.B   D1, D0          ; D0.B = 1111 1111 ^ 0000 1111 = 1111 0000 = $F0
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 5b. EOR.B - XOR with itself = 0 (useful for fast clear)
    MOVE.B  #$AB, D0        ; D0.B = $AB
    EOR.B   D0, D0          ; D0.B = $AB ^ $AB = $00
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 5c. EOR.B - XOR with $FF = bitwise NOT
    MOVE.B  #$A5, D0        ; D0.B = 1010 0101
    MOVE.B  #$FF, D1        ; D1.B = 1111 1111
    EOR.B   D1, D0          ; D0.B = 1010 0101 ^ 1111 1111 = 0101 1010 = $5A
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 5d. EOR.W
    MOVE.W  #$AAAA, D0      ; D0.W = $AAAA (1010 1010 1010 1010)
    MOVE.W  #$5555, D1      ; D1.W = $5555 (0101 0101 0101 0101)
    EOR.W   D1, D0          ; D0.W = $AAAA ^ $5555 = $FFFF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 5e. EOR.L
    MOVE.L  #$12345678, D0  ; D0 = $12345678
    MOVE.L  #$12345678, D1  ; D1 = same
    EOR.L   D1, D0          ; D0 = $12345678 ^ $12345678 = $00000000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 5f. EOR to memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$FFFF, (A0)    ; Mem[$3000] = $FFFF
    MOVE.W  #$F0F0, D0      ; D0.W = $F0F0
    EOR.W   D0, (A0)        ; Mem[$3000] = $FFFF ^ $F0F0 = $0F0F
                            ; Flags: N=0, Z=0, V=0, C=0

;-------------------------------------------------------
; EORI - EOR Immediate
; Also: EORI to CCR
;-------------------------------------------------------

    ; 6a. EORI.B - flip nibbles
    MOVE.B  #$F0, D0        ; D0.B = 1111 0000
    EORI.B  #$FF, D0        ; D0.B = 1111 0000 ^ 1111 1111 = 0000 1111 = $0F
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 6b. EORI.B - result zero
    MOVE.B  #$A5, D0        ; D0.B = $A5
    EORI.B  #$A5, D0        ; D0.B = $A5 ^ $A5 = $00
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 6c. EORI.W
    MOVE.W  #$5A5A, D1      ; D1.W = $5A5A
    EORI.W  #$FFFF, D1      ; D1.W = $5A5A ^ $FFFF = $A5A5
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 6d. EORI.L
    MOVE.L  #$00000000, D2  ; D2 = $00000000
    EORI.L  #$FFFFFFFF, D2  ; D2 = $00000000 ^ $FFFFFFFF = $FFFFFFFF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 6e. EORI to memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$A5A5, (A0)    ; Mem[$3000] = $A5A5
    EORI.W  #$FFFF, (A0)    ; Mem[$3000] = $A5A5 ^ $FFFF = $5A5A
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 6f. EORI #imm, CCR - toggle specific bits
    MOVE.W  #$001F, CCR     ; All CCR bits set: X=1,N=1,Z=1,V=1,C=1
    EORI.B  #$1F, CCR       ; Toggle all: X=0,N=0,Z=0,V=0,C=0

;-------------------------------------------------------
; NOT - Logical Complement (one's complement, ~src -> dest)
; Flags: N, Z updated; V=0, C=0; X unchanged
;-------------------------------------------------------

    ; 7a. NOT.B
    MOVE.B  #$00, D0        ; D0.B = 0000 0000
    NOT.B   D0              ; D0.B = ~$00 = $FF = 1111 1111
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 7b. NOT.B
    MOVE.B  #$FF, D0        ; D0.B = $FF
    NOT.B   D0              ; D0.B = ~$FF = $00
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 7c. NOT.B - complement of $A5
    MOVE.B  #$A5, D1        ; D1.B = 1010 0101
    NOT.B   D1              ; D1.B = 0101 1010 = $5A
                            ; Flags: N=0, Z=0, V=0, C=0

    ; 7d. NOT.W
    MOVE.W  #$0F0F, D2      ; D2.W = 0000 1111 0000 1111
    NOT.W   D2              ; D2.W = 1111 0000 1111 0000 = $F0F0
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 7e. NOT.L
    MOVE.L  #$00000000, D3  ; D3 = $00000000
    NOT.L   D3              ; D3 = $FFFFFFFF
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 7f. NOT.L - inverse of previous
    MOVE.L  #$FFFFFFFF, D3  ; D3 = $FFFFFFFF
    NOT.L   D3              ; D3 = $00000000
                            ; Flags: N=0, Z=1, V=0, C=0

    ; 7g. NOT.W in memory
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$5A5A, (A0)    ; Mem[$3000] = $5A5A
    NOT.W   (A0)            ; Mem[$3000] = ~$5A5A = $A5A5
                            ; Flags: N=1, Z=0, V=0, C=0

    ; 7h. NOT - double complement restores original
    MOVE.L  #$12345678, D4  ; D4 = $12345678
    NOT.L   D4              ; D4 = $EDCBA987
    NOT.L   D4              ; D4 = $12345678 (restored)
                            ; Flags: N=0, Z=0, V=0, C=0


;=======================================================
; SECTION 2: SHIFT AND ROTATE
;=======================================================
; Key flag rules:
;   ASL/ASR: C=last bit shifted out, X=C, V=1 if sign changed
;   LSL/LSR: C=last bit shifted out, X=C, V=0 always
;   ROL/ROR: C=bit rotated around, X=C, V=0 always
;   ROXL/ROXR: rotates THROUGH X; C=last bit, X=C, V=0 always
;   All: shift count 0 -> C=0, V=0; count via Dn or immediate (1-8)
;-------------------------------------------------------

;-------------------------------------------------------
; ASL - Arithmetic Shift Left
; Bits shifted out of MSB affect V (overflow if sign changes)
;-------------------------------------------------------

    ; 8a. ASL.B #1 - shift left by 1
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    ASL.B   #1, D0          ; D0.B = 0000 0010 = $02; shifted out: 0
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 8b. ASL.B #1 - carry out of MSB
    MOVE.B  #$80, D0        ; D0.B = 1000 0000
    ASL.B   #1, D0          ; D0.B = 0000 0000; shifted out: 1
                            ; Flags: N=0, Z=1, V=1, C=1, X=1
                            ; V=1 because sign changed (1->0)

    ; 8c. ASL.B #2 - shift by 2
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    ASL.B   #2, D0          ; D0.B = 0000 0100 = $04
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 8d. ASL.W #4 - shift word left by 4 (multiply by 16)
    MOVE.W  #$0001, D1      ; D1.W = $0001
    ASL.W   #4, D1          ; D1.W = $0010
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 8e. ASL.L #1 - overflow: sign bit changes
    MOVE.L  #$40000000, D2  ; D2 = $40000000 (positive, bit30 set)
    ASL.L   #1, D2          ; D2 = $80000000 (now negative!)
                            ; Flags: N=1, Z=0, V=1, C=0, X=0
                            ; V=1: sign changed positive->negative

    ; 8f. ASL using Dn for count
    MOVE.B  #$03, D0        ; D0 = shift count 3
    MOVE.B  #$01, D1        ; D1.B = 0000 0001
    ASL.B   D0, D1          ; D1.B <<= 3: 0000 1000 = $08
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 8g. ASL.W - memory operand (always shifts by 1)
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0010, (A0)    ; Mem[$3000] = $0010
    ASL.W   (A0)            ; Mem[$3000] = $0020
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

;-------------------------------------------------------
; ASR - Arithmetic Shift Right
; Sign bit (MSB) is replicated (preserves sign)
;-------------------------------------------------------

    ; 9a. ASR.B #1 - positive value
    MOVE.B  #$10, D0        ; D0.B = 0001 0000
    ASR.B   #1, D0          ; D0.B = 0000 1000 = $08; sign=0, replicated
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 9b. ASR.B #1 - negative value (sign extended)
    MOVE.B  #$80, D0        ; D0.B = 1000 0000 (-128)
    ASR.B   #1, D0          ; D0.B = 1100 0000 = $C0 (-64); sign=1, replicated
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 9c. ASR.B #1 - carry from LSB
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    ASR.B   #1, D0          ; D0.B = 0000 0000; LSB shifted into C
                            ; Flags: N=0, Z=1, V=0, C=1, X=1

    ; 9d. ASR.B #1 - negative with carry
    MOVE.B  #$FF, D0        ; D0.B = 1111 1111 (-1)
    ASR.B   #1, D0          ; D0.B = 1111 1111 (-1 again); LSB->C=1
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 9e. ASR.W #2 - signed divide by 4
    MOVE.W  #$0100, D1      ; D1.W = $0100 (+256)
    ASR.W   #2, D1          ; D1.W = $0040 (+64)
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 9f. ASR.W #2 - negative signed divide by 4
    MOVE.W  #$FF00, D1      ; D1.W = $FF00 (-256 signed)
    ASR.W   #2, D1          ; D1.W = $FFC0 (-64)
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 9g. ASR.L #1 - long
    MOVE.L  #$80000000, D2  ; D2 = $80000000 (most-negative)
    ASR.L   #1, D2          ; D2 = $C0000000 (sign bit replicated)
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 9h. ASR using Dn count
    MOVE.B  #$03, D0        ; D0 = shift count 3
    MOVE.B  #$80, D1        ; D1.B = 1000 0000
    ASR.B   D0, D1          ; D1.B >>= 3: 1111 0000 = $F0
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 9i. ASR.W - memory operand (by 1)
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$8000, (A0)    ; Mem[$3000] = $8000
    ASR.W   (A0)            ; Mem[$3000] = $C000
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

;-------------------------------------------------------
; LSL - Logical Shift Left (same as ASL but V always 0)
;-------------------------------------------------------

    ; 10a. LSL.B #1 - basic
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    LSL.B   #1, D0          ; D0.B = 0000 0010
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 10b. LSL.B #1 - carry and zero
    MOVE.B  #$80, D0        ; D0.B = 1000 0000
    LSL.B   #1, D0          ; D0.B = 0000 0000; C=1 (MSB shifted out)
                            ; Flags: N=0, Z=1, V=0, C=1, X=1
                            ; Note: V=0 even though sign changed (unlike ASL)

    ; 10c. LSL.W #4 - shift word left 4 bits
    MOVE.W  #$000F, D1      ; D1.W = $000F
    LSL.W   #4, D1          ; D1.W = $00F0
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 10d. LSL.L #8 - shift long left 8 bits
    MOVE.L  #$00000001, D2  ; D2 = $00000001
    LSL.L   #8, D2          ; D2 = $00000100
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 10e. LSL using Dn count
    MOVE.B  #$04, D0        ; D0 = count 4
    MOVE.W  #$0001, D1      ; D1.W = $0001
    LSL.W   D0, D1          ; D1.W <<= 4: $0010
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 10f. LSL.W - memory (by 1)
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$4000, (A0)    ; Mem[$3000] = $4000
    LSL.W   (A0)            ; Mem[$3000] = $8000; C=0 (bit 15 was 0)
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

;-------------------------------------------------------
; LSR - Logical Shift Right (zero fills MSB; V always 0)
;-------------------------------------------------------

    ; 11a. LSR.B #1 - basic
    MOVE.B  #$80, D0        ; D0.B = 1000 0000
    LSR.B   #1, D0          ; D0.B = 0100 0000 = $40; zero fills MSB
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 11b. LSR.B #1 - carry from LSB
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    LSR.B   #1, D0          ; D0.B = 0000 0000; LSB->C=1
                            ; Flags: N=0, Z=1, V=0, C=1, X=1

    ; 11c. LSR.B - does NOT sign-extend (unlike ASR)
    MOVE.B  #$FF, D0        ; D0.B = 1111 1111
    LSR.B   #1, D0          ; D0.B = 0111 1111 = $7F; MSB becomes 0
                            ; Flags: N=0, Z=0, V=0, C=1, X=1

    ; 11d. LSR.W #4
    MOVE.W  #$F000, D1      ; D1.W = $F000
    LSR.W   #4, D1          ; D1.W = $0F00
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 11e. LSR.L #8
    MOVE.L  #$FF000000, D2  ; D2 = $FF000000
    LSR.L   #8, D2          ; D2 = $00FF0000
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 11f. LSR using Dn count
    MOVE.B  #$04, D0        ; D0 = count 4
    MOVE.W  #$F000, D1      ; D1.W = $F000
    LSR.W   D0, D1          ; D1.W >>= 4: $0F00
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 11g. LSR.W - memory (by 1)
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0001, (A0)    ; Mem[$3000] = $0001
    LSR.W   (A0)            ; Mem[$3000] = $0000; C=1
                            ; Flags: N=0, Z=1, V=0, C=1, X=1

;-------------------------------------------------------
; ROL - Rotate Left (bit rotates from MSB back into LSB)
; C = last bit shifted out of MSB; X = C; V=0
;-------------------------------------------------------

    ; 12a. ROL.B #1 - MSB wraps to LSB
    MOVE.B  #$80, D0        ; D0.B = 1000 0000
    ROL.B   #1, D0          ; D0.B = 0000 0001; MSB->LSB, C=1
                            ; Flags: N=0, Z=0, V=0, C=1, X=1

    ; 12b. ROL.B #1 - no wrap
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    ROL.B   #1, D0          ; D0.B = 0000 0010; C=0
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 12c. ROL.B #4 - rotate nibble
    MOVE.B  #$F0, D0        ; D0.B = 1111 0000
    ROL.B   #4, D0          ; D0.B = 0000 1111 = $0F
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 12d. ROL.B #8 - full rotation (no change)
    MOVE.B  #$A5, D0        ; D0.B = 1010 0101
    ROL.B   #8, D0          ; D0.B = 1010 0101 = $A5 (full circle)
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 12e. ROL.W #1
    MOVE.W  #$8000, D1      ; D1.W = $8000
    ROL.W   #1, D1          ; D1.W = $0001; MSB->LSB
                            ; Flags: N=0, Z=0, V=0, C=1, X=1

    ; 12f. ROL.L #1
    MOVE.L  #$80000000, D2  ; D2 = $80000000
    ROL.L   #1, D2          ; D2 = $00000001; MSB->LSB
                            ; Flags: N=0, Z=0, V=0, C=1, X=1

    ; 12g. ROL using Dn count
    MOVE.B  #$04, D0        ; D0 = count 4
    MOVE.W  #$1234, D1      ; D1.W = $1234 = 0001 0010 0011 0100
    ROL.W   D0, D1          ; D1.W = $2341 (rotated left 4)
                            ; Flags: N=0, Z=0, V=0, C=1, X=1

    ; 12h. ROL.W - memory (by 1)
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$8001, (A0)    ; Mem[$3000] = $8001
    ROL.W   (A0)            ; Mem[$3000] = $0003; MSB->LSB, C=1
                            ; Flags: N=0, Z=0, V=0, C=1, X=1

;-------------------------------------------------------
; ROR - Rotate Right (bit rotates from LSB back into MSB)
; C = last bit shifted out of LSB; X = C; V=0
;-------------------------------------------------------

    ; 13a. ROR.B #1 - LSB wraps to MSB
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    ROR.B   #1, D0          ; D0.B = 1000 0000 = $80; LSB->MSB, C=1
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 13b. ROR.B #1 - no wrap
    MOVE.B  #$80, D0        ; D0.B = 1000 0000
    ROR.B   #1, D0          ; D0.B = 0100 0000 = $40; C=0
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 13c. ROR.B #4
    MOVE.B  #$0F, D0        ; D0.B = 0000 1111
    ROR.B   #4, D0          ; D0.B = 1111 0000 = $F0
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 13d. ROR.B #8 - full rotation (no change)
    MOVE.B  #$A5, D0        ; D0.B = $A5
    ROR.B   #8, D0          ; D0.B = $A5 (full circle)
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 13e. ROR.W #1
    MOVE.W  #$0001, D1      ; D1.W = $0001
    ROR.W   #1, D1          ; D1.W = $8000; LSB->MSB, C=1
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 13f. ROR.L #1
    MOVE.L  #$00000001, D2  ; D2 = $00000001
    ROR.L   #1, D2          ; D2 = $80000000; LSB->MSB, C=1
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 13g. ROR using Dn count
    MOVE.B  #$04, D0        ; D0 = count 4
    MOVE.W  #$1234, D1      ; D1.W = $1234
    ROR.W   D0, D1          ; D1.W = $4123 (rotated right 4)
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 13h. ROR.W - memory (by 1)
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$8001, (A0)    ; Mem[$3000] = $8001
    ROR.W   (A0)            ; Mem[$3000] = $C000; LSB(1)->MSB, C=1
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

;-------------------------------------------------------
; ROXL - Rotate Left through Extend (9-bit / 17-bit / 33-bit rotation)
; Bit order: X <- MSB <- ... <- LSB <- X
; C = last bit out (MSB); X = C; V=0
;-------------------------------------------------------

    ; 14a. ROXL.B #1 - X=0 going in
    MOVE.W  #$0000, CCR     ; X=0
    MOVE.B  #$40, D0        ; D0.B = 0100 0000
    ROXL.B  #1, D0          ; D0.B = 1000 0000; X(0) enters LSB, MSB(0)->C,X
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 14b. ROXL.B #1 - MSB=1 exits through C and X
    MOVE.W  #$0000, CCR     ; X=0
    MOVE.B  #$80, D0        ; D0.B = 1000 0000
    ROXL.B  #1, D0          ; D0.B = 0000 0000; MSB(1)->C=1,X=1; X(0) enters LSB
                            ; Flags: N=0, Z=1, V=0, C=1, X=1

    ; 14c. ROXL.B #1 - X=1 going in (X enters as new LSB)
    MOVE.W  #$0010, CCR     ; X=1
    MOVE.B  #$40, D0        ; D0.B = 0100 0000
    ROXL.B  #1, D0          ; D0.B = 1000 0001; X(1) enters LSB, MSB(0)->C,X
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 14d. ROXL.B #1 - 9-bit cycle demo
    ;      MSB(1) exits to X, old X(1) becomes new LSB
    MOVE.W  #$0010, CCR     ; X=1
    MOVE.B  #$80, D0        ; D0.B = 1000 0000
    ROXL.B  #1, D0          ; D0.B = 0000 0001; MSB(1)->C=1,X=1; old X(1)->LSB
                            ; Flags: N=0, Z=0, V=0, C=1, X=1

    ; 14e. ROXL.W #1
    MOVE.W  #$0000, CCR     ; X=0
    MOVE.W  #$4000, D1      ; D1.W = $4000
    ROXL.W  #1, D1          ; D1.W = $8000; X(0)->LSB, MSB(0)->C,X=0
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 14f. ROXL.L #1 - carry propagation
    MOVE.W  #$0010, CCR     ; X=1
    MOVE.L  #$00000000, D2  ; D2 = $00000000
    ROXL.L  #1, D2          ; D2 = $00000001; X(1)->LSB, MSB(0)->C=0,X=0
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 14g. ROXL using Dn count
    MOVE.W  #$0000, CCR     ; X=0
    MOVE.B  #$02, D0        ; D0 = count 2
    MOVE.B  #$20, D1        ; D1.B = 0010 0000
    ROXL.B  D0, D1          ; D1.B rotated left 2 via X: 1000 0000 = $80
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 14h. ROXL.W - memory (by 1)
    MOVE.W  #$0010, CCR     ; X=1
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0000, (A0)    ; Mem[$3000] = $0000
    ROXL.W  (A0)            ; Mem[$3000] = $0001; X(1)->LSB, MSB(0)->C=0,X=0
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

;-------------------------------------------------------
; ROXR - Rotate Right through Extend (9-bit / 17-bit / 33-bit)
; Bit order: X -> MSB -> ... -> LSB -> X
; C = last bit out (LSB); X = C; V=0
;-------------------------------------------------------

    ; 15a. ROXR.B #1 - X=0 going in
    MOVE.W  #$0000, CCR     ; X=0
    MOVE.B  #$02, D0        ; D0.B = 0000 0010
    ROXR.B  #1, D0          ; D0.B = 0000 0001; X(0)->MSB, LSB(0)->C,X=0
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 15b. ROXR.B #1 - LSB=1 exits through C
    MOVE.W  #$0000, CCR     ; X=0
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    ROXR.B  #1, D0          ; D0.B = 0000 0000; X(0)->MSB, LSB(1)->C=1,X=1
                            ; Flags: N=0, Z=1, V=0, C=1, X=1

    ; 15c. ROXR.B #1 - X=1 enters as new MSB
    MOVE.W  #$0010, CCR     ; X=1
    MOVE.B  #$02, D0        ; D0.B = 0000 0010
    ROXR.B  #1, D0          ; D0.B = 1000 0001; X(1)->MSB, LSB(0)->C,X=0
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 15d. ROXR.B #1 - 9-bit cycle: LSB(1) exits to X, old X(1) -> MSB
    MOVE.W  #$0010, CCR     ; X=1
    MOVE.B  #$01, D0        ; D0.B = 0000 0001
    ROXR.B  #1, D0          ; D0.B = 1000 0000; X(1)->MSB, LSB(1)->C=1,X=1
                            ; Flags: N=1, Z=0, V=0, C=1, X=1

    ; 15e. ROXR.W #1
    MOVE.W  #$0000, CCR     ; X=0
    MOVE.W  #$0002, D1      ; D1.W = $0002
    ROXR.W  #1, D1          ; D1.W = $0001; X(0)->MSB, LSB(0)->C=0,X=0
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 15f. ROXR.L #1 - X=1 entering
    MOVE.W  #$0010, CCR     ; X=1
    MOVE.L  #$00000000, D2  ; D2 = $00000000
    ROXR.L  #1, D2          ; D2 = $80000000; X(1)->MSB, LSB(0)->C=0,X=0
                            ; Flags: N=1, Z=0, V=0, C=0, X=0

    ; 15g. ROXR using Dn count
    MOVE.W  #$0000, CCR     ; X=0
    MOVE.B  #$02, D0        ; D0 = count 2
    MOVE.B  #$04, D1        ; D1.B = 0000 0100
    ROXR.B  D0, D1          ; D1.B rotated right 2 via X: 0000 0001 = $01
                            ; Flags: N=0, Z=0, V=0, C=0, X=0

    ; 15h. ROXR.W - memory (by 1)
    MOVE.W  #$0010, CCR     ; X=1
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.W  #$0000, (A0)    ; Mem[$3000] = $0000
    ROXR.W  (A0)            ; Mem[$3000] = $8000; X(1)->MSB, LSB(0)->C=0,X=0
                            ; Flags: N=1, Z=0, V=0, C=0, X=0


;=======================================================
; SECTION 3: BIT MANIPULATION
;=======================================================
; Bit number:
;   For Dn: bits 0-31, number taken modulo 32
;   For memory: bits 0-7 only, number taken modulo 8
; BTST: Tests bit -> Z = ~bit (Z=1 if bit was 0)
; BSET: Tests then sets bit to 1
; BCLR: Tests then clears bit to 0
; BCHG: Tests then toggles bit
; Only Z flag is modified; N, V, C, X unchanged
;-------------------------------------------------------

;-------------------------------------------------------
; BTST - Bit Test
;-------------------------------------------------------

    ; 16a. BTST #n, Dn - test bit 0 (set)
    MOVE.L  #$00000001, D0  ; D0 bit 0 = 1
    BTST    #0, D0          ; Z = ~(bit0) = ~1 = 0
                            ; Flags: Z=0 (bit was SET)
                            ; D0 UNCHANGED

    ; 16b. BTST #n, Dn - test bit 0 (clear)
    MOVE.L  #$00000000, D0  ; D0 bit 0 = 0
    BTST    #0, D0          ; Z = ~(bit0) = ~0 = 1
                            ; Flags: Z=1 (bit was CLEAR)

    ; 16c. BTST #n, Dn - test bit 7 (MSB of byte)
    MOVE.L  #$00000080, D0  ; D0 bit 7 = 1
    BTST    #7, D0          ; Z=0 (bit was set)

    ; 16d. BTST #n, Dn - test bit 31 (MSB of long)
    MOVE.L  #$80000000, D0  ; D0 bit 31 = 1
    BTST    #31, D0         ; Z=0 (bit was set)

    ; 16e. BTST #n, Dn - test bit 31 (clear)
    MOVE.L  #$7FFFFFFF, D0  ; D0 bit 31 = 0
    BTST    #31, D0         ; Z=1 (bit was clear)

    ; 16f. BTST Dn, Dn - bit number from register
    MOVE.L  #$00000010, D0  ; D0 = test value; bit 4 = 1
    MOVE.L  #$00000004, D1  ; D1 = bit number 4
    BTST    D1, D0          ; Test bit 4 of D0; Z=0 (set)

    ; 16g. BTST #n, (An) - memory byte, bit 3 set
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.B  #$08, (A0)      ; Mem[$3000] = 0000 1000 (bit 3 = 1)
    BTST    #3, (A0)        ; Test bit 3; Z=0 (set); modulo 8 applies
                            ; Mem[$3000] UNCHANGED

    ; 16h. BTST #n, (An) - memory byte, bit 3 clear
    MOVE.B  #$F7, (A0)      ; Mem[$3000] = 1111 0111 (bit 3 = 0)
    BTST    #3, (A0)        ; Z=1 (clear)

    ; 16i. BTST modulo 8 in memory: bit 11 same as bit 3 (11 mod 8 = 3)
    MOVE.B  #$08, (A0)      ; Mem[$3000] bit 3 = 1
    BTST    #11, (A0)       ; 11 mod 8 = 3, tests bit 3; Z=0 (set)

    ; 16j. BTST Dn, (An) - bit number from register
    MOVE.B  #$20, (A0)      ; Mem[$3000] = 0010 0000 (bit 5 = 1)
    MOVE.L  #$00000005, D0  ; D0 = bit number 5
    BTST    D0, (A0)        ; Test bit 5; Z=0 (set)

;-------------------------------------------------------
; BSET - Bit Set (tests then forces bit to 1)
;-------------------------------------------------------

    ; 17a. BSET #n, Dn - set bit 0 (was clear)
    MOVE.L  #$00000000, D0  ; D0 = $00000000
    BSET    #0, D0          ; Test bit0 (Z=1, was clear), then set it
                            ; D0 = $00000001
                            ; Flags: Z=1 (bit was 0 before)

    ; 17b. BSET #n, Dn - set bit 0 (was already set)
    MOVE.L  #$00000001, D0  ; D0 bit 0 = 1
    BSET    #0, D0          ; Test bit0 (Z=0, was set), then set it
                            ; D0 = $00000001 (no change)
                            ; Flags: Z=0 (bit was 1 before)

    ; 17c. BSET #7, Dn - set MSB of byte portion
    MOVE.L  #$0000007F, D1  ; D1 = $0000007F
    BSET    #7, D1          ; Test bit7 (Z=1, was 0), then set it
                            ; D1 = $000000FF
                            ; Flags: Z=1

    ; 17d. BSET #31, Dn - set MSB of long
    MOVE.L  #$7FFFFFFF, D2  ; D2 = $7FFFFFFF
    BSET    #31, D2         ; Test bit31 (Z=1, was 0), set it
                            ; D2 = $FFFFFFFF
                            ; Flags: Z=1

    ; 17e. BSET Dn, Dn - bit number from register
    MOVE.L  #$00000000, D0  ; D0 = target
    MOVE.L  #$00000008, D1  ; D1 = bit number 8
    BSET    D1, D0          ; Set bit 8 of D0
                            ; D0 = $00000100
                            ; Flags: Z=1

    ; 17f. BSET #n, (An) - memory byte
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.B  #$00, (A0)      ; Mem[$3000] = $00
    BSET    #3, (A0)        ; Test bit3 (Z=1), set it
                            ; Mem[$3000] = $08
                            ; Flags: Z=1

    ; 17g. BSET #n, (An) - already set
    MOVE.B  #$08, (A0)      ; Mem[$3000] = $08 (bit3=1)
    BSET    #3, (A0)        ; Test bit3 (Z=0), set it (no change)
                            ; Mem[$3000] = $08
                            ; Flags: Z=0

;-------------------------------------------------------
; BCLR - Bit Clear (tests then forces bit to 0)
;-------------------------------------------------------

    ; 18a. BCLR #n, Dn - clear bit 0 (was set)
    MOVE.L  #$00000001, D0  ; D0 bit 0 = 1
    BCLR    #0, D0          ; Test bit0 (Z=0, was set), then clear it
                            ; D0 = $00000000
                            ; Flags: Z=0 (bit was 1 before)

    ; 18b. BCLR #n, Dn - clear bit 0 (was already clear)
    MOVE.L  #$00000000, D0  ; D0 bit 0 = 0
    BCLR    #0, D0          ; Test bit0 (Z=1, was clear), then clear it
                            ; D0 = $00000000 (no change)
                            ; Flags: Z=1 (bit was 0 before)

    ; 18c. BCLR #31, Dn - clear MSB of long
    MOVE.L  #$FFFFFFFF, D1  ; D1 = $FFFFFFFF
    BCLR    #31, D1         ; Test bit31 (Z=0, was set), clear it
                            ; D1 = $7FFFFFFF
                            ; Flags: Z=0

    ; 18d. BCLR #7, Dn - clear bit 7
    MOVE.L  #$000000FF, D2  ; D2 = $FF
    BCLR    #7, D2          ; Test bit7 (Z=0, was set), clear it
                            ; D2 = $0000007F
                            ; Flags: Z=0

    ; 18e. BCLR Dn, Dn - bit number from register
    MOVE.L  #$FFFFFFFF, D0  ; D0 = all bits set
    MOVE.L  #$00000010, D1  ; D1 = bit number 16
    BCLR    D1, D0          ; Clear bit 16 of D0
                            ; D0 = $FFFEFFFF
                            ; Flags: Z=0

    ; 18f. BCLR #n, (An) - memory byte
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.B  #$FF, (A0)      ; Mem[$3000] = $FF
    BCLR    #3, (A0)        ; Test bit3 (Z=0, was set), clear it
                            ; Mem[$3000] = $F7 = 1111 0111
                            ; Flags: Z=0

    ; 18g. BCLR #n, (An) - bit already clear
    MOVE.B  #$F7, (A0)      ; Mem[$3000] = $F7 (bit 3 already clear)
    BCLR    #3, (A0)        ; Test bit3 (Z=1, was clear), clear it (no change)
                            ; Mem[$3000] = $F7
                            ; Flags: Z=1

;-------------------------------------------------------
; BCHG - Bit Change/Toggle (tests then inverts bit)
;-------------------------------------------------------

    ; 19a. BCHG #n, Dn - toggle bit 0 (was clear -> set)
    MOVE.L  #$00000000, D0  ; D0 bit 0 = 0
    BCHG    #0, D0          ; Test bit0 (Z=1, was 0), then toggle it
                            ; D0 = $00000001
                            ; Flags: Z=1 (bit WAS 0)

    ; 19b. BCHG #n, Dn - toggle bit 0 (was set -> clear)
    MOVE.L  #$00000001, D0  ; D0 bit 0 = 1
    BCHG    #0, D0          ; Test bit0 (Z=0, was 1), then toggle it
                            ; D0 = $00000000
                            ; Flags: Z=0 (bit WAS 1)

    ; 19c. BCHG applied twice restores original
    MOVE.L  #$12345678, D1  ; D1 = $12345678
    BCHG    #15, D1         ; Toggle bit 15
    BCHG    #15, D1         ; Toggle bit 15 again -> restored to $12345678
                            ; Flags: Z=0 (bit15 was set after first BCHG)

    ; 19d. BCHG #7, Dn
    MOVE.L  #$000000FF, D2  ; D2 bit 7 = 1
    BCHG    #7, D2          ; Test (Z=0, set), toggle -> bit7=0
                            ; D2 = $0000007F
                            ; Flags: Z=0

    ; 19e. BCHG #31, Dn - toggle MSB
    MOVE.L  #$00000000, D3  ; D3 bit 31 = 0
    BCHG    #31, D3         ; Test (Z=1, clear), toggle -> bit31=1
                            ; D3 = $80000000
                            ; Flags: Z=1

    ; 19f. BCHG Dn, Dn - bit number from register
    MOVE.L  #$0000FF00, D0  ; D0 bit 8..15 all set
    MOVE.L  #$0000000C, D1  ; D1 = bit number 12
    BCHG    D1, D0          ; Toggle bit 12 of D0 (was 1)
                            ; D0 = $0000EF00
                            ; Flags: Z=0

    ; 19g. BCHG #n, (An) - memory, bit clear -> set
    MOVEA.L #$3000, A0      ; A0 = $3000
    MOVE.B  #$00, (A0)      ; Mem[$3000] = $00
    BCHG    #5, (A0)        ; Test bit5 (Z=1, was 0), toggle -> 1
                            ; Mem[$3000] = $20 = 0010 0000
                            ; Flags: Z=1

    ; 19h. BCHG #n, (An) - memory, bit set -> clear
    MOVE.B  #$FF, (A0)      ; Mem[$3000] = $FF
    BCHG    #5, (A0)        ; Test bit5 (Z=0, was 1), toggle -> 0
                            ; Mem[$3000] = $DF = 1101 1111
                            ; Flags: Z=0

    ; 19i. BCHG - alternating toggle confirms toggle semantics
    MOVE.B  #$00, (A0)      ; Mem[$3000] = $00
    BCHG    #0, (A0)        ; $00 -> $01, Z=1 (was clear)
    BCHG    #0, (A0)        ; $01 -> $00, Z=0 (was set)
    BCHG    #0, (A0)        ; $00 -> $01, Z=1 (was clear)

;=======================================================
; END OF TEST SUITE
;=======================================================

SIMHALT:
    BRA.S   SIMHALT         ; Loop forever

    END     START