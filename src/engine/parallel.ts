// ============================================================
// KEVLA ENGINE — PARALLEL REALITY DEBUGGER
//
// REVOLUTIONARY FEATURE: Unity does NOT have this.
//
// ┌─────────────────────────────────────────────────────────┐
// │                    DESIGN DOCUMENT                      │
// ├─────────────────────────────────────────────────────────┤
// │                                                         │
// │  1. FEATURE NAME                                        │
// │     Parallel Reality Debugger                           │
// │                                                         │
// │  2. WHAT IT DOES                                        │
// │     Runs 2-4 independent copies of the current scene   │
// │     simultaneously with different physics parameters.   │
// │     Each "reality" has its own gravity, time scale,     │
// │     entity overrides, and simulation state. All render  │
// │     side-by-side in split viewports, allowing instant   │
// │     visual comparison of different configurations.      │
// │                                                         │
// │  3. WHY UNITY DOES NOT HAVE IT                          │
// │     Unity's play mode runs a single simulation          │
// │     instance. There is no built-in way to run multiple  │
// │     parallel physics/script simulations simultaneously  │
// │     with different parameters. To compare behaviors,    │
// │     developers must manually change values, replay,     │
// │     and mentally compare — a slow, error-prone process. │
// │     Unity's architecture (single PhysX world, single    │
// │     scene graph) makes this fundamentally difficult.    │
// │                                                         │
// │  4. WHY IT MAKES KEVLA BETTER                           │
// │     • Instant A/B/C/D testing of physics parameters     │
// │     • See gravity, mass, restitution effects instantly   │
// │     • Compare script behaviors with different inputs     │
// │     • "Promote" the best result to replace main scene   │
// │     • Visual divergence tracking shows exactly where     │
// │       realities differ                                  │
// │     • Saves hours of iterative testing                   │
// │                                                         │
// │  5. IMPLEMENTATION                                      │
// │     Each RealityInstance contains:                       │
// │       • Deep-cloned entity state                        │
// │       • Independent PhysicsWorld                        │
// │       • Parameter overrides (gravity, timeScale, etc.)  │
// │       • Divergence tracking from baseline               │
// │     The ParallelEngine manages all instances and        │
// │     provides a unified step() that advances all         │
// │     realities independently per frame.                  │
// │                                                         │
// │  6. EXAMPLE USE CASE                                    │
// │     A developer is tuning a ball-bouncing mechanic.     │
// │     They open Parallel View (2x2 grid) and create:     │
// │       Reality A: gravity -9.81 (default)               │
// │       Reality B: gravity -5.0 (moon-like)              │
// │       Reality C: gravity -15.0 (heavy planet)          │
// │       Reality D: restitution 0.9 (super bouncy)        │
// │     They press Play and instantly see all four          │
// │     simulations running simultaneously. They pick       │
// │     Reality B as the best feel and "Promote" it —      │
// │     the main scene adopts those parameters.            │
// │                                                         │
// └─────────────────────────────────────────────────────────┘
//
// ============================================================

import type { Entity, Vector3 } from './types';
import { PhysicsWorld, createPhysicsBody, type PhysicsConfig, DEFAULT_PHYSICS_CONFIG } from './physics';
import { LuaVM, createInputState, type InputState } from './lua';

// ---- Types ----

/** What parameters can be overridden per reality */
export interface RealityOverrides {
  gravity?: Vector3;
  timeScale?: number;           // 0.5 = half speed, 2.0 = double speed
  entityOverrides?: {           // per-entity overrides
    [entityId: string]: {
      mass?: number;
      restitution?: number;
      friction?: number;
      useGravity?: boolean;
      scaleMultiplier?: number;
    };
  };
}

/** Tracks how much a reality has diverged from baseline */
export interface DivergenceMetrics {
  totalPositionDelta: number;   // sum of all position differences
  maxPositionDelta: number;     // largest single entity difference
  divergedEntityIds: string[];  // entities that moved differently
  divergencePercentage: number; // 0-100 overall divergence
}

/** A single parallel reality instance */
export interface RealityInstance {
  id: string;
  name: string;
  color: string;                // for UI identification
  entities: Entity[];           // independent entity state
  overrides: RealityOverrides;
  physicsWorld: PhysicsWorld;
  luaVM: LuaVM;
  inputState: InputState;
  playTime: number;
  frameCount: number;
  divergence: DivergenceMetrics;
  isActive: boolean;            // currently rendering
  isPinned: boolean;            // user pinned this reality
  label: string;                // short label for viewport (A, B, C, D)
}

