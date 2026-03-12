# Contributing to M68K Interpreter

Thank you for considering contributing to the M68K Interpreter! We welcome contributions of all kinds.

## Code of Conduct

Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request:

1. Check if the issue already exists
2. Open a new issue with a clear title and description
3. Include steps to reproduce for bugs
4. Include your environment (OS, browser, Node version)

### Contributing Code

#### Setup

```bash
git clone https://github.com/gianlucarea/m68k-interpreter.git
cd m68k-interpreter
npm install
npm run dev
```

#### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run checks: `npm run lint:fix && npm run format`
4. Type check: `npm run type-check`
5. Test: `npm run test`
6. Commit: `git commit -m 'Add your feature'`
7. Push: `git push origin feature/your-feature`
8. Open a Pull Request

#### Code Standards

- **TypeScript**: All code must be TypeScript with proper types
- **Functional Components**: Use React hooks, no class components
- **Naming**: Use clear, descriptive names
  - Components: `PascalCase` (e.g., `MyComponent`)
  - Functions: `camelCase` (e.g., `myFunction`)
  - Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_SIZE`)
- **Comments**: Comment complex logic only
- **Imports**: Organize imports alphabetically

#### Code Style

We use **ESLint** and **Prettier** for consistency:

```bash
npm run lint:fix    # Fix linting issues
npm run format      # Format code
```

#### Testing

Write tests for new features:

```bash
npm run test         # Run tests
npm run test:ui      # Test UI
npm run test:coverage # Coverage report
```

#### TypeScript

Ensure your code is fully typed:

```bash
npm run type-check   # Check types
```

### Pull Request Process

1. Update README if adding/changing features
2. Run all checks: `npm run lint:fix && npm run format && npm run type-check && npm run test`
3. Write a clear PR description
4. Link related issues
5. Be responsive to review feedback

### Branches

- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Commit Messages

Write clear commit messages:

```
Add feature description

- Detailed explanation of changes
- Any breaking changes noted
- References to related issues (#123)
```

## Project Structure

```
src/
├── components/    # React components
├── core/          # Core emulator logic
├── stores/        # State management
├── types/         # TypeScript definitions
└── styles/        # CSS stylesheets
```

## Adding a New Feature

1. **Add Component** - Create in `src/components/YourComponent.tsx`
2. **Add Types** - Define in `src/types/emulator.ts`
3. **Update Store** - Modify `src/stores/emulatorStore.ts` if needed
4. **Add Styles** - Update `src/styles/main.css`
5. **Write Tests** - Create `src/components/YourComponent.test.tsx`
6. **Update Docs** - Update README if necessary

## Performance Considerations

- Use `React.memo()` for expensive components
- Implement code-splitting for large features
- Monitor bundle size: `npm run build`
- Profile with browser DevTools

## Documentation

- Keep README updated with new features
- Add JSDoc comments to exported functions
- Document breaking changes

## Release Process

Maintainers:
1. Update version in `package.json`
2. Update CHANGELOG
3. Tag release in git
4. npm automatically publishes via CI/CD

## Questions?

- 💬 Open a discussion
- 📧 Contact maintainers
- 📚 Check existing documentation

---

Thank you for contributing! 🎉
