# KEVLA Engine — Physics System Documentation

## Overview

KEVLA includes a custom rigid body physics engine with broadphase/narrowphase collision detection, impulse-based resolution, and configurable physics materials.

## Rigidbody Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mass` | number | 1.0 | Mass in kg (0 = static/kinematic) |
| `gravity` | boolean | true | Whether gravity applies to this body |
| `drag` | number | 0.01 | Linear velocity damping per frame |
| `angularDrag` | number | 0.05 | Angular velocity damping per frame |
| `restitution` | number | 0.3 | Bounciness (0 = no bounce, 1 = perfect bounce) |
| `friction` | number | 0.5 | Surface friction coefficient |
| `isKinematic` | boolean | false | If true, not affected by forces but still collides |

## Collider Shapes

### Box Collider
- Axis-aligned bounding box
- Configurable width, height, depth
- Default: matches entity scale

### Sphere Collider
- Perfect sphere
- Configurable radius
- Best for rolling objects, projectiles

### Capsule Collider
- Cylinder with hemispherical caps
- Configurable radius and height
- Best for characters

## Collision Detection Pipeline

```
1. Broadphase (AABB)
   ├── Generate AABBs for all colliders
   ├── O(n²) pair testing (sweep & prune planned)
   └── Output: potential collision pairs

2. Narrowphase (SAT)
   ├── Separating Axis Theorem for box-box
   ├── Distance check for sphere-sphere
   ├── Hybrid for box-sphere
   └── Output: contact manifolds (point, normal, depth)

3. Resolution (Impulse-based)
   ├── Calculate relative velocity at contact
   ├── Compute impulse magnitude using restitution
   ├── Apply impulse to both bodies
   ├── Apply friction impulse (tangent direction)
   └── Positional correction (prevent sinking)
```

## Physics Materials

```
Steel:     friction=0.3, restitution=0.1, density=7.8
Wood:      friction=0.5, restitution=0.2, density=0.6
Rubber:    friction=0.8, restitution=0.8, density=1.1
Ice:       friction=0.05, restitution=0.1, density=0.9
Bouncy:    friction=0.3, restitution=0.95, density=1.0
```

## Debug Visualization

Enable physics debug rendering to see:
- **Green wireframes** — Collider shapes
- **Red arrows** — Velocity vectors
- **Yellow arrows** — Force vectors
- **Cyan dots** — Contact points
- **Magenta lines** — Contact normals

## Usage Example

1. Add a **Cube** entity to the scene
2. In the Inspector, click **Add Component → Rigidbody**
3. Set mass to 1.0, enable gravity
4. Click **Add Component → Box Collider**
5. Press **Play** — the cube falls due to gravity
6. The ground plane (if present) provides a static collision surface
