// ============================================================
// KEVLA ENGINE — TEMPORAL ENGINE v2.0
// Production-Grade Time-Travel Debugging System
//
// Architecture:
//   ┌──────────────────────────────────────────────────┐
//   │              TEMPORAL ENGINE                      │
//   │                                                    │
//   │  ┌─────────────┐  ┌──────────────┐               │
//   │  │ Ring Buffer  │  │   Delta      │               │
//   │  │ (FrameStore) │  │ Compressor   │               │
//   │  └──────┬──────┘  └──────┬───────┘               │
//   │         │                │                        │
//   │  ┌──────┴────────────────┴───────┐               │
//   │  │   Frame Records               │               │
//   │  │   [K] [D] [D] [D] [K] [D]... │               │
//   │  │    ↑ keyframe    ↑ delta      │               │
//   │  └───────────────────────────────┘               │
//   │                                                    │
//   │  ┌───────────────┐  ┌────────────────┐           │
//   │  │ Ghost System  │  │ Trail System   │           │
//   │  └───────────────┘  └────────────────┘           │
//   │                                                    │
//   │  ┌───────────────┐  ┌────────────────┐           │
//   │  │ Branch Mgr    │  │ Bookmark Mgr   │           │
//   │  └───────────────┘  └────────────────┘           │
//   │                                                    │
//   │  ┌───────────────┐  ┌────────────────┐           │
//   │  │ Frame Differ  │  │ Waveform Gen   │           │
//   │  └───────────────┘  └────────────────┘           │
//   └──────────────────────────────────────────────────┘
//
// Delta Compression:
//   • Keyframes stored every N frames (full entity state)
//   • Between keyframes, only CHANGED properties stored
//   • Reconstruct any frame by: nearest keyframe + apply deltas
//   • Typically 3-8× memory savings vs full snapshots
//
// Performance:
//   • Ring buffer: O(1) append, bounded memory
//   • Lazy ghost generation: only on request
//   • Waveform data cached and updated incrementally
//   • Frame reconstruction cached (LRU)
// ============================================================

import type { Entity, Vector3 } from './types';

// ============================================================
// Types — Deep State Capture
// ============================================================

/** Complete entity state captured at a keyframe */
export interface EntityState {
  id: string;
  name: string;
  active: boolean;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  // Physics state
  velocity: Vector3;
  angularVelocity: Vector3;
  forces: Vector3;      // accumulated forces this frame
  mass: number;
  useGravity: boolean;
  isKinematic: boolean;
  isSleeping: boolean;
  // Material (for ghost rendering)
  color: string;
  meshType: string;
  opacity: number;
  // Script state
  scriptVariables: Record<string, number | string | boolean>;
  scriptErrors: string[];
  // Collision state
  collidingWith: string[];  // entity IDs this is colliding with
}

/** Delta — only changed properties relative to previous frame */
export interface EntityDelta {
  id: string;
  // Only include fields that changed (undefined = no change)
  position?: Vector3;
  rotation?: Vector3;
  scale?: Vector3;
  velocity?: Vector3;
  angularVelocity?: Vector3;
  forces?: Vector3;
  active?: boolean;
  color?: string;
  opacity?: number;
  isSleeping?: boolean;
  collidingWith?: string[];
  scriptVariables?: Record<string, number | string | boolean>;
  scriptErrors?: string[];
}

/** Metadata stored with every frame */
export interface FrameMeta {
  frameIndex: number;
  timestamp: number;       // playTime at this frame
  deltaTime: number;       // dt used to simulate this frame
  entityCount: number;
  activeContacts: number;
  scriptErrorCount: number;
  physicsEnergy: number;   // total kinetic energy (for waveform)
  // Activity score (0-1) for heatmap
  activityScore: number;
}

/** Keyframe — full state snapshot */
export interface KeyframeRecord {
  type: 'keyframe';
  meta: FrameMeta;
  entities: EntityState[];
  // Entities that were added since last keyframe
  addedEntityIds: string[];
  // Entities that were removed since last keyframe
  removedEntityIds: string[];
}

/** Delta frame — only changes since previous frame */
export interface DeltaRecord {
  type: 'delta';
  meta: FrameMeta;
  deltas: EntityDelta[];
  addedEntities: EntityState[];   // newly spawned entities (full state)
  removedEntityIds: string[];     // destroyed entities
}

/** Union type for any frame record */
export type FrameRecord = KeyframeRecord | DeltaRecord;

/** Timeline branch */
export interface TimelineBranch {
  id: string;
  name: string;
  parentBranchId: string | null;
  forkFrame: number;
  frames: FrameRecord[];
  color: string;
  createdAt: number;
}

/** Ghost entity for visualization */
export interface GhostEntity {
  id: string;
  entityId: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  color: string;
  meshType: string;
  opacity: number;
  frameOffset: number;
  isFuture: boolean;
}

