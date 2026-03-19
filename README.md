# m68k-interpreter

A Motorola 68000 assembly emulator that runs entirely in the browser.  
Write, step through, and debug m68k assembly — no installation needed.

**[→ Live demo](https://gianlucarea.dev/m68k-interpreter/)**

---

## Why this exists

[Easy68K](http://www.easy68k.com/) is the standard tool for learning m68k assembly in university courses. It's Windows-only, requires installation, and hasn't been updated in years. This runs in any browser, on any OS, with zero setup.

---

## Features

- Step-by-step execution with full undo/redo history
- Live register viewer and memory inspector
- Detailed error reporting with line context
- Preloaded examples covering common patterns
- Export register and memory state to file

## Supported instructions

**Data movement** — `MOVE` `MOVEA` `MOVEQ` `MOVEM` `MOVEP` `LEA` `PEA` `CLR` `EXG` `SWAP`  
**Integer arithmetic** — `ADD` `ADDA` `ADDI` `ADDQ` `ADDX` `SUB` `SUBA` `SUBI` `SUBQ` `SUBX` `MULS` `MULU` `DIVS` `DIVU` `NEG` `NEGX` `EXT` `CLR` `CMP` `CMPA` `CMPI` `CMPM` `TST`  
**Logical operations** — `AND` `ANDI` `OR` `ORI` `EOR` `EORI` `NOT`  
**Shift & rotate** — `ASL` `ASR` `LSL` `LSR` `ROL` `ROR` `ROXL` `ROXR`  
**Bit manipulation** — `BTST` `BSET` `BCLR` `BCHG`  
**CCR operations** — `ANDI to CCR` `ORI to CCR` `EORI to CCR` `MOVE to CCR` `MOVE from CCR`  
**Program control & branching** — `BRA` `BSR` `Bcc` (`BHI` `BLS` `BCC` `BCS` `BNE` `BEQ` `BVC` `BVS` `BPL` `BMI` `BGE` `BLT` `BGT` `BLE`) `DBcc` (`DBHI` `DBLS` `DBCC` `DBCS` `DBNE` `DBEQ` `DBVC` `DBVS` `DBPL` `DBMI` `DBGE` `DBLT` `DBGT` `DBLE` `DBF` `DBT`) `Scc` (`SHI` `SLS` `SCC` `SCS` `SNE` `SEQ` `SVC` `SVS` `SPL` `SMI` `SGE` `SLT` `SGT` `SLE` `SF` `ST`) `JMP` `JSR` `RTS` `RTR` `RTD`  
**System control & exceptions** — `RESET` `NOP` `STOP` `RTE` `TRAP` `TRAPV` `CHK` `LINK` `UNLK` `MOVE to SR` `MOVE from SR` `ORI to SR` `ANDI to SR` `EORI to SR` `TAS`

---
<!-- 
## Examples

The [`examples/`](./examples) folder contains annotated programs to get started:

| File | What it demonstrates |
| --- | --- |
| `fibonacci.asm` | Loops, D registers, branching |
| `factorial.asm` | Recursion via JSR/RTS, stack discipline |
| `bubble_sort.asm` | Nested loops, memory addressing, CMPI |
| `stack_ops.asm` | MOVE to/from stack pointer, subroutine conventions |
| `hello_world.asm` | Basic MOVE and output |
| `loop_counter.asm` | DBRA countdown loop |

Each file is commented line by line — useful if you are following a computer architecture course.
--- 
-->

## Built with

React 18 · TypeScript · Vite 5 · Zustand · Vitest

---

## Run locally

```bash
git clone https://github.com/gianlucarea/m68k-interpreter.git
cd m68k-interpreter
npm install
npm run dev
```

```bash
npm run build        # production build
npm run test         # run tests
npm run lint:fix     # lint and format
```

---

## For educators

If you teach a course that uses Easy68K, this works as a drop-in browser-based alternative — no student setup required. If you use it in your course and want it listed here, open an issue or send an email.

---

## Acknowledgments

Special thanks to [MarkeyJester's Motorola 68000 Beginner's Tutorial](https://mrjester.hapisan.com/04_MC68/Index.html) — an excellent reference for instruction behavior, cycle times, and assembly fundamentals that informed this implementation.

---

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
