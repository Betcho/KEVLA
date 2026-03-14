<p align="center">
  <img src="assets/kevla-logo.svg" width="300" alt="KEVLA Engine Logo">
</p>

<h1 align="center">KEVLA Engine</h1>

<p align="center">
  <strong>Keystone Engine for Virtual Landscapes & Adventures</strong>
</p>

<p align="center">
  A production-grade 3D game engine and editor built from the ground up.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-ff6600?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/electron-latest-47848F?style=flat-square&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/typescript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/three.js-r183-000000?style=flat-square&logo=three.js" alt="Three.js">
</p>

---

## 📖 About

**KEVLA** is an open-source 3D game engine designed for indie developers and small studios. It provides a Unity-style visual editor with a modular architecture, real-time 3D viewport, physics simulation, Lua scripting, and features that go beyond traditional game engines — including **Time-Travel Debugging** and **Parallel Reality Testing**.

KEVLA runs as a native desktop application via Electron, delivering a professional development experience on Windows, macOS, and Linux.

---

## ✨ Features

### 🎮 Core Engine
- **Entity Component System** — Add, remove, and configure components on any game object
- **Real-time 3D Viewport** — Interactive scene rendering with Three.js, shadows, and PBR materials
- **Transform System** — Position, rotation, and scale with real-time gizmo manipulation
- **Scene Management** — Save, load, and switch between scenes using JSON serialization

### ⚡ Physics Engine
- **Rigidbody Simulation** — Gravity, mass, drag, and restitution for dynamic objects
- **Collision Detection** — AABB broadphase + SAT narrowphase with impulse resolution
- **Multiple Collider Shapes** — Box, sphere, and capsule colliders with configurable size
- **Physics Materials** — Friction, bounciness, and density per-entity
- **Contact Visualization** — Debug render collision points, normals, and force vectors

### 📜 Lua Scripting
- **Built-in Lua VM** — Write gameplay logic in Lua with full entity API bindings
- **Entity Control** — Access position, rotation, scale, and properties from scripts
- **Input System** — `Input.GetKey()`, `Input.GetKeyDown()`, `Input.GetMouseButton()` APIs
- **12 Script Presets** — WASD movement, auto-rotate, bounce, orbit, patrol, and more
- **Live Script Editor** — Syntax-highlighted editor with compilation status and error display

### ⏪ Time-Travel Debugging
- **Frame Recording** — Automatically captures complete engine state every frame during play mode
- **Timeline Scrubbing** — Drag the timeline slider to rewind or fast-forward through gameplay
- **Delta Compression** — Efficient storage using keyframe + delta encoding (3-30× compression)
- **Ghost Rendering** — Visualize past and future entity positions as transparent overlays
- **Frame Comparison** — Select two frames and diff all entity states side by side
- **Waveform Minimap** — Visual overview of activity, contacts, and energy over time

### 🔀 Parallel Reality Testing
- **Multi-Instance Simulation** — Run 2-4 copies of your scene simultaneously with different parameters
- **Parameter Variation** — Compare gravity values, friction coefficients, or time scales
- **Split Viewport** — View all realities side by side in the 3D viewport
- **Divergence Tracking** — Automatically detect when realities begin to differ

### 🖥 Professional Editor
- **Unity-Style Layout** — Hierarchy, Inspector, Viewport, Console, and Asset Browser panels
- **Resizable Docking** — Drag panel dividers to customize your layout
- **SVG Icon System** — 50+ hand-crafted icons throughout the interface
- **Dark Theme** — Professional dark UI with customizable accent colors
- **Custom Branding** — Upload your own engine logo and change the engine name

### 📦 Build & Distribution
- **Electron Packaging** — Compile to native `.exe` with NSIS installer wizard
- **Cross-Platform** — Windows (NSIS), macOS (DMG), Linux (AppImage)
- **C++ Export** — Full C++ engine source code with CMake build system
- **Desktop Shortcuts** — Start Menu and Desktop shortcuts created by installer

---

## 📥 Download

### Latest Release: v1.0.0