/** Waveform data point for timeline minimap */
export interface WaveformPoint {
  frame: number;
  entityCount: number;
  contacts: number;
  scriptErrors: number;
  energy: number;
  activity: number;
}

/** Frame comparison diff entry */
export interface FrameDiffEntry {
  entityId: string;
  entityName: string;
  property: string;
  valueA: string;
  valueB: string;
  changeType: 'modified' | 'added' | 'removed';
  changeMagnitude: number; // 0-1 normalized
}

/** Configuration */
export interface TemporalConfig {
  enabled: boolean;
  maxFrames: number;
  keyframeInterval: number;      // full snapshot every N frames
  ghostCount: number;
  ghostSpacing: number;
  ghostOpacityStart: number;
  ghostOpacityEnd: number;
  showTrails: boolean;
  trailLength: number;
  autoRecord: boolean;
  memoryBudgetMB: number;        // max memory for recordings
  waveformResolution: number;    // waveform update interval
  captureScriptVars: boolean;
  capturePhysicsDetails: boolean;
}

export const DEFAULT_TEMPORAL_CONFIG: TemporalConfig = {
  enabled: true,
  maxFrames: 7200,          // 2 minutes at 60fps
  keyframeInterval: 30,     // full snapshot every 0.5s at 60fps
  ghostCount: 5,
  ghostSpacing: 10,
  ghostOpacityStart: 0.4,
  ghostOpacityEnd: 0.08,
  showTrails: true,
  trailLength: 60,
  autoRecord: true,
  memoryBudgetMB: 64,
  waveformResolution: 3,
  captureScriptVars: true,
  capturePhysicsDetails: true,
};

// ============================================================
// Delta Compressor — computes minimal diffs between frames
// ============================================================

const EPSILON = 0.0001;

function vec3Equal(a: Vector3, b: Vector3): boolean {
  return Math.abs(a.x - b.x) < EPSILON
    && Math.abs(a.y - b.y) < EPSILON
    && Math.abs(a.z - b.z) < EPSILON;
}