/** Layout mode for split viewports */
export type ParallelViewMode = 'single' | '1x2' | '2x1' | '2x2';

/** Preset configurations for quick setup */
export interface RealityPreset {
  name: string;
  description: string;
  overrides: RealityOverrides;
  color: string;
  label: string;
}

// ---- Constants ----

const REALITY_COLORS = ['#61afef', '#e06c75', '#98c379', '#e5c07b', '#c678dd', '#56b6c2'];
const REALITY_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const REALITY_PRESETS: Record<string, RealityPreset> = {
  default: {
    name: 'Default',
    description: 'No overrides — baseline reality',
    overrides: {},
    color: REALITY_COLORS[0],
    label: 'A',
  },
  low_gravity: {
    name: 'Low Gravity',
    description: 'Moon-like gravity (-1.62)',
    overrides: { gravity: { x: 0, y: -1.62, z: 0 } },
    color: REALITY_COLORS[1],
    label: 'B',
  },
  high_gravity: {
    name: 'High Gravity',
    description: 'Jupiter-like gravity (-24.79)',
    overrides: { gravity: { x: 0, y: -24.79, z: 0 } },
    color: REALITY_COLORS[2],
    label: 'C',
  },
  zero_gravity: {
    name: 'Zero Gravity',
    description: 'Space — no gravity',
    overrides: { gravity: { x: 0, y: 0, z: 0 } },
    color: REALITY_COLORS[3],
    label: 'D',
  },
  slow_motion: {
    name: 'Slow Motion',
    description: 'Half speed simulation',
    overrides: { timeScale: 0.25 },
    color: REALITY_COLORS[4],
    label: 'E',
  },
  fast_forward: {
    name: 'Fast Forward',
    description: 'Double speed simulation',
    overrides: { timeScale: 2.0 },
    color: REALITY_COLORS[5],
    label: 'F',
  },
  bouncy: {
    name: 'Super Bouncy',
    description: 'All objects have high restitution',
    overrides: {
      entityOverrides: {},  // Will be populated at runtime
    },
    color: '#ff9f43',
    label: 'B',
  },
};

// ---- Helper functions ----

let _realityIdCounter = 0;
const uid = () => `reality_${Date.now()}_${_realityIdCounter++}`;

function deepCloneEntities(entities: Entity[]): Entity[] {
  return JSON.parse(JSON.stringify(entities));
}

function applyEntityOverrides(entities: Entity[], overrides: RealityOverrides): Entity[] {
  if (!overrides.entityOverrides) return entities;

  return entities.map(entity => {
    const override = overrides.entityOverrides?.[entity.id];
    if (!override || !entity.rigidbody) return entity;

    return {
      ...entity,
      rigidbody: {
        ...entity.rigidbody,
        ...(override.mass !== undefined ? { mass: override.mass, isKinematic: override.mass === 0, useGravity: override.mass > 0 } : {}),
        ...(override.restitution !== undefined ? { restitution: override.restitution } : {}),
        ...(override.friction !== undefined ? { friction: override.friction } : {}),
        ...(override.useGravity !== undefined ? { useGravity: override.useGravity } : {}),
      },
      ...(override.scaleMultiplier !== undefined ? {
        transform: {
          ...entity.transform,
          scale: {
            x: entity.transform.scale.x * override.scaleMultiplier,
            y: entity.transform.scale.y * override.scaleMultiplier,
            z: entity.transform.scale.z * override.scaleMultiplier,
          },
        },
      } : {}),
    };
  });
}

function computeDivergence(baseline: Entity[], reality: Entity[]): DivergenceMetrics {
  let totalDelta = 0;
  let maxDelta = 0;
  const diverged: string[] = [];

  baseline.forEach(baseEntity => {
    const realEntity = reality.find(e => e.id === baseEntity.id);
    if (!realEntity) return;

    const dx = realEntity.transform.position.x - baseEntity.transform.position.x;
    const dy = realEntity.transform.position.y - baseEntity.transform.position.y;
    const dz = realEntity.transform.position.z - baseEntity.transform.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    totalDelta += dist;
    if (dist > maxDelta) maxDelta = dist;
    if (dist > 0.01) diverged.push(baseEntity.id);
  });

  const numEntities = Math.max(1, baseline.filter(e => e.rigidbody).length);
  const percentage = Math.min(100, (totalDelta / numEntities) * 10);

  return {
    totalPositionDelta: totalDelta,
    maxPositionDelta: maxDelta,
    divergedEntityIds: diverged,
    divergencePercentage: percentage,
  };
}

