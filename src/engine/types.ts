// ============================================================
// KEVLA ENGINE — Type Definitions
// Core data structures for the Entity Component System
// Includes full physics component types (Bullet-style)
// ============================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vector3;
  rotation: Vector3; // Euler angles in degrees
  scale: Vector3;
}

export type MeshType = 'cube' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'torus';

export interface MeshRenderer {
  meshType: MeshType;
  visible: boolean;
}

export interface MaterialComponent {
  color: string;
  metallic: number;
  roughness: number;
  emissive: string;
  opacity: number;
  wireframe: boolean;
}

// ---- Physics types ----

export type ColliderShapeType = 'box' | 'sphere' | 'capsule';

export interface RigidbodyComponent {
  mass: number;           // 0 = static
  useGravity: boolean;
  isKinematic: boolean;
  drag: number;           // linear damping
  angularDrag: number;    // angular damping
  restitution: number;    // bounciness 0..1
  friction: number;       // surface friction 0..1
  velocity: Vector3;
  angularVelocity: Vector3;
  // Constraints
  freezePositionX: boolean;
  freezePositionY: boolean;
  freezePositionZ: boolean;
  freezeRotationX: boolean;
  freezeRotationY: boolean;
  freezeRotationZ: boolean;
}

export interface ColliderComponent {
  shape: ColliderShapeType;
  // Box collider
  size: Vector3;
  // Sphere collider
  radius: number;
  // Capsule collider
  height: number;
  // Common
  center: Vector3;
  isTrigger: boolean;
  showWireframe: boolean;
}

export interface ScriptComponent {
  name: string;
  code: string;
  enabled: boolean;
}

export interface PointLightComponent {
  color: string;
  intensity: number;
  range: number;
}

export interface Entity {
  id: string;
  name: string;
  active: boolean;
  transform: Transform;
  meshRenderer?: MeshRenderer;
  material: MaterialComponent;
  rigidbody?: RigidbodyComponent;
  collider?: ColliderComponent;
  light?: PointLightComponent;
  scripts: ScriptComponent[];
}

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  count: number;
}

export interface SceneData {
  name: string;
  entities: Entity[];
  savedAt: string;
}

// Script presets are now in src/engine/lua.ts (LUA_PRESETS)
// Kept for backward compat - these now use Lua syntax
export const SCRIPT_PRESETS: Record<string, { name: string; code: string }> = {
  rotate: {
    name: 'Rotate',
    code: '-- Rotates the object\nfunction Update(object, dt)\n    object.rotation.y = object.rotation.y + 90 * dt\nend',
  },
  bounce: {
    name: 'Bounce',
    code: '-- Bounces up and down\nfunction Update(object, dt)\n    object.position.y = 1 + math.abs(math.sin(time * 3)) * 2\nend',
  },
  custom: {
    name: 'Custom Script',
    code: '-- Your Lua script\nfunction Update(object, dt)\n    \nend',
  },
};

export const MESH_ICONS: Record<MeshType, string> = {
  cube: '▣',
  sphere: '●',
  cylinder: '⬡',
  plane: '▬',
  cone: '△',
  torus: '◎',
};

export const COLLIDER_ICONS: Record<ColliderShapeType, string> = {
  box: '▣',
  sphere: '●',
  capsule: '⬡',
};
