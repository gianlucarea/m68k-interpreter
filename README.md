# 🧠 M68K Interpreter

[![Built with React](https://img.shields.io/badge/Built%20with-React%2018-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%205-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> 💻 A modern, web-based **Motorola 68000 (m68k) assembly emulator** built with **React 18**, **TypeScript**, and **Vite**.  
> Write, run, and debug m68k assembly **right in your browser** — no installation needed.

## 🚀 What's New (v1.0.0 - Modernized)

✨ **Complete Rewrite with Latest Stack:**

- 🎯 **React 18** with hooks & functional components
- 📘 **TypeScript** for full type safety
- ⚡ **Vite 5** for lightning-fast builds and dev server
- 🏪 **Zustand** for lightweight state management
- 🧪 **Vitest** for fast unit testing
- 📐 **ESLint + Prettier** for code quality
- 🎨 **Modern CSS** with responsive design system
- 📦 **Optimized** with tree-shaking and code-splitting

## 🌐 Live Demo

🎯 **Try it now:** [https://gianlucarea.dev/m68k-interpreter/](https://gianlucarea.dev/m68k-interpreter/)

## 🚀 Features

✅ **Interactive Code Editor** – Write m68k assembly code  
✅ **Real-Time Execution** – Run and step-through code instantly  
✅ **Complete History** – Undo/redo with execution history  
✅ **Register Viewer** – Monitor all CPU registers  
✅ **Memory Inspector** – View and analyze memory contents  
✅ **Error Management** – Detailed error and exception reporting  
✅ **Data Export** – Download registers and memory data  
✅ **Responsive UI** – Works perfectly on desktop and tablets  
✅ **Educational Focus** – Built for learning CPU architecture  
✅ **Zero Setup** – Runs entirely in the browser

## 🏗️ Architecture

### Modern Tech Stack

```
Frontend
├── React 18.3 (UI Framework)
├── TypeScript 5.3 (Type Safety)
├── Zustand 4.4 (State Management)
└── FontAwesome 6 (Icons)

Build & Development
├── Vite 5.0 (Fast Bundler)
├── ESLint 8.56 (Linting)
└── Prettier 3.1 (Formatting)

Testing & Quality
├── Vitest 1.1 (Unit Tests)
├── React Testing Library
└── Type Checking

Deployment
└── GitHub Pages
```

### Project Structure

```
src/
├── components/          # React components
│   ├── App.tsx         # Root component
│   ├── Navbar.tsx      # Control panel
│   ├── Editor.tsx      # Code editor
│   ├── Registers.tsx   # Register viewer
│   ├── Memory.tsx      # Memory inspector
│   └── Output.tsx      # Execution output
├── core/               # Emulator core logic
│   └── memory.ts       # Memory management
├── stores/             # State management
│   └── emulatorStore.ts # Zustand store
├── types/              # TypeScript definitions
│   └── emulator.ts     # Type definitions
└── styles/             # Styling
    └── main.css        # Global styles
```

## 🧭 How to Use

| Action | Purpose |
|--------|---------|
| ▶️ **Run** | Execute the program |
| ⟲ **Reset** | Clear all state |
| ⇢ **Step** | Execute one instruction |
| ↶ **Undo** | Revert last instruction |

## ⚙️ Supported Instructions

### Arithmetic

`ADD`, `ADDA`, `ADDI`, `ADDQ`, `SUB`, `SUBA`, `SUBI`, `SUBQ`, `MULS`, `DIVS`

### Logic

`AND`, `ANDI`, `EOR`, `EORI`, `NOT`, `NEG`, `OR`, `ORI`

### Basic Operations

`CLR`, `EXG`, `EXT`, `MOVE`, `MOVEA`, `SWAP`, `LEA`

### Shifts & Rotates

`ASL`, `ASR`, `LSL`, `LSR`, `ROL`, `ROR`, `ROXL`, `ROXR`

### Comparisons

`CMP`, `CMPA`, `CMPI`, `TST`

### Control Flow

`JMP`, `JSR`, `RTS`, `BRA`, `BSR`, `BEQ`, `BNE`, `BGE`, `BGT`, `BLE`, `BLT`

## 🧪 Getting Started

### Requirements

- **Node.js** 16+ and **npm** 8+

### Installation

```bash
# Clone repository
git clone https://github.com/gianlucarea/m68k-interpreter.git
cd m68k-interpreter

# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:3000
```

### Available Commands

```bash
# Development
npm run dev              # Start dev server with HMR
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix linting issues
npm run format          # Format with Prettier
npm run type-check      # Check TypeScript

# Testing
npm run test            # Run unit tests
npm run test:ui         # Tests with UI
npm run test:coverage   # Coverage report

# Deployment
npm run deploy          # Deploy to GitHub Pages
```

## 🔧 Configuration

All configuration files are included and pre-configured:

- **`vite.config.ts`** – Bundler configuration
- **`tsconfig.json`** – TypeScript compiler options
- **`.eslintrc.json`** – Linting rules (ESLint v8)
- **`.prettierrc.json`** – Code formatting options
- **`vitest.config.ts`** – Test runner configuration

## 📚 Development

### Adding Features

1. Create component in `src/components/`
2. Add types to `src/types/emulator.ts`
3. Use hooks: `useEmulatorStore()` for state
4. Add styles to `src/styles/main.css`
5. Write tests in `*.test.tsx` files

### Code Standards

- ✅ All code must be TypeScript
- ✅ Use functional components with hooks
- ✅ Run `npm run lint:fix` before commit
- ✅ Format with `npm run format`
- ✅ All functions should have types
- ✅ Write tests for new features

## 🧪 Testing

The project uses Vitest and React Testing Library:

```bash
npm run test              # Run all tests
npm run test -- --watch   # Watch mode
npm run test:coverage     # Generate coverage
npm run test:ui           # Web UI for tests
```

## 📊 Performance

- ✅ Code-splitting for faster loads
- ✅ Tree-shaking enabled
- ✅ CSS minification
- ✅ JavaScript minification
- ✅ Source maps in dev only
- ✅ Lazy component loading

## 🌐 Browser Support

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Before Submitting PR

- [ ] Run `npm run lint:fix`
- [ ] Run `npm run format`
- [ ] Run `npm run type-check`
- [ ] Run `npm run test`
- [ ] Update README if needed

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

## ❤️ Acknowledgments

- Inspired by **Easy68K** simulator
- Built for students, educators, and enthusiasts
- Made with ❤️ using React, TypeScript, and Vite

## ⭐ Show Your Support

If you find this project useful:

- ⭐ Star this repository
- 🐛 Report bugs or request features
- 💬 Share feedback and ideas
- 🔗 Share with others learning assembly
- 🤝 Contribute improvements

---

**Happy coding! 🚀**

---