| Platform | Download | Size |
|----------|----------|------|
| Windows  | [KevlaEditor-1.0.0-Setup.exe](https://github.com/your-username/kevla/releases/latest) | ~85 MB |
| macOS    | [KevlaEditor-1.0.0.dmg](https://github.com/your-username/kevla/releases/latest) | ~90 MB |
| Linux    | [KevlaEditor-1.0.0.AppImage](https://github.com/your-username/kevla/releases/latest) | ~80 MB |

> 💡 **No installation required for AppImage** — just download, make executable, and run.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) 9 or later (included with Node.js)
- [Git](https://git-scm.com/)

### Clone the Repository

```bash
git clone https://github.com/your-username/kevla.git
cd kevla
```

### Install Dependencies

```bash
npm install
```

### Run in Development Mode (Browser)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run as Desktop Application

```bash
# Install Electron dependencies
npm install --save-dev electron@latest electron-builder@latest concurrently@latest wait-on@latest

# Run in Electron dev mode (with hot reload)
npm run electron:dev
```

---

## 🔨 Building the Installer

### Quick Build

```bash
# Build the web app
npm run build

# Package as Windows installer
npm run dist
```

### Output

```
release/KevlaEditor-1.0.0-Setup.exe
```

### Installer Features

| Feature | Status |
|---------|--------|
| Welcome screen | ✅ |
| Install location selection | ✅ |
| Installation progress bar | ✅ |
| Finish screen with launch option | ✅ |
| Desktop shortcut | ✅ |
| Start Menu shortcut | ✅ |
| Uninstaller (Add/Remove Programs) | ✅ |

See [BUILD.md](BUILD.md) for detailed build instructions and troubleshooting.

---

## 📂 Project Structure

```
kevla/
│
├── assets/                          # Branding & media
│   ├── kevla-logo.png               # Engine logo (PNG)
│   ├── kevla-logo.svg               # Engine logo (SVG source)
│   └── screenshots/                 # Screenshots for README
│
├── docs/                            # Documentation
│   ├── ARCHITECTURE.md              # Engine architecture overview
│   ├── SCRIPTING.md                 # Lua scripting API reference
│   ├── PHYSICS.md                   # Physics system documentation
│   └── TEMPORAL.md                  # Time-Travel Debugging guide
│
├── electron/                        # Electron desktop wrapper
│   ├── main.js                      # Main process (window, IPC, menus)
│   ├── preload.js                   # Secure IPC bridge
│   └── resources/                   # App icons & installer assets
│       └── icon.ico                 # Windows application icon
│
├── src/                             # Source code
│   ├── components/                  # React UI components
│   │   ├── BottomPanel.tsx          # Console + Asset Browser
│   │   ├── BuildPanel.tsx           # C++ source code browser
│   │   ├── DesktopBuild.tsx         # Electron packaging guide
│   │   ├── ExportManager.tsx        # Source code export
│   │   ├── Hierarchy.tsx            # Entity tree panel
│   │   ├── Icons.tsx                # SVG icon system
│   │   ├── Inspector.tsx            # Component editor panel
│   │   ├── SplashScreen.tsx         # Startup splash screen
│   │   ├── Timeline.tsx             # Time-Travel timeline UI
│   │   ├── Viewport.tsx             # 3D rendering viewport
│   │   └── WindowChrome.tsx         # Native window controls
│   │
│   ├── engine/                      # Engine systems
│   │   ├── buildSystem.ts           # C++ project file definitions
│   │   ├── lua.ts                   # Lua scripting VM
│   │   ├── parallel.ts              # Parallel Reality engine
│   │   ├── physics.ts               # Physics simulation
│   │   ├── store.ts                 # Zustand global state
│   │   ├── temporal.ts              # Time-Travel recording
│   │   └── types.ts                 # TypeScript type definitions
│   │
│   ├── App.tsx                      # Root application component
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles
│
├── .gitignore                       # Git ignore rules
├── BUILD.md                         # Detailed build instructions
├── CHANGELOG.md                     # Version history
├── CONTRIBUTING.md                  # Contribution guidelines
├── LICENSE                          # MIT License
├── README.md                        # This file
├── electron-builder.yml             # Electron Builder config
├── index.html                       # HTML entry point
├── package.json                     # npm configuration
├── tsconfig.json                    # TypeScript config
└── vite.config.ts                   # Vite bundler config
```

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| **UI Framework** | React 19 |
| **Language** | TypeScript 5.9 |
| **3D Rendering** | Three.js r183 |
| **State Management** | Zustand 5 |
| **Build Tool** | Vite 7 |
| **Desktop Runtime** | Electron |
| **Installer** | electron-builder + NSIS |
| **Styling** | Custom CSS + Tailwind CSS |
| **Physics** | Custom AABB + SAT engine |
| **Scripting** | Lua VM (custom transpiler) |

---

## 🎯 Roadmap

### v1.1 — Planned
- [ ] Undo/Redo system
- [ ] Multi-select entities
- [ ] Prefab system
- [ ] Audio system (Web Audio API)

### v1.2 — Planned
- [ ] Terrain editor
- [ ] Particle system
- [ ] Animation system
- [ ] Post-processing effects

### v2.0 — Future
- [ ] Vulkan rendering backend
- [ ] Native C++ runtime for exported games
- [ ] Networked multiplayer framework
- [ ] Visual scripting (node-based)

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Coding standards
- Pull request process

```bash
# Fork the repo, then:
git checkout -b feature/your-feature
# Make your changes
git commit -m "feat: add your feature"
git push origin feature/your-feature
# Open a Pull Request
```

---

## 📄 License

KEVLA Engine is released under the [MIT License](LICENSE).

You are free to use, modify, and distribute KEVLA in both personal and commercial projects.

---

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) — 3D rendering
- [React](https://react.dev/) — UI framework
- [Electron](https://www.electronjs.org/) — Desktop runtime
- [Zustand](https://github.com/pmndrs/zustand) — State management
- [Vite](https://vitejs.dev/) — Build tool
- [Tailwind CSS](https://tailwindcss.com/) — Utility CSS

---

<p align="center">
  <strong>Built with ❤️ by the KEVLA Team</strong>
</p>

<p align="center">
  <a href="https://github.com/your-username/kevla/issues">Report Bug</a> ·
  <a href="https://github.com/your-username/kevla/issues">Request Feature</a> ·
  <a href="https://github.com/your-username/kevla/releases">Download</a>
</p>