function syncEntitiesToPhysicsWorld(entities: Entity[], world: PhysicsWorld): void {
  world.clear();
  entities.forEach(entity => {
    if (!entity.active || !entity.rigidbody || !entity.collider) return;
    const body = createPhysicsBody(
      entity.id, entity.transform.position, entity.transform.rotation, entity.transform.scale,
      {
        mass: entity.rigidbody.mass, useGravity: entity.rigidbody.useGravity,
        isKinematic: entity.rigidbody.isKinematic, drag: entity.rigidbody.drag,
        angularDrag: entity.rigidbody.angularDrag, restitution: entity.rigidbody.restitution,
        friction: entity.rigidbody.friction, velocity: entity.rigidbody.velocity,
        angularVelocity: entity.rigidbody.angularVelocity,
      },
      {
        shape: entity.collider.shape, size: entity.collider.size,
        center: entity.collider.center, radius: entity.collider.radius,
        height: entity.collider.height, isTrigger: entity.collider.isTrigger,
      }
    );
    world.addBody(body);
  });
}

// ============================================================
// ParallelEngine — manages multiple reality instances
// ============================================================

export class ParallelEngine {
  realities: RealityInstance[] = [];
  viewMode: ParallelViewMode = 'single';
  isEnabled: boolean = false;
  baselineEntities: Entity[] = []; // snapshot of entities at play start

  // ---- Create a new reality from current scene ----
  createReality(
    entities: Entity[],
    overrides: RealityOverrides,
    name?: string,
    preset?: RealityPreset,
  ): RealityInstance {
    const idx = this.realities.length;
    const color = preset?.color || REALITY_COLORS[idx % REALITY_COLORS.length];
    const label = preset?.label || REALITY_LABELS[idx % REALITY_LABELS.length];

    // Deep clone entities and apply overrides
    const cloned = deepCloneEntities(entities);
    const modified = applyEntityOverrides(cloned, overrides);

    // Create independent physics world with gravity override
    const physicsConfig: PhysicsConfig = {
      ...DEFAULT_PHYSICS_CONFIG,
      ...(overrides.gravity ? { gravity: { ...overrides.gravity } } : {}),
    };
    const physicsWorld = new PhysicsWorld(physicsConfig);

    // Create independent Lua VM and input state
    const inputState = createInputState();
    const luaVM = new LuaVM(
      () => {}, // Suppress console output from parallel realities
      inputState,
    );

    const reality: RealityInstance = {
      id: uid(),
      name: name || preset?.name || `Reality ${label}`,
      color,
      entities: modified,
      overrides,
      physicsWorld,
      luaVM,
      inputState,
      playTime: 0,
      frameCount: 0,
      divergence: { totalPositionDelta: 0, maxPositionDelta: 0, divergedEntityIds: [], divergencePercentage: 0 },
      isActive: true,
      isPinned: false,
      label,
    };

    // Sync entities to physics
    syncEntitiesToPhysicsWorld(modified, physicsWorld);

    // Compile scripts
    modified.forEach(entity => {
      entity.scripts.forEach((script, idx2) => {
        if (script.enabled) luaVM.compile(entity.id, idx2, script.name, script.code);
      });
    });

    this.realities.push(reality);
    return reality;
  }

  // ---- Remove a reality ----
  removeReality(id: string): void {
    this.realities = this.realities.filter(r => r.id !== id);
    if (this.realities.length <= 1) {
      this.viewMode = 'single';
    }
  }

