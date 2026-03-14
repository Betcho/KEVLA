# Contributing to KEVLA Engine

Thank you for your interest in contributing to KEVLA! This guide will help you get started.

---

## 📋 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

---

## 🚀 Getting Started

### 1. Fork the Repository

Click the **Fork** button on the GitHub page, then clone your fork:

```bash
git clone https://github.com/your-username/kevla.git
cd kevla
npm install
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Use these branch prefixes:
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code refactoring
- `test/` — Adding or updating tests

### 3. Make Your Changes

```bash
npm run dev    # Start dev server
```

### 4. Test Your Changes

```bash
npm run build  # Ensure it builds without errors
```

### 5. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add particle system component"
git commit -m "fix: resolve physics collision jitter"
git commit -m "docs: update scripting API reference"
```

### 6. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

---

## 📁 Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/components/` | React UI components (panels, viewport, etc.) |
| `src/engine/` | Engine systems (physics, scripting, temporal, etc.) |
| `electron/` | Electron main process and preload |
| `assets/` | Branding, logos, screenshots |
| `docs/` | Documentation files |

---

## 🎨 Coding Standards

### TypeScript
- Use strict TypeScript — no `any` unless absolutely necessary
- Prefer `interface` over `type` for object shapes
- Use descriptive variable names
- Add JSDoc comments for public functions

### React Components
- Use functional components with hooks
- Keep components focused — one responsibility per component
- Extract reusable logic into custom hooks

### CSS
- Use CSS custom properties (variables) for theming
- Follow BEM-like naming: `.kv-panel`, `.kv-panel-header`
- Keep styles in `index.css` (single stylesheet)

### File Naming
- Components: `PascalCase.tsx` (e.g., `Hierarchy.tsx`)
- Engine modules: `camelCase.ts` (e.g., `physics.ts`)
- Constants: `UPPER_SNAKE_CASE`

---

## 🔧 Areas for Contribution

### Good First Issues
- Improve documentation
- Add tooltips to UI elements
- Add keyboard shortcuts
- Fix styling issues

### Intermediate
- New primitive mesh types (pyramid, capsule)
- Undo/redo system
- Multi-select in hierarchy
- Asset preview thumbnails

### Advanced
- Vulkan rendering backend
- Animation system
- Particle system
- Visual scripting editor
- Network multiplayer framework

---

## 📝 Pull Request Guidelines

1. **One feature per PR** — Keep pull requests focused
2. **Write a clear description** — Explain what you changed and why
3. **Include screenshots** — For UI changes, add before/after screenshots
4. **Ensure it builds** — Run `npm run build` before submitting
5. **Update documentation** — If your change affects the API, update relevant docs

---

## 🐛 Reporting Bugs

Use the [GitHub Issues](https://github.com/your-username/kevla/issues) page with:

1. **Title**: Brief description of the bug
2. **Environment**: OS, Node.js version, browser/Electron version
3. **Steps to reproduce**: Numbered list of exact steps
4. **Expected behavior**: What should happen
5. **Actual behavior**: What actually happens
6. **Screenshots**: If applicable

---

## 💡 Feature Requests

Open an issue with the `enhancement` label. Include:

1. **Problem**: What problem does this feature solve?
2. **Solution**: How should it work?
3. **Alternatives**: What other approaches did you consider?
4. **Priority**: How important is this to your workflow?

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Thank you for helping make KEVLA better! 🎮</strong>
</p>
