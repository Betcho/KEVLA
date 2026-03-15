// ============================================================
// KEVLA ENGINE — Global State Store (Zustand)
// Full physics + Lua scripting + Temporal Engine integration
// ============================================================

import { create } from 'zustand';
import {
  type Entity,
  type MeshType,
  type MaterialComponent,
  type RigidbodyComponent,
  type ColliderComponent,
  type ColliderShapeType,
  type ScriptComponent,
  type ConsoleMessage,
  type SceneData,
  type MeshRenderer,
} from './types';
import {
  PhysicsWorld,
  createPhysicsBody,
  type PhysicsConfig,
  type Contact,
  type CollisionEvent,
  DEFAULT_PHYSICS_CONFIG,
} from './physics';
import {
  LuaVM,
  createInputState,
  type InputState,
  LUA_PRESETS,
} from './lua';
import {
  TemporalEngine,
  type TemporalConfig,
  type GhostEntity,
  DEFAULT_TEMPORAL_CONFIG,
} from './temporal';
import {
  ParallelEngine,
  type ParallelViewMode,
  type RealityOverrides,
} from './parallel';

// ---- Helpers ----
let _idCounter = 0;
const uid = (prefix = 'entity') => `${prefix}_${Date.now()}_${_idCounter++}`;
const vec3 = (x = 0, y = 0, z = 0) => ({ x, y, z });

const defaultMaterial = (): MaterialComponent => ({
  color: '#5b8def',
  metallic: 0.2,
  roughness: 0.6,
  emissive: '#000000',
  opacity: 1,
  wireframe: false,
});

const defaultRigidbody = (mass = 1): RigidbodyComponent => ({
  mass,
  useGravity: mass > 0,
  isKinematic: mass === 0,
  drag: 0.05,
  angularDrag: 0.1,
  restitution: 0.4,
  friction: 0.5,
  velocity: vec3(),
  angularVelocity: vec3(),
  freezePositionX: false,
  freezePositionY: false,
  freezePositionZ: false,
  freezeRotationX: false,
  freezeRotationY: false,
  freezeRotationZ: false,
});

const defaultBoxCollider = (scale = vec3(1, 1, 1)): ColliderComponent => ({
  shape: 'box',
  size: { ...scale },
  radius: 0.5,
  height: 1,
  center: vec3(),
  isTrigger: false,
  showWireframe: true,
});

const defaultSphereCollider = (): ColliderComponent => ({
  shape: 'sphere',
  size: vec3(1, 1, 1),
  radius: 0.5,
  height: 1,
  center: vec3(),
  isTrigger: false,
  showWireframe: true,
});

// ---- Default scene ----
const createDefaultEntities = (): Entity[] => [
  {
    id: 'ground_plane',
    name: 'Ground',
    active: true,
    transform: { position: vec3(0, -0.05, 0), rotation: vec3(), scale: vec3(20, 0.1, 20) },
    meshRenderer: { meshType: 'cube', visible: true },
    material: { color: '#3d3d3d', metallic: 0.05, roughness: 0.95, emissive: '#000000', opacity: 1, wireframe: false },
    rigidbody: defaultRigidbody(0),
    collider: { shape: 'box', size: vec3(20, 0.1, 20), radius: 0.5, height: 1, center: vec3(), isTrigger: false, showWireframe: false },
    scripts: [],
  },
  {
    id: 'player_cube',
    name: 'Player',
    active: true,
    transform: { position: vec3(0, 0.5, 0), rotation: vec3(), scale: vec3(1, 1, 1) },
    meshRenderer: { meshType: 'cube', visible: true },
    material: { color: '#4488ff', metallic: 0.3, roughness: 0.5, emissive: '#000000', opacity: 1, wireframe: false },
    scripts: [{ name: 'WASD Movement', code: LUA_PRESETS.move_wasd.code, enabled: true }],
  },
  {
    id: 'orbiting_sphere',
    name: 'Orbiter',
    active: true,
    transform: { position: vec3(3, 1.5, 0), rotation: vec3(), scale: vec3(0.8, 0.8, 0.8) },
    meshRenderer: { meshType: 'sphere', visible: true },
    material: { color: '#ff6644', metallic: 0.7, roughness: 0.3, emissive: '#000000', opacity: 1, wireframe: false },
    scripts: [{ name: 'Orbit', code: LUA_PRESETS.orbit.code, enabled: true }],
  },
  {
    id: 'spinning_torus',
    name: 'Spinner',
    active: true,
    transform: { position: vec3(-3, 1, -2), rotation: vec3(), scale: vec3(1.2, 1.2, 1.2) },
    meshRenderer: { meshType: 'torus', visible: true },
    material: { color: '#44cc88', metallic: 0.9, roughness: 0.1, emissive: '#000000', opacity: 1, wireframe: false },
    scripts: [{ name: 'Rotate', code: LUA_PRESETS.rotate.code, enabled: true }],
  },
  {
    id: 'physics_ball',
    name: 'Physics Ball',
    active: true,
    transform: { position: vec3(2, 6, -1), rotation: vec3(), scale: vec3(1, 1, 1) },
    meshRenderer: { meshType: 'sphere', visible: true },
    material: { color: '#ffaa22', metallic: 0.5, roughness: 0.4, emissive: '#000000', opacity: 1, wireframe: false },
    rigidbody: { ...defaultRigidbody(1), restitution: 0.7 },
    collider: defaultSphereCollider(),
    scripts: [],
  },
];