  // ---- Step all realities forward ----
  stepAll(dt: number, mainInputState: InputState): void {
    for (const reality of this.realities) {
      if (!reality.isActive) continue;

      const scaledDt = dt * (reality.overrides.timeScale ?? 1.0);
      reality.playTime += scaledDt;
      reality.frameCount++;

      // Mirror main input to all realities
      reality.inputState.keys = new Set(mainInputState.keys);
      reality.inputState.keysDown = new Set(mainInputState.keysDown);
      reality.inputState.keysUp = new Set(mainInputState.keysUp);
      reality.inputState.mouseX = mainInputState.mouseX;
      reality.inputState.mouseY = mainInputState.mouseY;
      reality.inputState.mouseButtons = new Set(mainInputState.mouseButtons);

      // Run physics
      reality.physicsWorld.step(scaledDt);

      // Update entities from physics
      reality.entities = reality.entities.map(entity => {
        if (!entity.active) return entity;

        const pos = { ...entity.transform.position };
        const rot = { ...entity.transform.rotation };
        const scl = { ...entity.transform.scale };

        // Sync from physics
        const body = reality.physicsWorld.getBody(entity.id);
        if (body && entity.rigidbody && !entity.rigidbody.isKinematic) {
          pos.x = entity.rigidbody.freezePositionX ? entity.transform.position.x : body.position.x;
          pos.y = entity.rigidbody.freezePositionY ? entity.transform.position.y : body.position.y;
          pos.z = entity.rigidbody.freezePositionZ ? entity.transform.position.z : body.position.z;
          rot.x = entity.rigidbody.freezeRotationX ? entity.transform.rotation.x : body.rotation.x;
          rot.y = entity.rigidbody.freezeRotationY ? entity.transform.rotation.y : body.rotation.y;
          rot.z = entity.rigidbody.freezeRotationZ ? entity.transform.rotation.z : body.rotation.z;
        }

        // Run scripts
        entity.scripts.forEach((script, idx) => {
          if (!script.enabled) return;
          reality.luaVM.compile(entity.id, idx, script.name, script.code);
          const bindings = { position: pos, rotation: rot, scale: scl, name: entity.name, active: entity.active };
          reality.luaVM.execute(entity.id, idx, bindings, scaledDt, reality.playTime);
        });

        return {
          ...entity,
          transform: { position: pos, rotation: rot, scale: scl },
          ...(body && entity.rigidbody && !entity.rigidbody.isKinematic ? {
            rigidbody: { ...entity.rigidbody, velocity: { ...body.velocity }, angularVelocity: { ...body.angularVelocity } },
          } : {}),
        };
      });

      // Compute divergence from baseline
      if (this.baselineEntities.length > 0) {
        reality.divergence = computeDivergence(this.baselineEntities, reality.entities);
      }
    }
  }

  // ---- Get entities for a specific reality ----
  getRealityEntities(id: string): Entity[] {
    const reality = this.realities.find(r => r.id === id);
    return reality?.entities || [];
  }

  // ---- Promote a reality's state to become the main entities ----
  promoteReality(id: string): Entity[] | null {
    const reality = this.realities.find(r => r.id === id);
    if (!reality) return null;
    return deepCloneEntities(reality.entities);
  }

  // ---- Get visible realities based on view mode ----
  getVisibleRealities(): RealityInstance[] {
    const maxVisible = this.viewMode === '2x2' ? 4 : this.viewMode === '1x2' || this.viewMode === '2x1' ? 2 : 1;
    return this.realities.filter(r => r.isActive).slice(0, maxVisible);
  }

  // ---- Update overrides for a reality ----
  updateOverrides(id: string, overrides: Partial<RealityOverrides>): void {
    const reality = this.realities.find(r => r.id === id);
    if (!reality) return;

    reality.overrides = { ...reality.overrides, ...overrides };

    // Apply gravity change immediately
    if (overrides.gravity) {
      reality.physicsWorld.config.gravity = { ...overrides.gravity };
    }
  }

  // ---- Apply a preset to create a new reality ----
  createFromPreset(entities: Entity[], presetKey: string): RealityInstance | null {
    const preset = REALITY_PRESETS[presetKey];
    if (!preset) return null;

    // For "bouncy" preset, override all rigidbody entities
    const overrides = { ...preset.overrides };
    if (presetKey === 'bouncy') {
      const entityOverrides: RealityOverrides['entityOverrides'] = {};
      entities.forEach(e => {
        if (e.rigidbody) {
          entityOverrides[e.id] = { restitution: 0.95 };
        }
      });
      overrides.entityOverrides = entityOverrides;
    }

    return this.createReality(entities, overrides, preset.name, preset);
  }

  // ---- Auto-setup: create default comparison set ----
  autoSetup(entities: Entity[]): void {
    this.reset();
    this.baselineEntities = deepCloneEntities(entities);

    // Create 4 realities for 2x2 comparison
    this.createFromPreset(entities, 'default');
    this.createFromPreset(entities, 'low_gravity');
    this.createFromPreset(entities, 'high_gravity');
    this.createFromPreset(entities, 'zero_gravity');

    this.viewMode = '2x2';
    this.isEnabled = true;
  }

  // ---- Reset all realities ----
  reset(): void {
    this.realities.forEach(r => {
      r.physicsWorld.clear();
      r.luaVM.clear();
    });
    this.realities = [];
    this.baselineEntities = [];
    this.isEnabled = false;
    this.viewMode = 'single';
  }

  // ---- Get layout grid dimensions ----
  getGridDimensions(): { cols: number; rows: number } {
    switch (this.viewMode) {
      case '1x2': return { cols: 2, rows: 1 };
      case '2x1': return { cols: 1, rows: 2 };
      case '2x2': return { cols: 2, rows: 2 };
      default: return { cols: 1, rows: 1 };
    }
  }
}