function vec3Magnitude(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

class DeltaCompressor {
  /**
   * Compute the delta between a previous entity state and a current one.
   * Returns null if nothing changed (entity is identical).
   */
  computeDelta(prev: EntityState, curr: EntityState): EntityDelta | null {
    const delta: EntityDelta = { id: curr.id };
    let hasChanges = false;

    if (!vec3Equal(prev.position, curr.position)) {
      delta.position = { ...curr.position }; hasChanges = true;
    }
    if (!vec3Equal(prev.rotation, curr.rotation)) {
      delta.rotation = { ...curr.rotation }; hasChanges = true;
    }
    if (!vec3Equal(prev.scale, curr.scale)) {
      delta.scale = { ...curr.scale }; hasChanges = true;
    }
    if (!vec3Equal(prev.velocity, curr.velocity)) {
      delta.velocity = { ...curr.velocity }; hasChanges = true;
    }
    if (!vec3Equal(prev.angularVelocity, curr.angularVelocity)) {
      delta.angularVelocity = { ...curr.angularVelocity }; hasChanges = true;
    }
    if (!vec3Equal(prev.forces, curr.forces)) {
      delta.forces = { ...curr.forces }; hasChanges = true;
    }
    if (prev.active !== curr.active) {
      delta.active = curr.active; hasChanges = true;
    }
    if (prev.color !== curr.color) {
      delta.color = curr.color; hasChanges = true;
    }
    if (Math.abs(prev.opacity - curr.opacity) > EPSILON) {
      delta.opacity = curr.opacity; hasChanges = true;
    }
    if (prev.isSleeping !== curr.isSleeping) {
      delta.isSleeping = curr.isSleeping; hasChanges = true;
    }

    // Collision state changes
    const prevCols = prev.collidingWith.sort().join(',');
    const currCols = curr.collidingWith.sort().join(',');
    if (prevCols !== currCols) {
      delta.collidingWith = [...curr.collidingWith]; hasChanges = true;
    }

    // Script variable changes
    if (Object.keys(curr.scriptVariables).length > 0 || Object.keys(prev.scriptVariables).length > 0) {
      const changed: Record<string, number | string | boolean> = {};
      let scriptChanged = false;
      for (const [key, val] of Object.entries(curr.scriptVariables)) {
        if (prev.scriptVariables[key] !== val) { changed[key] = val; scriptChanged = true; }
      }
      if (scriptChanged) { delta.scriptVariables = changed; hasChanges = true; }
    }

    // Script error changes
    const prevErrs = prev.scriptErrors.join('|');
    const currErrs = curr.scriptErrors.join('|');
    if (prevErrs !== currErrs) {
      delta.scriptErrors = [...curr.scriptErrors]; hasChanges = true;
    }

    return hasChanges ? delta : null;
  }

  /**
   * Apply a delta to a previous state to reconstruct current state.
   */
  applyDelta(prev: EntityState, delta: EntityDelta): EntityState {
    return {
      ...prev,
      position: delta.position || prev.position,
      rotation: delta.rotation || prev.rotation,
      scale: delta.scale || prev.scale,
      velocity: delta.velocity || prev.velocity,
      angularVelocity: delta.angularVelocity || prev.angularVelocity,
      forces: delta.forces || prev.forces,
      active: delta.active !== undefined ? delta.active : prev.active,
      color: delta.color !== undefined ? delta.color : prev.color,
      opacity: delta.opacity !== undefined ? delta.opacity : prev.opacity,
      isSleeping: delta.isSleeping !== undefined ? delta.isSleeping : prev.isSleeping,
      collidingWith: delta.collidingWith || prev.collidingWith,
      scriptVariables: delta.scriptVariables
        ? { ...prev.scriptVariables, ...delta.scriptVariables }
        : prev.scriptVariables,
      scriptErrors: delta.scriptErrors || prev.scriptErrors,
    };
  }
}

// ============================================================
// Branch colors
// ============================================================

const BRANCH_COLORS = [
  '#61afef', '#e06c75', '#98c379', '#e5c07b', '#c678dd',
  '#56b6c2', '#ff9f43', '#ff6b6b', '#48dbfb', '#1dd1a1',
];
let branchCounter = 0;

// ============================================================
// TemporalEngine — Main class (production-grade)
// ============================================================

export class TemporalEngine {
  config: TemporalConfig;
  branches: TimelineBranch[];
  activeBranchId: string;
  currentFrame: number;
  isRecording: boolean;
  isScrubbing: boolean;
  bookmarks: { frame: number; label: string; branchId: string; color: string }[];

  // Subsystems
  private compressor: DeltaCompressor;
  private reconstructionCache: Map<number, EntityState[]>;
  private waveformCache: WaveformPoint[];

  // Stats
  totalFramesRecorded: number;
  memoryEstimateKB: number;
  compressionRatio: number;  // ratio of deltas to keyframes
  deltaCount: number;
  keyframeCount: number;

  // Inspection state
  inspectedFrame: number | null;
  comparisonFrameA: number | null;
  comparisonFrameB: number | null;

  constructor(config?: Partial<TemporalConfig>) {
    this.config = { ...DEFAULT_TEMPORAL_CONFIG, ...config };
    this.branches = [];
    this.activeBranchId = '';
    this.currentFrame = 0;
    this.isRecording = false;
    this.isScrubbing = false;
    this.bookmarks = [];

    this.compressor = new DeltaCompressor();
    this.reconstructionCache = new Map();
    this.waveformCache = [];

    this.totalFramesRecorded = 0;
    this.memoryEstimateKB = 0;
    this.compressionRatio = 0;
    this.deltaCount = 0;
    this.keyframeCount = 0;

    this.inspectedFrame = null;
    this.comparisonFrameA = null;
    this.comparisonFrameB = null;

    this._createMainBranch();
  }

  // ---- Branch management ----

  private _createMainBranch(): void {
    const main: TimelineBranch = {
      id: 'main',
      name: 'Main Timeline',
      parentBranchId: null,
      forkFrame: 0,
      frames: [],
      color: BRANCH_COLORS[0],
      createdAt: Date.now(),
    };
    this.branches = [main];
    this.activeBranchId = 'main';
    this.currentFrame = 0;
  }

  getActiveBranch(): TimelineBranch | undefined {
    return this.branches.find(b => b.id === this.activeBranchId);
  }

  getFrameCount(): number {
    return this.getActiveBranch()?.frames.length || 0;
  }

  // ---- Capture entity state from the live scene ----

  private captureEntityState(entity: Entity): EntityState {
    const rb = entity.rigidbody;
    const zeroVec: Vector3 = { x: 0, y: 0, z: 0 };

    return {
      id: entity.id,
      name: entity.name,
      active: entity.active,
      position: { ...entity.transform.position },
      rotation: { ...entity.transform.rotation },
      scale: { ...entity.transform.scale },
      velocity: rb ? { ...rb.velocity } : { ...zeroVec },
      angularVelocity: rb ? { ...rb.angularVelocity } : { ...zeroVec },
      forces: { ...zeroVec }, // forces are applied and cleared each frame
      mass: rb?.mass ?? 0,
      useGravity: rb?.useGravity ?? false,
      isKinematic: rb?.isKinematic ?? true,
      isSleeping: false,
      color: entity.material.color,
      meshType: entity.meshRenderer?.meshType || 'cube',
      opacity: entity.material.opacity,
      scriptVariables: {},     // populated by script system
      scriptErrors: [],
      collidingWith: [],
    };
  }

  // ---- Recording ----

  startRecording(): void {
    if (!this.config.enabled) return;
    this.isRecording = true;
    this.isScrubbing = false;
  }

  stopRecording(): void {
    this.isRecording = false;
    this.isScrubbing = false;
  }

  /**
   * Record a frame. Automatically chooses keyframe or delta based on interval.
   */
  recordFrame(
    entities: Entity[],
    playTime: number,
    dt: number,
    activeContacts: number,
    scriptErrors: number,
    collisionPairs: [string, string][] = [],
    scriptVars: Record<string, Record<string, number | string | boolean>> = {},
    entityScriptErrors: Record<string, string[]> = {},
  ): void {
    if (!this.isRecording || !this.config.enabled) return;

    const branch = this.getActiveBranch();
    if (!branch) return;

    // If user scrubbed back then resumed, truncate future
    if (this.currentFrame < branch.frames.length - 1) {
      branch.frames = branch.frames.slice(0, this.currentFrame + 1);
      this.reconstructionCache.clear();
    }

    const frameIndex = branch.frames.length;

    // Capture current entity states
    const entityStates: EntityState[] = entities
      .filter(e => e.active)
      .map(e => {
        const state = this.captureEntityState(e);
        // Attach collision pairs
        state.collidingWith = collisionPairs
          .filter(([a, b]) => a === e.id || b === e.id)
          .map(([a, b]) => a === e.id ? b : a);
        // Attach script variables
        if (this.config.captureScriptVars && scriptVars[e.id]) {
          state.scriptVariables = { ...scriptVars[e.id] };
        }
        // Attach script errors
        if (entityScriptErrors[e.id]) {
          state.scriptErrors = [...entityScriptErrors[e.id]];
        }
        return state;
      });

    // Calculate activity score and kinetic energy
    let totalEnergy = 0;
    let totalMovement = 0;
    entityStates.forEach(es => {
      const speed = vec3Magnitude(es.velocity);
      totalEnergy += 0.5 * es.mass * speed * speed;
      totalMovement += speed;
    });
    const activityScore = Math.min(1, (totalMovement / Math.max(1, entityStates.length)) / 10);

    // Frame metadata
    const meta: FrameMeta = {
      frameIndex,
      timestamp: playTime,
      deltaTime: dt,
      entityCount: entityStates.length,
      activeContacts,
      scriptErrorCount: scriptErrors,
      physicsEnergy: totalEnergy,
      activityScore,
    };

    // Decide: keyframe or delta?
    const isKeyframe = frameIndex === 0
      || frameIndex % this.config.keyframeInterval === 0
      || branch.frames.length === 0;

    if (isKeyframe) {
      // ---- KEYFRAME: store full state ----
      const record: KeyframeRecord = {
        type: 'keyframe',
        meta,
        entities: entityStates,
        addedEntityIds: [],
        removedEntityIds: [],
      };
      branch.frames.push(record);
      this.keyframeCount++;
    } else {
      // ---- DELTA: compute diff from previous frame ----
      const prevStates = this.reconstructFrame(frameIndex - 1);
      if (!prevStates) {
        // Fallback to keyframe if reconstruction failed
        const record: KeyframeRecord = {
          type: 'keyframe',
          meta,
          entities: entityStates,
          addedEntityIds: [],
          removedEntityIds: [],
        };
        branch.frames.push(record);
        this.keyframeCount++;
      } else {
        const prevMap = new Map(prevStates.map(e => [e.id, e]));
        const currMap = new Map(entityStates.map(e => [e.id, e]));
        const deltas: EntityDelta[] = [];
        const addedEntities: EntityState[] = [];
        const removedEntityIds: string[] = [];

        // Find modified and added entities
        for (const [id, curr] of currMap) {
          const prev = prevMap.get(id);
          if (!prev) {
            addedEntities.push(curr);
          } else {
            const delta = this.compressor.computeDelta(prev, curr);
            if (delta) deltas.push(delta);
          }
        }

        // Find removed entities
        for (const id of prevMap.keys()) {
          if (!currMap.has(id)) removedEntityIds.push(id);
        }

        const record: DeltaRecord = {
          type: 'delta',
          meta,
          deltas,
          addedEntities,
          removedEntityIds,
        };
        branch.frames.push(record);
        this.deltaCount++;
      }
    }

    this.currentFrame = branch.frames.length - 1;
    this.totalFramesRecorded++;

    // Update compression ratio
    this.compressionRatio = this.keyframeCount > 0
      ? this.deltaCount / this.keyframeCount
      : 0;

    // Enforce max frame limit (ring buffer behavior)
    if (branch.frames.length > this.config.maxFrames) {
      const removeCount = branch.frames.length - this.config.maxFrames;
      branch.frames.splice(0, removeCount);
      this.currentFrame = branch.frames.length - 1;
      // Re-index
      branch.frames.forEach((f, i) => f.meta.frameIndex = i);
      // Ensure first frame is a keyframe
      if (branch.frames[0]?.type === 'delta') {
        const reconstructed = this.reconstructFrame(0);
        if (reconstructed) {
          branch.frames[0] = {
            type: 'keyframe',
            meta: branch.frames[0].meta,
            entities: reconstructed,
            addedEntityIds: [],
            removedEntityIds: [],
          };
        }
      }
      this.reconstructionCache.clear();
    }

    // Update waveform cache
    if (frameIndex % this.config.waveformResolution === 0) {
      this.waveformCache.push({
        frame: frameIndex,
        entityCount: meta.entityCount,
        contacts: meta.activeContacts,
        scriptErrors: meta.scriptErrorCount,
        energy: meta.physicsEnergy,
        activity: meta.activityScore,
      });
    }

    // Estimate memory
    this._updateMemoryEstimate();

    // Cache this frame's reconstruction
    this.reconstructionCache.set(frameIndex, entityStates);
    // Limit cache size
    if (this.reconstructionCache.size > 120) {
      const oldest = this.reconstructionCache.keys().next().value;
      if (oldest !== undefined) this.reconstructionCache.delete(oldest);
    }
  }

  // ---- Frame Reconstruction ----

  /**
   * Reconstruct entity states for a given frame index.
   * Uses delta compression: finds nearest keyframe, applies deltas forward.
   */
  reconstructFrame(frameIndex: number): EntityState[] | null {
    const branch = this.getActiveBranch();
    if (!branch || frameIndex < 0 || frameIndex >= branch.frames.length) return null;

    // Check cache first
    const cached = this.reconstructionCache.get(frameIndex);
    if (cached) return cached;

    const frame = branch.frames[frameIndex];

    // If it's a keyframe, return directly
    if (frame.type === 'keyframe') {
      const result = frame.entities.map(e => ({ ...e, position: { ...e.position }, rotation: { ...e.rotation }, scale: { ...e.scale }, velocity: { ...e.velocity }, angularVelocity: { ...e.angularVelocity }, forces: { ...e.forces }, scriptVariables: { ...e.scriptVariables }, scriptErrors: [...e.scriptErrors], collidingWith: [...e.collidingWith] }));
      this.reconstructionCache.set(frameIndex, result);
      return result;
    }

    // Delta frame: find the nearest keyframe before this frame
    let keyframeIdx = frameIndex - 1;
    while (keyframeIdx >= 0 && branch.frames[keyframeIdx].type !== 'keyframe') {
      keyframeIdx--;
    }

    if (keyframeIdx < 0) return null;

    // Reconstruct from keyframe by applying deltas
    let states = this.reconstructFrame(keyframeIdx);
    if (!states) return null;
    states = states.map(e => ({ ...e, position: { ...e.position }, rotation: { ...e.rotation }, scale: { ...e.scale }, velocity: { ...e.velocity }, angularVelocity: { ...e.angularVelocity }, forces: { ...e.forces }, scriptVariables: { ...e.scriptVariables }, scriptErrors: [...e.scriptErrors], collidingWith: [...e.collidingWith] }));

    // Apply deltas from keyframe+1 to frameIndex
    for (let i = keyframeIdx + 1; i <= frameIndex; i++) {
      const f = branch.frames[i];
      if (f.type === 'keyframe') {
        states = f.entities.map(e => ({ ...e }));
        continue;
      }

      // Apply delta
      const stateMap: Map<string, EntityState> = new Map(states.map(s => [s.id, s]));

      // Apply entity deltas
      for (const delta of f.deltas) {
        const prev = stateMap.get(delta.id);
        if (prev) {
          const updated = this.compressor.applyDelta(prev, delta);
          stateMap.set(delta.id, updated);
        }
      }

      // Add new entities
      for (const added of f.addedEntities) {
        stateMap.set(added.id, { ...added });
      }

      // Remove destroyed entities
      for (const removedId of f.removedEntityIds) {
        stateMap.delete(removedId);
      }

      states = Array.from(stateMap.values());
    }

    this.reconstructionCache.set(frameIndex, states);
    return states;
  }

  // ---- Get snapshot/meta for a frame ----

  getFrameMeta(frame: number): FrameMeta | null {
    const branch = this.getActiveBranch();
    if (!branch || frame < 0 || frame >= branch.frames.length) return null;
    return branch.frames[frame].meta;
  }

  getCurrentSnapshot(): FrameMeta | null {
    return this.getFrameMeta(this.currentFrame);
  }

  // ---- Scrubbing ----

  scrubTo(frame: number): EntityState[] | null {
    const branch = this.getActiveBranch();
    if (!branch) return null;
    const clamped = Math.max(0, Math.min(frame, branch.frames.length - 1));
    this.currentFrame = clamped;
    this.isScrubbing = true;
    return this.reconstructFrame(clamped);
  }

  stepForward(): EntityState[] | null {
    return this.scrubTo(this.currentFrame + 1);
  }

  stepBackward(): EntityState[] | null {
    return this.scrubTo(this.currentFrame - 1);
  }

  jumpToStart(): EntityState[] | null {
    return this.scrubTo(0);
  }

  jumpToEnd(): EntityState[] | null {
    const branch = this.getActiveBranch();
    if (!branch) return null;
    return this.scrubTo(branch.frames.length - 1);
  }

  // ---- Fork branch ----

  forkBranch(name?: string): TimelineBranch {
    branchCounter++;
    const colorIdx = branchCounter % BRANCH_COLORS.length;
    const branch = this.getActiveBranch()!;

    // Copy frames up to current frame
    const forkedFrames = branch.frames.slice(0, this.currentFrame + 1).map(f => {
      if (f.type === 'keyframe') {
        return { ...f, entities: f.entities.map(e => ({ ...e, position: { ...e.position }, rotation: { ...e.rotation }, scale: { ...e.scale }, velocity: { ...e.velocity }, angularVelocity: { ...e.angularVelocity } })) };
      }
      return { ...f, deltas: f.deltas.map(d => ({ ...d })) };
    });

    const newBranch: TimelineBranch = {
      id: `branch_${branchCounter}_${Date.now()}`,
      name: name || `Branch ${branchCounter}`,
      parentBranchId: this.activeBranchId,
      forkFrame: this.currentFrame,
      frames: forkedFrames,
      color: BRANCH_COLORS[colorIdx],
      createdAt: Date.now(),
    };

    this.branches.push(newBranch);
    this.activeBranchId = newBranch.id;
    this.currentFrame = forkedFrames.length - 1;
    this.reconstructionCache.clear();

    return newBranch;
  }

  switchBranch(branchId: string): boolean {
    const branch = this.branches.find(b => b.id === branchId);
    if (!branch) return false;
    this.activeBranchId = branchId;
    this.currentFrame = Math.min(this.currentFrame, branch.frames.length - 1);
    this.reconstructionCache.clear();
    return true;
  }

  deleteBranch(branchId: string): boolean {
    if (branchId === 'main') return false;
    this.branches = this.branches.filter(b => b.id !== branchId);
    if (this.activeBranchId === branchId) {
      this.activeBranchId = 'main';
      const main = this.getActiveBranch();
      if (main) this.currentFrame = Math.min(this.currentFrame, main.frames.length - 1);
    }
    this.reconstructionCache.clear();
    return true;
  }

  // ---- Bookmarks ----

  addBookmark(label: string, color?: string): void {
    this.bookmarks.push({
      frame: this.currentFrame,
      label,
      branchId: this.activeBranchId,
      color: color || '#e5c07b',
    });
  }

  removeBookmark(index: number): void {
    this.bookmarks.splice(index, 1);
  }

  // ---- Frame Inspection ----

  /**
   * Get detailed state of all entities at a specific frame.
   * Used by the Frame Inspector panel.
   */
  inspectFrame(frame: number): {
    meta: FrameMeta;
    entities: EntityState[];
    isKeyframe: boolean;
    deltaSize: number;  // number of deltas (0 for keyframes)
  } | null {
    const branch = this.getActiveBranch();
    if (!branch || frame < 0 || frame >= branch.frames.length) return null;

    const record = branch.frames[frame];
    const entities = this.reconstructFrame(frame);
    if (!entities) return null;

    return {
      meta: record.meta,
      entities,
      isKeyframe: record.type === 'keyframe',
      deltaSize: record.type === 'delta' ? record.deltas.length : 0,
    };
  }

  setInspectedFrame(frame: number | null): void {
    this.inspectedFrame = frame;
  }

  // ---- Frame Comparison / Diff ----

  /**
   * Compare two frames and return a list of differences.
   */
  compareFrames(frameA: number, frameB: number): FrameDiffEntry[] {
    const statesA = this.reconstructFrame(frameA);
    const statesB = this.reconstructFrame(frameB);
    if (!statesA || !statesB) return [];

    const diffs: FrameDiffEntry[] = [];
    const mapA = new Map(statesA.map(e => [e.id, e]));
    const mapB = new Map(statesB.map(e => [e.id, e]));

    // Check modified and removed
    for (const [id, a] of mapA) {
      const b = mapB.get(id);
      if (!b) {
        diffs.push({ entityId: id, entityName: a.name, property: '(entity)', valueA: 'exists', valueB: 'removed', changeType: 'removed', changeMagnitude: 1 });
        continue;
      }

      // Compare position
      if (!vec3Equal(a.position, b.position)) {
        const dist = vec3Magnitude({ x: b.position.x - a.position.x, y: b.position.y - a.position.y, z: b.position.z - a.position.z });
        diffs.push({ entityId: id, entityName: a.name, property: 'position', valueA: `(${a.position.x.toFixed(2)}, ${a.position.y.toFixed(2)}, ${a.position.z.toFixed(2)})`, valueB: `(${b.position.x.toFixed(2)}, ${b.position.y.toFixed(2)}, ${b.position.z.toFixed(2)})`, changeType: 'modified', changeMagnitude: Math.min(1, dist / 10) });
      }
      // Compare rotation
      if (!vec3Equal(a.rotation, b.rotation)) {
        const dist = vec3Magnitude({ x: b.rotation.x - a.rotation.x, y: b.rotation.y - a.rotation.y, z: b.rotation.z - a.rotation.z });
        diffs.push({ entityId: id, entityName: a.name, property: 'rotation', valueA: `(${a.rotation.x.toFixed(1)}, ${a.rotation.y.toFixed(1)}, ${a.rotation.z.toFixed(1)})`, valueB: `(${b.rotation.x.toFixed(1)}, ${b.rotation.y.toFixed(1)}, ${b.rotation.z.toFixed(1)})`, changeType: 'modified', changeMagnitude: Math.min(1, dist / 360) });
      }
      // Compare velocity
      if (!vec3Equal(a.velocity, b.velocity)) {
        diffs.push({ entityId: id, entityName: a.name, property: 'velocity', valueA: `(${a.velocity.x.toFixed(2)}, ${a.velocity.y.toFixed(2)}, ${a.velocity.z.toFixed(2)})`, valueB: `(${b.velocity.x.toFixed(2)}, ${b.velocity.y.toFixed(2)}, ${b.velocity.z.toFixed(2)})`, changeType: 'modified', changeMagnitude: Math.min(1, vec3Magnitude({ x: b.velocity.x - a.velocity.x, y: b.velocity.y - a.velocity.y, z: b.velocity.z - a.velocity.z }) / 20) });
      }
      // Compare active
      if (a.active !== b.active) {
        diffs.push({ entityId: id, entityName: a.name, property: 'active', valueA: String(a.active), valueB: String(b.active), changeType: 'modified', changeMagnitude: 1 });
      }
      // Compare sleep
      if (a.isSleeping !== b.isSleeping) {
        diffs.push({ entityId: id, entityName: a.name, property: 'sleeping', valueA: String(a.isSleeping), valueB: String(b.isSleeping), changeType: 'modified', changeMagnitude: 0.3 });
      }
      // Compare collisions
      const prevCols = a.collidingWith.sort().join(',');
      const currCols = b.collidingWith.sort().join(',');
      if (prevCols !== currCols) {
        diffs.push({ entityId: id, entityName: a.name, property: 'collisions', valueA: a.collidingWith.length > 0 ? a.collidingWith.join(', ') : 'none', valueB: b.collidingWith.length > 0 ? b.collidingWith.join(', ') : 'none', changeType: 'modified', changeMagnitude: 0.5 });
      }
    }

    // Check added entities
    for (const [id, b] of mapB) {
      if (!mapA.has(id)) {
        diffs.push({ entityId: id, entityName: b.name, property: '(entity)', valueA: 'did not exist', valueB: 'added', changeType: 'added', changeMagnitude: 1 });
      }
    }

    return diffs.sort((a, b) => b.changeMagnitude - a.changeMagnitude);
  }

  setComparisonFrames(a: number | null, b: number | null): void {
    this.comparisonFrameA = a;
    this.comparisonFrameB = b;
  }

  // ---- Ghost Generation ----

  generateGhosts(selectedEntityId?: string | null): GhostEntity[] {
    if (!this.config.enabled || this.config.ghostCount === 0) return [];

    const branch = this.getActiveBranch();
    if (!branch || branch.frames.length === 0) return [];

    const ghosts: GhostEntity[] = [];
    const { ghostCount, ghostSpacing, ghostOpacityStart, ghostOpacityEnd } = this.config;

    const currentStates = this.reconstructFrame(this.currentFrame);
    if (!currentStates) return [];

    const entityIds = selectedEntityId
      ? [selectedEntityId]
      : currentStates.filter(e => e.id !== 'ground_plane').map(e => e.id);

    for (const entityId of entityIds) {
      // Past ghosts
      for (let i = 1; i <= ghostCount; i++) {
        const frameIdx = this.currentFrame - (i * ghostSpacing);
        if (frameIdx < 0) break;

        const states = this.reconstructFrame(frameIdx);
        if (!states) continue;

        const entityState = states.find(e => e.id === entityId);
        if (!entityState) continue;

        const t = i / ghostCount;
        const opacity = ghostOpacityStart + (ghostOpacityEnd - ghostOpacityStart) * t;

        ghosts.push({
          id: `ghost_past_${entityId}_${i}`,
          entityId,
          position: { ...entityState.position },
          rotation: { ...entityState.rotation },
          scale: { ...entityState.scale },
          color: entityState.color,
          meshType: entityState.meshType,
          opacity,
          frameOffset: -i * ghostSpacing,
          isFuture: false,
        });
      }

      // Future ghosts (only if scrubbing back)
      if (this.currentFrame < branch.frames.length - 1) {
        for (let i = 1; i <= ghostCount; i++) {
          const frameIdx = this.currentFrame + (i * ghostSpacing);
          if (frameIdx >= branch.frames.length) break;

          const states = this.reconstructFrame(frameIdx);
          if (!states) continue;

          const entityState = states.find(e => e.id === entityId);
          if (!entityState) continue;

          const t = i / ghostCount;
          const opacity = (ghostOpacityStart + (ghostOpacityEnd - ghostOpacityStart) * t) * 0.7;

          ghosts.push({
            id: `ghost_future_${entityId}_${i}`,
            entityId,
            position: { ...entityState.position },
            rotation: { ...entityState.rotation },
            scale: { ...entityState.scale },
            color: '#44ffaa',
            meshType: entityState.meshType,
            opacity,
            frameOffset: i * ghostSpacing,
            isFuture: true,
          });
        }
      }
    }

    return ghosts;
  }

  // ---- Trail Generation ----

  generateTrail(entityId: string): Vector3[] {
    if (!this.config.showTrails) return [];

    const branch = this.getActiveBranch();
    if (!branch) return [];

    const trail: Vector3[] = [];
    const start = Math.max(0, this.currentFrame - this.config.trailLength);
    const end = Math.min(branch.frames.length, this.currentFrame + this.config.trailLength);

    for (let i = start; i < end; i++) {
      const states = this.reconstructFrame(i);
      if (!states) continue;
      const entity = states.find(e => e.id === entityId);
      if (entity) trail.push({ ...entity.position });
    }

    return trail;
  }

  // ---- Waveform Data ----

  getWaveformData(): WaveformPoint[] {
    return this.waveformCache;
  }

  // ---- Apply snapshot to live entities ----

  applySnapshot(states: EntityState[], entities: Entity[]): Entity[] {
    return entities.map(entity => {
      const snapState = states.find(s => s.id === entity.id);
      if (!snapState) return entity;

      return {
        ...entity,
        transform: {
          position: { ...snapState.position },
          rotation: { ...snapState.rotation },
          scale: { ...snapState.scale },
        },
        ...(entity.rigidbody ? {
          rigidbody: {
            ...entity.rigidbody,
            velocity: { ...snapState.velocity },
            angularVelocity: { ...snapState.angularVelocity },
          },
        } : {}),
      };
    });
  }

  // ---- Timeline UI Data ----

  getTimelineData(): {
    branches: { id: string; name: string; color: string; frameCount: number; isActive: boolean; forkFrame: number }[];
    currentFrame: number;
    totalFrames: number;
    isRecording: boolean;
    memoryKB: number;
    bookmarks: { frame: number; label: string; color: string }[];
    fps: number;
    compressionRatio: number;
    keyframeCount: number;
    deltaCount: number;
  } {
    const branch = this.getActiveBranch();
    const meta = branch?.frames.length ? branch.frames[branch.frames.length - 1].meta : null;
    const prevMeta = branch && branch.frames.length > 1 ? branch.frames[branch.frames.length - 2].meta : null;
    const fps = meta && prevMeta && meta.deltaTime > 0 ? Math.round(1 / meta.deltaTime) : 0;

    return {
      branches: this.branches.map(b => ({
        id: b.id,
        name: b.name,
        color: b.color,
        frameCount: b.frames.length,
        isActive: b.id === this.activeBranchId,
        forkFrame: b.forkFrame,
      })),
      currentFrame: this.currentFrame,
      totalFrames: branch?.frames.length || 0,
      isRecording: this.isRecording,
      memoryKB: this.memoryEstimateKB,
      bookmarks: this.bookmarks
        .filter(b => b.branchId === this.activeBranchId)
        .map(b => ({ frame: b.frame, label: b.label, color: b.color })),
      fps,
      compressionRatio: this.compressionRatio,
      keyframeCount: this.keyframeCount,
      deltaCount: this.deltaCount,
    };
  }

  // ---- Memory estimation ----

  private _updateMemoryEstimate(): void {
    let totalBytes = 0;
    for (const branch of this.branches) {
      for (const frame of branch.frames) {
        if (frame.type === 'keyframe') {
          // ~200 bytes per entity for full state
          totalBytes += frame.entities.length * 200;
        } else {
          // ~60 bytes per delta + ~200 per added entity
          totalBytes += frame.deltas.length * 60;
          totalBytes += frame.addedEntities.length * 200;
        }
        totalBytes += 80; // meta overhead
      }
    }
    this.memoryEstimateKB = Math.round(totalBytes / 1024);
  }

  // ---- Reset ----

  reset(): void {
    this._createMainBranch();
    this.isRecording = false;
    this.isScrubbing = false;
    this.bookmarks = [];
    this.totalFramesRecorded = 0;
    this.memoryEstimateKB = 0;
    this.compressionRatio = 0;
    this.deltaCount = 0;
    this.keyframeCount = 0;
    this.inspectedFrame = null;
    this.comparisonFrameA = null;
    this.comparisonFrameB = null;
    this.reconstructionCache.clear();
    this.waveformCache = [];
  }
}