// ---- Initialize input ----
const globalInputState = createInputState();

function setupInputListeners(inputState: InputState): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (!inputState.keys.has(key)) inputState.keysDown.add(key);
    inputState.keys.add(key);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    inputState.keys.delete(key);
    inputState.keysUp.add(key);
  };
  const onMouseMove = (e: MouseEvent) => {
    inputState.mouseX = e.clientX / window.innerWidth;
    inputState.mouseY = e.clientY / window.innerHeight;
    inputState.mouseDeltaX = e.movementX / window.innerWidth;
    inputState.mouseDeltaY = e.movementY / window.innerHeight;
  };
  const onMouseDown = (e: MouseEvent) => { inputState.mouseButtons.add(e.button); };
  const onMouseUp = (e: MouseEvent) => { inputState.mouseButtons.delete(e.button); };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
  };
}

setupInputListeners(globalInputState);

// ---- Sync entities → physics world ----
function syncEntitiesToPhysics(entities: Entity[], world: PhysicsWorld): void {
  world.clear();
  entities.forEach((entity) => {
    if (!entity.active || !entity.rigidbody || !entity.collider) return;
    const body = createPhysicsBody(
      entity.id, entity.transform.position, entity.transform.rotation, entity.transform.scale,
      { mass: entity.rigidbody.mass, useGravity: entity.rigidbody.useGravity, isKinematic: entity.rigidbody.isKinematic,
        drag: entity.rigidbody.drag, angularDrag: entity.rigidbody.angularDrag, restitution: entity.rigidbody.restitution,
        friction: entity.rigidbody.friction, velocity: entity.rigidbody.velocity, angularVelocity: entity.rigidbody.angularVelocity },
      { shape: entity.collider.shape, size: entity.collider.size, center: entity.collider.center,
        radius: entity.collider.radius, height: entity.collider.height, isTrigger: entity.collider.isTrigger }
    );
    world.addBody(body);
  });
}

// ---- Store interface ----
export interface EngineState {
  projectName: string;
  sceneName: string;
  // ===== BRANDING =====
  engineLogo: string | null;       // base64 data URL
  engineName: string;
  engineAccentColor: string;
  entities: Entity[];
  selectedId: string | null;
  entityCounter: number;
  isPlaying: boolean;
  isPaused: boolean;
  prePlaySnapshot: Entity[] | null;
  playTime: number;
  physicsWorld: PhysicsWorld;
  physicsConfig: PhysicsConfig;
  physicsDebug: boolean;
  showColliders: boolean;
  showVelocities: boolean;
  showContacts: boolean;
  debugContacts: Contact[];
  collisionEvents: CollisionEvent[];
  luaVM: LuaVM;
  inputState: InputState;
  scriptErrors: Map<string, string>;
  activeScriptCount: number;
  consoleMessages: ConsoleMessage[];
  activeBottomTab: 'console' | 'assets' | 'physics' | 'scripts';
  showNewSceneDialog: boolean;
  showSaveDialog: boolean;
  showLoadDialog: boolean;

  // ===== TEMPORAL ENGINE =====
  temporalEngine: TemporalEngine;
  temporalConfig: TemporalConfig;
  temporalGhosts: GhostEntity[];

  // ===== PARALLEL REALITY DEBUGGER =====
  parallelEngine: ParallelEngine;
  parallelEnabled: boolean;
  parallelViewMode: ParallelViewMode;

