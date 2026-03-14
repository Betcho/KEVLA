# KEVLA Engine — Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    KEVLA EDITOR                          │
│                                                          │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐ │
│  │Hierarchy │ │ Viewport  │ │Inspector │ │  Console  │ │
│  │  Panel   │ │  (Three)  │ │  Panel   │ │  Panel    │ │
│  └────┬─────┘ └─────┬─────┘ └────┬─────┘ └─────┬─────┘ │
│       │             │            │              │        │
│  ┌────┴─────────────┴────────────┴──────────────┴─────┐ │
│  │              ZUSTAND STORE (Global State)           │ │
│  └────┬─────────────┬────────────┬──────────────┬─────┘ │
│       │             │            │              │        │
│  ┌────┴────┐  ┌─────┴────┐ ┌────┴─────┐ ┌──────┴────┐  │
│  │ Physics │  │ Temporal  │ │   Lua    │ │ Parallel  │  │
│  │ Engine  │  │  Engine   │ │   VM     │ │  Reality  │  │
│  └─────────┘  └──────────┘ └──────────┘ └───────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │              ELECTRON SHELL                        │   │
│  │  main.js (Node) ←→ preload.js ←→ Renderer (React)│   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Module Responsibilities

| Module | File | Purpose |
|--------|------|---------|
| **Store** | `store.ts` | Central state management — entities, selection, play mode, physics, scripting |
| **Physics** | `physics.ts` | AABB broadphase, SAT narrowphase, impulse resolution, contact generation |
| **Temporal** | `temporal.ts` | Frame recording, delta compression, reconstruction, ghost generation |
| **Lua** | `lua.ts` | Lua→JS transpiler, sandboxed VM, entity bindings, input API |
| **Parallel** | `parallel.ts` | Multi-instance simulation, parameter variation, divergence tracking |
| **Types** | `types.ts` | Shared TypeScript interfaces for Entity, Component, Material |
| **Build System** | `buildSystem.ts` | C++ source file definitions for native engine export |

## Data Flow

```
User Input → Store Actions → State Update → React Re-render → Viewport/Panels
                                  ↓
                           Physics Step (60 Hz)
                                  ↓
                           Script Execution
                                  ↓
                           Temporal Recording
                                  ↓
                           Frame Snapshot → Ring Buffer
```

## Entity Component System

Each entity stores its components inline:

```typescript
interface Entity {
  id: string;
  name: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  meshType: MeshType;
  color: string;
  // Components
  hasRigidbody: boolean;
  rigidbody?: RigidbodyState;
  hasCollider: boolean;
  collider?: ColliderState;
  hasScript: boolean;
  script?: string;
}
```

This flat structure was chosen over a pure ECS for simplicity and React rendering performance.