  // ---- Actions ----
  addEntity: (type: MeshType, name?: string) => void;
  removeEntity: (id: string) => void;
  duplicateEntity: (id: string) => void;
  selectEntity: (id: string | null) => void;
  renameEntity: (id: string, name: string) => void;
  toggleEntityActive: (id: string) => void;
  updateTransformField: (id: string, component: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: number) => void;
  setMeshType: (id: string, type: MeshType) => void;
  setMeshVisible: (id: string, visible: boolean) => void;
  updateMaterial: (id: string, updates: Partial<MaterialComponent>) => void;
  addRigidbody: (id: string) => void;
  removeRigidbody: (id: string) => void;
  updateRigidbody: (id: string, updates: Partial<RigidbodyComponent>) => void;
  addCollider: (id: string, shape?: ColliderShapeType) => void;
  removeCollider: (id: string) => void;
  updateCollider: (id: string, updates: Partial<ColliderComponent>) => void;
  setColliderShape: (id: string, shape: ColliderShapeType) => void;
  updatePhysicsConfig: (updates: Partial<PhysicsConfig>) => void;
  togglePhysicsDebug: () => void;
  toggleShowColliders: () => void;
  toggleShowVelocities: () => void;
  toggleShowContacts: () => void;
  applyForceToEntity: (id: string, force: { x: number; y: number; z: number }) => void;
  applyImpulseToEntity: (id: string, impulse: { x: number; y: number; z: number }) => void;
  addLuaScript: (id: string, presetKey: string) => void;
  removeScript: (id: string, index: number) => void;
  updateScript: (id: string, index: number, updates: Partial<ScriptComponent>) => void;
  addScript: (id: string, preset: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  physicsUpdate: (dt: number) => void;
  log: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  clearConsole: () => void;
  saveScene: (name?: string) => void;
  loadScene: (name: string) => void;
  newScene: () => void;
  getSavedSceneNames: () => string[];
  setSceneName: (name: string) => void;
  setActiveBottomTab: (tab: 'console' | 'assets' | 'physics' | 'scripts') => void;
  setShowNewSceneDialog: (show: boolean) => void;
  setShowSaveDialog: (show: boolean) => void;
  setShowLoadDialog: (show: boolean) => void;

  // ===== TEMPORAL ACTIONS =====
  temporalScrub: (frame: number) => void;
  temporalStepForward: () => void;
  temporalStepBackward: () => void;
  temporalJumpToStart: () => void;
  temporalJumpToEnd: () => void;
  temporalForkBranch: (name?: string) => void;
  temporalSwitchBranch: (branchId: string) => void;
  temporalDeleteBranch: (branchId: string) => void;
  temporalAddBookmark: (label: string) => void;
  temporalToggleGhosts: () => void;
  temporalToggleTrails: () => void;
  temporalSetGhostCount: (count: number) => void;
  temporalUpdateConfig: (updates: Partial<TemporalConfig>) => void;

  // ===== PARALLEL REALITY ACTIONS =====
  parallelAutoSetup: () => void;
  parallelCreateFromPreset: (presetKey: string) => void;
  parallelCreateCustom: (name: string, overrides: RealityOverrides) => void;
  parallelRemoveReality: (id: string) => void;
  parallelSetViewMode: (mode: ParallelViewMode) => void;
  parallelPromoteReality: (id: string) => void;
  parallelUpdateOverrides: (id: string, overrides: Partial<RealityOverrides>) => void;
  parallelToggle: () => void;
  parallelReset: () => void;

  // ===== BRANDING ACTIONS =====
  setEngineLogo: (dataUrl: string | null) => void;
  setEngineName: (name: string) => void;
  setEngineAccentColor: (color: string) => void;
  clearBranding: () => void;
}

// ============================================================
// Zustand Store
// ============================================================

export const useEngineStore = create<EngineState>((set, get) => {
  const luaVM = new LuaVM(
    (msg: string, type: 'log' | 'warn' | 'error') => {
      const state = get();
      if (type === 'warn') state.warn(msg);
      else if (type === 'error') state.error(msg);
      else state.log(`📜 ${msg}`);
    },
    globalInputState,
  );

  const temporalEngine = new TemporalEngine();

  return {
    projectName: 'MyGame',
    sceneName: 'KEVLA Demo',
    // ===== BRANDING (persisted in localStorage) =====
    engineLogo: localStorage.getItem('kevla_logo') || null,
    engineName: localStorage.getItem('kevla_engine_name') || 'KEVLA',
    engineAccentColor: localStorage.getItem('kevla_accent') || '#ff8800',
    entities: createDefaultEntities(),
    selectedId: null,
    entityCounter: 5,
    isPlaying: false,
    isPaused: false,
    prePlaySnapshot: null,
    playTime: 0,
    physicsWorld: new PhysicsWorld(),
    physicsConfig: { ...DEFAULT_PHYSICS_CONFIG },
    physicsDebug: true,
    showColliders: true,
    showVelocities: true,
    showContacts: true,
    debugContacts: [],
    collisionEvents: [],
    luaVM,
    inputState: globalInputState,
    scriptErrors: new Map(),
    activeScriptCount: 0,
    consoleMessages: [],
    activeBottomTab: 'console',
    showNewSceneDialog: false,
    showSaveDialog: false,
    showLoadDialog: false,

    // ===== TEMPORAL STATE =====
    temporalEngine,
    temporalConfig: { ...DEFAULT_TEMPORAL_CONFIG },
    temporalGhosts: [],

    // ===== PARALLEL REALITY STATE =====
    parallelEngine: new ParallelEngine(),
    parallelEnabled: false,
    parallelViewMode: 'single' as ParallelViewMode,

    // ===================== Entity Management =====================

    addEntity: (type, name) => {
      const count = get().entityCounter;
      const displayName = name || `${type.charAt(0).toUpperCase() + type.slice(1)} (${count})`;
      const yPos = type === 'plane' ? 0.01 : 3;
      const scale = type === 'plane' ? vec3(5, 1, 5) : vec3(1, 1, 1);
      const newEntity: Entity = {
        id: uid(), name: displayName, active: true,
        transform: { position: vec3((Math.random() - 0.5) * 4, yPos, (Math.random() - 0.5) * 4), rotation: vec3(), scale },
        meshRenderer: { meshType: type, visible: true },
        material: { ...defaultMaterial(), color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') },
        scripts: [],
      };
      set({ entities: [...get().entities, newEntity], entityCounter: count + 1, selectedId: newEntity.id });
      get().log(`Created ${displayName}`);
    },

    removeEntity: (id) => {
      const entity = get().entities.find(e => e.id === id);
      get().luaVM.removeEntity(id);
      set({ entities: get().entities.filter(e => e.id !== id), selectedId: get().selectedId === id ? null : get().selectedId });
      if (entity) get().log(`Deleted ${entity.name}`);
    },

    duplicateEntity: (id) => {
      const source = get().entities.find(e => e.id === id);
      if (!source) return;
      const clone: Entity = JSON.parse(JSON.stringify(source));
      clone.id = uid(); clone.name = `${source.name} (Copy)`; clone.transform.position.x += 1.5;
      set({ entities: [...get().entities, clone], selectedId: clone.id, entityCounter: get().entityCounter + 1 });
      get().log(`Duplicated ${source.name}`);
    },

    selectEntity: (id) => {
      set({ selectedId: id });
      // Update ghosts when selection changes
      if (get().temporalConfig.enabled && get().temporalEngine.getFrameCount() > 0) {
        set({ temporalGhosts: get().temporalEngine.generateGhosts(id) });
      }
    },
    renameEntity: (id, name) => set({ entities: get().entities.map(e => e.id === id ? { ...e, name } : e) }),
    toggleEntityActive: (id) => set({ entities: get().entities.map(e => e.id === id ? { ...e, active: !e.active } : e) }),

    // ===================== Transform =====================
    updateTransformField: (id, component, axis, value) =>
      set({ entities: get().entities.map(e => e.id === id ? { ...e, transform: { ...e.transform, [component]: { ...e.transform[component], [axis]: value } } } : e) }),

    // ===================== Mesh =====================
    setMeshType: (id, type) =>
      set({ entities: get().entities.map(e => e.id === id ? { ...e, meshRenderer: { ...(e.meshRenderer || { visible: true }), meshType: type } as MeshRenderer } : e) }),
    setMeshVisible: (id, visible) =>
      set({ entities: get().entities.map(e => e.id === id && e.meshRenderer ? { ...e, meshRenderer: { ...e.meshRenderer, visible } } : e) }),

    // ===================== Material =====================
    updateMaterial: (id, updates) =>
      set({ entities: get().entities.map(e => e.id === id ? { ...e, material: { ...e.material, ...updates } } : e) }),

    // ===================== Physics Components =====================
    addRigidbody: (id) => {
      set({ entities: get().entities.map(e => e.id === id ? { ...e, rigidbody: defaultRigidbody(1) } : e) });
      get().log('Added Rigidbody component');
    },
    removeRigidbody: (id) => set({ entities: get().entities.map(e => e.id === id ? { ...e, rigidbody: undefined } : e) }),
    updateRigidbody: (id, updates) =>
      set({ entities: get().entities.map(e => e.id === id && e.rigidbody ? { ...e, rigidbody: { ...e.rigidbody, ...updates } } : e) }),
    addCollider: (id, shape = 'box') => {
      const entity = get().entities.find(e => e.id === id);
      const scale = entity?.transform.scale || vec3(1, 1, 1);
      const collider: ColliderComponent = shape === 'sphere' ? defaultSphereCollider()
        : shape === 'capsule' ? { shape: 'capsule', size: vec3(1,1,1), radius: 0.5, height: 1, center: vec3(), isTrigger: false, showWireframe: true }
        : defaultBoxCollider(scale);
      set({ entities: get().entities.map(e => e.id === id ? { ...e, collider } : e) });
      get().log(`Added ${shape} collider`);
    },
    removeCollider: (id) => set({ entities: get().entities.map(e => e.id === id ? { ...e, collider: undefined } : e) }),
    updateCollider: (id, updates) =>
      set({ entities: get().entities.map(e => e.id === id && e.collider ? { ...e, collider: { ...e.collider, ...updates } } : e) }),
    setColliderShape: (id, shape) => {
      set({ entities: get().entities.map(e => {
        if (e.id !== id || !e.collider) return e;
        return { ...e, collider: { ...e.collider, shape, radius: shape === 'sphere' || shape === 'capsule' ? 0.5 : e.collider.radius, height: shape === 'capsule' ? 1 : e.collider.height } };
      })});
    },

    // ===================== Physics World Config =====================
    updatePhysicsConfig: (updates) => {
      const config = { ...get().physicsConfig, ...updates };
      get().physicsWorld.config = config;
      set({ physicsConfig: config });
    },
    togglePhysicsDebug: () => set({ physicsDebug: !get().physicsDebug }),
    toggleShowColliders: () => set({ showColliders: !get().showColliders }),
    toggleShowVelocities: () => set({ showVelocities: !get().showVelocities }),
    toggleShowContacts: () => set({ showContacts: !get().showContacts }),
    applyForceToEntity: (id, force) => { get().physicsWorld.applyForce(id, force); },
    applyImpulseToEntity: (id, impulse) => {
      get().physicsWorld.applyImpulse(id, impulse);
      get().log(`Applied impulse (${impulse.x.toFixed(1)}, ${impulse.y.toFixed(1)}, ${impulse.z.toFixed(1)})`);
    },

    // ===================== Scripts (Lua) =====================
    addLuaScript: (id, presetKey) => {
      const preset = LUA_PRESETS[presetKey] || LUA_PRESETS.custom;
      set({ entities: get().entities.map(e => e.id === id ? { ...e, scripts: [...e.scripts, { name: preset.name, code: preset.code, enabled: true }] } : e) });
      get().log(`Added Lua script: ${preset.name}`);
    },
    addScript: (id, preset) => { get().addLuaScript(id, preset); },
    removeScript: (id, index) => {
      get().luaVM.removeEntity(id);
      set({ entities: get().entities.map(e => e.id === id ? { ...e, scripts: e.scripts.filter((_, i) => i !== index) } : e) });
    },
    updateScript: (id, index, updates) =>
      set({ entities: get().entities.map(e => e.id === id ? { ...e, scripts: e.scripts.map((s, i) => i === index ? { ...s, ...updates } : s) } : e) }),

    // ===================== Playback =====================
    play: () => {
      const state = get();

      // Only take snapshot on fresh play (not resume)
      if (!state.isPlaying) {
        const snapshot = JSON.parse(JSON.stringify(state.entities));
        const world = state.physicsWorld;
        world.config = { ...state.physicsConfig };
        syncEntitiesToPhysics(state.entities, world);
        state.luaVM.reset();
        state.luaVM.setEntityLookup((name: string) => {
          const entity = get().entities.find(e => e.name === name && e.active);
          if (!entity) return null;
          return { position: entity.transform.position, rotation: entity.transform.rotation, scale: entity.transform.scale, name: entity.name };
        });

        let scriptCount = 0;
        state.entities.forEach(entity => {
          entity.scripts.forEach((script, idx) => {
            if (script.enabled) { state.luaVM.compile(entity.id, idx, script.name, script.code); scriptCount++; }
          });
        });

        // Start temporal recording
        state.temporalEngine.reset();
        state.temporalEngine.startRecording();

        set({
          isPlaying: true, isPaused: false, prePlaySnapshot: snapshot, playTime: 0,
          activeScriptCount: scriptCount, scriptErrors: new Map(), temporalGhosts: [],
        });
        state.log(`▶ Play mode — ${scriptCount} scripts, temporal recording started`);
      } else {
        // Resume from pause/scrub
        const temporal = state.temporalEngine;
        temporal.isRecording = true;
        temporal.isScrubbing = false;

        // Re-sync physics from current entity positions
        syncEntitiesToPhysics(state.entities, state.physicsWorld);

        set({ isPaused: false });
        state.log('▶ Resumed — temporal recording continues');
      }
    },

    pause: () => {
      const temporal = get().temporalEngine;
      temporal.isRecording = false; // Stop recording while paused (allows scrubbing)
      set({ isPaused: !get().isPaused });
      get().log(get().isPaused ? '⏸ Paused — use timeline to scrub' : '▶ Resumed');
    },

    stop: () => {
      const snapshot = get().prePlaySnapshot;
      get().physicsWorld.clear();
      get().luaVM.reset();

      // Stop temporal recording but keep data for review
      get().temporalEngine.stopRecording();

      // Reset parallel realities
      get().parallelEngine.reset();

      globalInputState.keys.clear();
      globalInputState.keysDown.clear();
      globalInputState.keysUp.clear();
      globalInputState.mouseButtons.clear();

      set({
        isPlaying: false, isPaused: false,
        entities: snapshot || get().entities,
        prePlaySnapshot: null, playTime: 0,
        debugContacts: [], collisionEvents: [],
        scriptErrors: new Map(), activeScriptCount: 0,
        temporalGhosts: [],
        parallelEnabled: false, parallelViewMode: 'single' as ParallelViewMode,
      });
      get().log('⏹ Stopped — scene restored. Timeline data preserved for review.');
    },

    physicsUpdate: (dt) => {
      const { isPlaying, isPaused, entities, playTime, physicsWorld, luaVM, temporalEngine, temporalConfig, selectedId } = get();
      if (!isPlaying || isPaused) return;

      const time = playTime + dt;
      const newErrors = new Map<string, string>();
      const entitiesToRemove: string[] = [];
      const entitiesToSpawn: { type: string; position: { x: number; y: number; z: number } }[] = [];

      physicsWorld.step(dt);

      let updated = entities.map(entity => {
        if (!entity.active) return entity;
        const pos = { ...entity.transform.position };
        const rot = { ...entity.transform.rotation };
        const scl = { ...entity.transform.scale };

        const body = physicsWorld.getBody(entity.id);
        if (body && entity.rigidbody && !entity.rigidbody.isKinematic) {
          const rb = entity.rigidbody;
          pos.x = rb.freezePositionX ? entity.transform.position.x : body.position.x;
          pos.y = rb.freezePositionY ? entity.transform.position.y : body.position.y;
          pos.z = rb.freezePositionZ ? entity.transform.position.z : body.position.z;
          rot.x = rb.freezeRotationX ? entity.transform.rotation.x : body.rotation.x;
          rot.y = rb.freezeRotationY ? entity.transform.rotation.y : body.rotation.y;
          rot.z = rb.freezeRotationZ ? entity.transform.rotation.z : body.rotation.z;
        }

        entity.scripts.forEach((script, idx) => {
          if (!script.enabled) return;
          luaVM.compile(entity.id, idx, script.name, script.code);
          const bindings = { position: pos, rotation: rot, scale: scl, name: entity.name, active: entity.active };
          const result = luaVM.execute(entity.id, idx, bindings, dt, time);
          if (result.error) newErrors.set(`${entity.id}_${idx}`, result.error);
          if (result.destroyed) entitiesToRemove.push(entity.id);
          if (result.spawned) entitiesToSpawn.push(...result.spawned);
        });

        return {
          ...entity,
          transform: { position: pos, rotation: rot, scale: scl },
          ...(body && entity.rigidbody && !entity.rigidbody.isKinematic ? {
            rigidbody: { ...entity.rigidbody, velocity: { ...body.velocity }, angularVelocity: { ...body.angularVelocity } },
          } : {}),
        };
      });

      if (entitiesToRemove.length > 0) {
        updated = updated.filter(e => !entitiesToRemove.includes(e.id));
        entitiesToRemove.forEach(id => luaVM.removeEntity(id));
      }

      if (entitiesToSpawn.length > 0) {
        entitiesToSpawn.forEach(spawn => {
          const meshType = (['cube', 'sphere', 'cylinder', 'cone', 'torus'] as MeshType[]).find(t => t === spawn.type) || 'cube';
          const newEntity: Entity = {
            id: uid(), name: `Spawned ${meshType}`, active: true,
            transform: { position: { ...spawn.position }, rotation: vec3(), scale: vec3(0.6, 0.6, 0.6) },
            meshRenderer: { meshType, visible: true },
            material: { ...defaultMaterial(), color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') },
            rigidbody: defaultRigidbody(0.5),
            collider: meshType === 'sphere' ? defaultSphereCollider() : defaultBoxCollider(vec3(0.6, 0.6, 0.6)),
            scripts: [],
          };
          updated.push(newEntity);
          if (newEntity.rigidbody && newEntity.collider) {
            const body = createPhysicsBody(newEntity.id, newEntity.transform.position, newEntity.transform.rotation, newEntity.transform.scale,
              { mass: newEntity.rigidbody.mass, useGravity: newEntity.rigidbody.useGravity, isKinematic: newEntity.rigidbody.isKinematic,
                drag: newEntity.rigidbody.drag, angularDrag: newEntity.rigidbody.angularDrag, restitution: newEntity.rigidbody.restitution,
                friction: newEntity.rigidbody.friction, velocity: newEntity.rigidbody.velocity, angularVelocity: newEntity.rigidbody.angularVelocity },
              { shape: newEntity.collider.shape, size: newEntity.collider.size, center: newEntity.collider.center,
                radius: newEntity.collider.radius, height: newEntity.collider.height, isTrigger: newEntity.collider.isTrigger }
            );
            physicsWorld.addBody(body);
          }
        });
      }

      // ===== TEMPORAL: Record this frame (v2 — delta-compressed) =====
      if (temporalConfig.enabled && temporalEngine.isRecording) {
        // Build collision pairs from physics events
        const collisionPairs: [string, string][] = physicsWorld.events
          .filter(ev => ev.type === 'enter' || ev.type === 'stay')
          .map(ev => [ev.entityA, ev.entityB] as [string, string]);

        // Build script error map
        const entityScriptErrors: Record<string, string[]> = {};
        newErrors.forEach((errMsg, key) => {
          const entityId = key.split('_').slice(0, -1).join('_');
          if (!entityScriptErrors[entityId]) entityScriptErrors[entityId] = [];
          entityScriptErrors[entityId].push(errMsg);
        });

        temporalEngine.recordFrame(
          updated, time, dt,
          physicsWorld.stats.activeContacts,
          newErrors.size,
          collisionPairs,
          {}, // script variables (can be populated by LuaVM later)
          entityScriptErrors,
        );
        // Generate ghosts
        const ghosts = temporalEngine.generateGhosts(selectedId);
        set({ temporalGhosts: ghosts });
      }

      // ===== PARALLEL: Step all parallel realities =====
      const pe = get().parallelEngine;
      if (pe.isEnabled && pe.realities.length > 0) {
        pe.stepAll(dt, globalInputState);
      }

      globalInputState.keysDown.clear();
      globalInputState.keysUp.clear();
      globalInputState.mouseDeltaX = 0;
      globalInputState.mouseDeltaY = 0;

      set({
        entities: updated, playTime: time,
        debugContacts: [...physicsWorld.debugContacts],
        collisionEvents: [...physicsWorld.events],
        scriptErrors: newErrors,
      });

      physicsWorld.events.filter(e => e.type === 'enter').forEach(event => {
        const nameA = entities.find(e => e.id === event.entityA)?.name || event.entityA;
        const nameB = event.entityB === '__ground__' ? 'Ground' : entities.find(e => e.id === event.entityB)?.name || event.entityB;
        get().log(`💥 Collision: ${nameA} ↔ ${nameB}`);
      });
    },

    // ===================== Console =====================
    log: (msg) => {
      const msgs = get().consoleMessages;
      const last = msgs[msgs.length - 1];
      if (last && last.message === msg && last.type === 'log') {
        set({ consoleMessages: [...msgs.slice(0, -1), { ...last, count: last.count + 1 }] });
      } else {
        set({ consoleMessages: [...msgs, { id: uid('log'), type: 'log' as const, message: msg, timestamp: new Date().toLocaleTimeString(), count: 1 }].slice(-500) });
      }
    },
    warn: (msg) =>
      set({ consoleMessages: [...get().consoleMessages, { id: uid('warn'), type: 'warn' as const, message: msg, timestamp: new Date().toLocaleTimeString(), count: 1 }].slice(-500) }),
    error: (msg) => {
      const msgs = get().consoleMessages;
      const last = msgs[msgs.length - 1];
      if (last && last.message === msg && last.type === 'error') {
        set({ consoleMessages: [...msgs.slice(0, -1), { ...last, count: last.count + 1 }] });
      } else {
        set({ consoleMessages: [...msgs, { id: uid('err'), type: 'error' as const, message: msg, timestamp: new Date().toLocaleTimeString(), count: 1 }].slice(-500) });
      }
    },
    clearConsole: () => set({ consoleMessages: [] }),

    // ===================== Project / Scene =====================
    saveScene: (name) => {
      const sceneName = name || get().sceneName;
      const data: SceneData = { name: sceneName, entities: get().entities, savedAt: new Date().toISOString() };
      localStorage.setItem(`kevla_scene_${sceneName}`, JSON.stringify(data));
      set({ sceneName });
      get().log(`💾 Scene "${sceneName}" saved`);
    },
    loadScene: (name) => {
      const raw = localStorage.getItem(`kevla_scene_${name}`);
      if (!raw) { get().warn(`Scene "${name}" not found`); return; }
      try {
        const data: SceneData = JSON.parse(raw);
        get().luaVM.clear();
        get().temporalEngine.reset();
        set({ entities: data.entities, sceneName: data.name, selectedId: null, isPlaying: false, isPaused: false, prePlaySnapshot: null, playTime: 0, temporalGhosts: [] });
        get().log(`📂 Scene "${data.name}" loaded (${data.entities.length} entities)`);
      } catch { get().error(`Failed to parse scene "${name}"`); }
    },
    newScene: () => {
      get().physicsWorld.clear();
      get().luaVM.clear();
      get().temporalEngine.reset();
      set({
        entities: createDefaultEntities(), selectedId: null, sceneName: 'New Scene',
        isPlaying: false, isPaused: false, prePlaySnapshot: null, playTime: 0,
        debugContacts: [], collisionEvents: [], scriptErrors: new Map(), temporalGhosts: [],
      });
      get().log('New scene created');
    },
    getSavedSceneNames: () => Object.keys(localStorage).filter(k => k.startsWith('kevla_scene_')).map(k => k.replace('kevla_scene_', '')),
    setSceneName: (name) => set({ sceneName: name }),
    setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
    setShowNewSceneDialog: (show) => set({ showNewSceneDialog: show }),
    setShowSaveDialog: (show) => set({ showSaveDialog: show }),
    setShowLoadDialog: (show) => set({ showLoadDialog: show }),

    // ===================== TEMPORAL ENGINE ACTIONS =====================
    // v2.0: Uses delta-compressed frames. scrubTo/step/jump return EntityState[]
    // and we get the timestamp from FrameMeta separately.

    temporalScrub: (frame: number) => {
      const { temporalEngine, entities } = get();
      const states = temporalEngine.scrubTo(frame);
      if (!states) return;

      const restored = temporalEngine.applySnapshot(states, entities);
      const meta = temporalEngine.getFrameMeta(frame);
      const ghosts = temporalEngine.generateGhosts(get().selectedId);

      set({ entities: restored, playTime: meta?.timestamp ?? get().playTime, temporalGhosts: ghosts });
    },

    temporalStepForward: () => {
      const { temporalEngine, entities } = get();
      const states = temporalEngine.stepForward();
      if (!states) return;
      const restored = temporalEngine.applySnapshot(states, entities);
      const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame);
      const ghosts = temporalEngine.generateGhosts(get().selectedId);
      set({ entities: restored, playTime: meta?.timestamp ?? get().playTime, temporalGhosts: ghosts });
    },

    temporalStepBackward: () => {
      const { temporalEngine, entities } = get();
      const states = temporalEngine.stepBackward();
      if (!states) return;
      const restored = temporalEngine.applySnapshot(states, entities);
      const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame);
      const ghosts = temporalEngine.generateGhosts(get().selectedId);
      set({ entities: restored, playTime: meta?.timestamp ?? get().playTime, temporalGhosts: ghosts });
    },

    temporalJumpToStart: () => {
      const { temporalEngine, entities } = get();
      const states = temporalEngine.jumpToStart();
      if (!states) return;
      const restored = temporalEngine.applySnapshot(states, entities);
      const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame);
      set({ entities: restored, playTime: meta?.timestamp ?? 0, temporalGhosts: temporalEngine.generateGhosts(get().selectedId) });
    },

    temporalJumpToEnd: () => {
      const { temporalEngine, entities } = get();
      const states = temporalEngine.jumpToEnd();
      if (!states) return;
      const restored = temporalEngine.applySnapshot(states, entities);
      const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame);
      set({ entities: restored, playTime: meta?.timestamp ?? get().playTime, temporalGhosts: temporalEngine.generateGhosts(get().selectedId) });
    },

    temporalForkBranch: (name) => {
      const branch = get().temporalEngine.forkBranch(name);
      get().log(`⑂ Forked timeline: "${branch.name}" at frame ${branch.forkFrame}`);
    },

    temporalSwitchBranch: (branchId) => {
      const { temporalEngine, entities } = get();
      if (temporalEngine.switchBranch(branchId)) {
        const states = temporalEngine.reconstructFrame(temporalEngine.currentFrame);
        if (states) {
          const restored = temporalEngine.applySnapshot(states, entities);
          const meta = temporalEngine.getFrameMeta(temporalEngine.currentFrame);
          set({ entities: restored, playTime: meta?.timestamp ?? get().playTime, temporalGhosts: temporalEngine.generateGhosts(get().selectedId) });
        }
        const branch = temporalEngine.getActiveBranch();
        get().log(`Switched to branch: "${branch?.name}"`);
      }
    },

    temporalDeleteBranch: (branchId) => {
      if (get().temporalEngine.deleteBranch(branchId)) {
        get().log('Deleted timeline branch');
      }
    },

    temporalAddBookmark: (label) => {
      get().temporalEngine.addBookmark(label);
      get().log(`🔖 Bookmark "${label}" at frame ${get().temporalEngine.currentFrame}`);
    },

    temporalToggleGhosts: () => {
      const config = get().temporalConfig;
      const newCount = config.ghostCount > 0 ? 0 : 5;
      const newConfig = { ...config, ghostCount: newCount };
      get().temporalEngine.config.ghostCount = newCount;
      const ghosts = newCount > 0 ? get().temporalEngine.generateGhosts(get().selectedId) : [];
      set({ temporalConfig: newConfig, temporalGhosts: ghosts });
    },

    temporalToggleTrails: () => {
      const config = get().temporalConfig;
      const newConfig = { ...config, showTrails: !config.showTrails };
      get().temporalEngine.config.showTrails = newConfig.showTrails;
      set({ temporalConfig: newConfig });
    },

    temporalSetGhostCount: (count) => {
      const config = { ...get().temporalConfig, ghostCount: count };
      get().temporalEngine.config.ghostCount = count;
      const ghosts = count > 0 ? get().temporalEngine.generateGhosts(get().selectedId) : [];
      set({ temporalConfig: config, temporalGhosts: ghosts });
    },

    temporalUpdateConfig: (updates) => {
      const config = { ...get().temporalConfig, ...updates };
      Object.assign(get().temporalEngine.config, updates);
      set({ temporalConfig: config });
    },

    // ===================== PARALLEL REALITY DEBUGGER =====================

    parallelAutoSetup: () => {
      const pe = get().parallelEngine;
      pe.autoSetup(get().entities);
      set({ parallelEnabled: true, parallelViewMode: pe.viewMode });
      get().log('⊞ Parallel Reality: 4 realities created (Default, Low Gravity, High Gravity, Zero Gravity)');
    },

    parallelCreateFromPreset: (presetKey) => {
      const pe = get().parallelEngine;
      const reality = pe.createFromPreset(get().entities, presetKey);
      if (reality) {
        if (!pe.isEnabled) { pe.isEnabled = true; pe.baselineEntities = JSON.parse(JSON.stringify(get().entities)); }
        if (pe.realities.length === 2) pe.viewMode = '1x2';
        else if (pe.realities.length >= 3) pe.viewMode = '2x2';
        set({ parallelEnabled: true, parallelViewMode: pe.viewMode });
        get().log(`⊞ Created reality: ${reality.name}`);
      }
    },

    parallelCreateCustom: (name, overrides) => {
      const pe = get().parallelEngine;
      if (!pe.isEnabled) { pe.isEnabled = true; pe.baselineEntities = JSON.parse(JSON.stringify(get().entities)); }
      pe.createReality(get().entities, overrides, name);
      if (pe.realities.length === 2) pe.viewMode = '1x2';
      else if (pe.realities.length >= 3) pe.viewMode = '2x2';
      set({ parallelEnabled: true, parallelViewMode: pe.viewMode });
      get().log(`⊞ Created custom reality: ${name}`);
    },

    parallelRemoveReality: (id) => {
      const pe = get().parallelEngine;
      pe.removeReality(id);
      set({ parallelViewMode: pe.viewMode, parallelEnabled: pe.realities.length > 0 });
      get().log('Removed parallel reality');
    },

    parallelSetViewMode: (mode) => {
      get().parallelEngine.viewMode = mode;
      set({ parallelViewMode: mode });
    },

    parallelPromoteReality: (id) => {
      const pe = get().parallelEngine;
      const promoted = pe.promoteReality(id);
      if (promoted) {
        set({ entities: promoted });
        get().log('⊞ Promoted reality to main scene');
      }
    },

    parallelUpdateOverrides: (id, overrides) => {
      get().parallelEngine.updateOverrides(id, overrides);
    },

    parallelToggle: () => {
      const pe = get().parallelEngine;
      if (pe.isEnabled) {
        pe.reset();
        set({ parallelEnabled: false, parallelViewMode: 'single' });
        get().log('⊞ Parallel Reality disabled');
      } else {
        pe.autoSetup(get().entities);
        set({ parallelEnabled: true, parallelViewMode: pe.viewMode });
        get().log('⊞ Parallel Reality enabled');
      }
    },

    parallelReset: () => {
      get().parallelEngine.reset();
      set({ parallelEnabled: false, parallelViewMode: 'single' });
    },

    // ===================== BRANDING =====================
    setEngineLogo: (dataUrl) => {
      if (dataUrl) {
        localStorage.setItem('kevla_logo', dataUrl);
      } else {
        localStorage.removeItem('kevla_logo');
      }
      set({ engineLogo: dataUrl });
      get().log(dataUrl ? '🎨 Engine logo updated' : '🎨 Engine logo removed');
    },

    setEngineName: (name) => {
      const trimmed = name.trim() || 'KEVLA';
      localStorage.setItem('kevla_engine_name', trimmed);
      set({ engineName: trimmed });
    },

    setEngineAccentColor: (color) => {
      localStorage.setItem('kevla_accent', color);
      set({ engineAccentColor: color });
      document.documentElement.style.setProperty('--logo-accent', color);
    },

    clearBranding: () => {
      localStorage.removeItem('kevla_logo');
      localStorage.removeItem('kevla_engine_name');
      localStorage.removeItem('kevla_accent');
      set({ engineLogo: null, engineName: 'KEVLA', engineAccentColor: '#ff8800' });
      document.documentElement.style.setProperty('--logo-accent', '#ff8800');
      get().log('🎨 Branding reset to defaults');
    },
  };
});
