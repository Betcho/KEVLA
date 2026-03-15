// ============================================================
// KEVLA ENGINE — Physics World (Bullet Physics Style)
//
// Full rigid body dynamics engine:
//   • AABB broadphase collision detection
//   • SAT (Separating Axis Theorem) narrowphase for box-box
//   • Sphere-sphere & sphere-box narrowphase
//   • Sequential impulse constraint solver
//   • Semi-implicit Euler integration
//   • Angular velocity & torque
//   • Friction & restitution
//   • Collision events (enter/stay/exit)
//   • Ground plane (infinite static)
//   • Configurable gravity, substeps, iterations
// ============================================================

// ---- Math primitives ----

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const v3Add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

export const v3Sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const v3Scale = (v: Vec3, s: number): Vec3 => ({
  x: v.x * s,
  y: v.y * s,
  z: v.z * s,
});

export const v3Dot = (a: Vec3, b: Vec3): number =>
  a.x * b.x + a.y * b.y + a.z * b.z;

export const v3Cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const v3Len = (v: Vec3): number =>
  Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

export const v3Normalize = (v: Vec3): Vec3 => {
  const l = v3Len(v);
  return l > 1e-8 ? v3Scale(v, 1 / l) : v3(0, 1, 0);
};

export const v3Negate = (v: Vec3): Vec3 => ({ x: -v.x, y: -v.y, z: -v.z });

export const v3Abs = (v: Vec3): Vec3 => ({
  x: Math.abs(v.x),
  y: Math.abs(v.y),
  z: Math.abs(v.z),
});

export const v3Min = (a: Vec3, b: Vec3): Vec3 => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  z: Math.min(a.z, b.z),
});

export const v3Max = (a: Vec3, b: Vec3): Vec3 => ({
  x: Math.max(a.x, b.x),
  y: Math.max(a.y, b.y),
  z: Math.max(a.z, b.z),
});

// ---- AABB ----
export interface AABB {
  min: Vec3;
  max: Vec3;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y &&
    a.min.z <= b.max.z &&
    a.max.z >= b.min.z
  );
}

// ---- Collider types ----
export type ColliderShape = 'box' | 'sphere' | 'capsule';

export interface PhysicsBody {
  entityId: string;

  // Transform
  position: Vec3;
  rotation: Vec3; // Euler degrees (for syncing)

  // Collider
  shape: ColliderShape;
  halfExtents: Vec3; // box half-size
  radius: number;    // sphere/capsule radius
  height: number;    // capsule height
  center: Vec3;      // collider offset
  isTrigger: boolean;

  // Rigidbody
  mass: number;       // 0 = static
  invMass: number;
  useGravity: boolean;
  isKinematic: boolean;

  // Linear dynamics
  velocity: Vec3;
  acceleration: Vec3;
  force: Vec3;

  // Angular dynamics
  angularVelocity: Vec3;
  torque: Vec3;
  inertia: Vec3;      // diagonal inertia tensor
  invInertia: Vec3;

  // Material
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;

  // State
  isSleeping: boolean;
  sleepTimer: number;
}

// ---- Contact / collision ----
export interface Contact {
  bodyA: string; // entity IDs
  bodyB: string;
  normal: Vec3;          // A → B
  penetration: number;
  contactPoint: Vec3;
  impulse: number;       // resolved impulse magnitude
}

export interface CollisionEvent {
  type: 'enter' | 'stay' | 'exit';
  entityA: string;
  entityB: string;
  contacts: Contact[];
}

// ---- Physics world configuration ----
export interface PhysicsConfig {
  gravity: Vec3;
  substeps: number;         // physics substeps per frame
  solverIterations: number; // constraint solver iterations
  groundEnabled: boolean;
  groundY: number;
  sleepThreshold: number;
  sleepTimeRequired: number;
  maxVelocity: number;
  maxAngularVelocity: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: v3(0, -9.81, 0),
  substeps: 4,
  solverIterations: 8,
  groundEnabled: true,
  groundY: 0,
  sleepThreshold: 0.05,
  sleepTimeRequired: 1.0,
  maxVelocity: 50,
  maxAngularVelocity: 30,
};

// ---- Inertia tensor for shapes ----
function computeInertia(shape: ColliderShape, mass: number, halfExtents: Vec3, radius: number): Vec3 {
  if (mass <= 0) return v3(0, 0, 0);

  if (shape === 'sphere') {
    const I = (2 / 5) * mass * radius * radius;
    return v3(I, I, I);
  }

  if (shape === 'capsule') {
    // Approximate as cylinder + 2 hemispheres
    const I = (1 / 12) * mass * (3 * radius * radius + halfExtents.y * halfExtents.y * 4);
    return v3(I, (0.5) * mass * radius * radius, I);
  }

  // Box
  const sx = halfExtents.x * 2;
  const sy = halfExtents.y * 2;
  const sz = halfExtents.z * 2;
  return v3(
    (1 / 12) * mass * (sy * sy + sz * sz),
    (1 / 12) * mass * (sx * sx + sz * sz),
    (1 / 12) * mass * (sx * sx + sy * sy)
  );
}

// ---- Compute AABB for a body ----
function bodyAABB(body: PhysicsBody): AABB {
  const p = v3Add(body.position, body.center);

  if (body.shape === 'sphere') {
    return {
      min: v3Sub(p, v3(body.radius, body.radius, body.radius)),
      max: v3Add(p, v3(body.radius, body.radius, body.radius)),
    };
  }

  if (body.shape === 'capsule') {
    const r = body.radius;
    const h = body.height * 0.5;
    return {
      min: v3(p.x - r, p.y - h - r, p.z - r),
      max: v3(p.x + r, p.y + h + r, p.z + r),
    };
  }

  // Box
  return {
    min: v3Sub(p, body.halfExtents),
    max: v3Add(p, body.halfExtents),
  };
}

// ---- Narrowphase: Sphere vs Sphere ----
function sphereVsSphere(a: PhysicsBody, b: PhysicsBody): Contact | null {
  const pA = v3Add(a.position, a.center);
  const pB = v3Add(b.position, b.center);
  const diff = v3Sub(pB, pA);
  const dist = v3Len(diff);
  const minDist = a.radius + b.radius;

  if (dist >= minDist) return null;

  const normal = dist > 1e-6 ? v3Scale(diff, 1 / dist) : v3(0, 1, 0);
  const penetration = minDist - dist;
  const contactPoint = v3Add(pA, v3Scale(normal, a.radius));

  return {
    bodyA: a.entityId,
    bodyB: b.entityId,
    normal,
    penetration,
    contactPoint,
    impulse: 0,
  };
}

// ---- Narrowphase: Sphere vs Box ----
function sphereVsBox(sphere: PhysicsBody, box: PhysicsBody, flip: boolean): Contact | null {
  const sPos = v3Add(sphere.position, sphere.center);
  const bPos = v3Add(box.position, box.center);

  // Clamp sphere center to box bounds
  const clamped = v3(
    Math.max(bPos.x - box.halfExtents.x, Math.min(sPos.x, bPos.x + box.halfExtents.x)),
    Math.max(bPos.y - box.halfExtents.y, Math.min(sPos.y, bPos.y + box.halfExtents.y)),
    Math.max(bPos.z - box.halfExtents.z, Math.min(sPos.z, bPos.z + box.halfExtents.z))
  );

  const diff = v3Sub(sPos, clamped);
  const dist = v3Len(diff);

  if (dist >= sphere.radius) return null;

  let normal: Vec3;
  if (dist > 1e-6) {
    normal = v3Scale(diff, 1 / dist);
  } else {
    // Sphere center is inside the box — push out along smallest axis
    const dx = box.halfExtents.x - Math.abs(sPos.x - bPos.x);
    const dy = box.halfExtents.y - Math.abs(sPos.y - bPos.y);
    const dz = box.halfExtents.z - Math.abs(sPos.z - bPos.z);
    if (dx <= dy && dx <= dz) normal = v3(sPos.x > bPos.x ? 1 : -1, 0, 0);
    else if (dy <= dz) normal = v3(0, sPos.y > bPos.y ? 1 : -1, 0);
    else normal = v3(0, 0, sPos.z > bPos.z ? 1 : -1);
  }

  const penetration = sphere.radius - dist;

  // If we flipped the arguments, flip the normal
  if (flip) {
    return {
      bodyA: box.entityId,
      bodyB: sphere.entityId,
      normal: v3Negate(normal),
      penetration,
      contactPoint: clamped,
      impulse: 0,
    };
  }

  return {
    bodyA: sphere.entityId,
    bodyB: box.entityId,
    normal,
    penetration,
    contactPoint: clamped,
    impulse: 0,
  };
}

// ---- Narrowphase: Box vs Box (SAT) ----
function boxVsBox(a: PhysicsBody, b: PhysicsBody): Contact | null {
  const pA = v3Add(a.position, a.center);
  const pB = v3Add(b.position, b.center);
  const diff = v3Sub(pB, pA);

  // Test 3 separating axes (axis-aligned, no rotation for simplicity)
  const overlapX = (a.halfExtents.x + b.halfExtents.x) - Math.abs(diff.x);
  if (overlapX <= 0) return null;

  const overlapY = (a.halfExtents.y + b.halfExtents.y) - Math.abs(diff.y);
  if (overlapY <= 0) return null;

  const overlapZ = (a.halfExtents.z + b.halfExtents.z) - Math.abs(diff.z);
  if (overlapZ <= 0) return null;

  // Find minimum penetration axis
  let normal: Vec3;
  let penetration: number;

  if (overlapX <= overlapY && overlapX <= overlapZ) {
    penetration = overlapX;
    normal = v3(diff.x > 0 ? 1 : -1, 0, 0);
  } else if (overlapY <= overlapZ) {
    penetration = overlapY;
    normal = v3(0, diff.y > 0 ? 1 : -1, 0);
  } else {
    penetration = overlapZ;
    normal = v3(0, 0, diff.z > 0 ? 1 : -1);
  }

  // Contact point: midpoint along collision axis
  const contactPoint = v3(
    (Math.max(pA.x - a.halfExtents.x, pB.x - b.halfExtents.x) +
      Math.min(pA.x + a.halfExtents.x, pB.x + b.halfExtents.x)) *
      0.5,
    (Math.max(pA.y - a.halfExtents.y, pB.y - b.halfExtents.y) +
      Math.min(pA.y + a.halfExtents.y, pB.y + b.halfExtents.y)) *
      0.5,
    (Math.max(pA.z - a.halfExtents.z, pB.z - b.halfExtents.z) +
      Math.min(pA.z + a.halfExtents.z, pB.z + b.halfExtents.z)) *
      0.5
  );

  return {
    bodyA: a.entityId,
    bodyB: b.entityId,
    normal,
    penetration,
    contactPoint,
    impulse: 0,
  };
}

// ---- Ground plane collision ----
function bodyVsGround(body: PhysicsBody, groundY: number): Contact | null {
  const p = v3Add(body.position, body.center);
  let penetration = 0;
  let contactY = groundY;

  if (body.shape === 'sphere') {
    penetration = (groundY + body.radius) - p.y;
    contactY = groundY;
  } else if (body.shape === 'capsule') {
    const bottomY = p.y - body.height * 0.5 - body.radius;
    penetration = groundY - bottomY;
    contactY = groundY;
  } else {
    // Box
    const bottomY = p.y - body.halfExtents.y;
    penetration = groundY - bottomY;
    contactY = groundY;
  }

  if (penetration <= 0) return null;

  return {
    bodyA: body.entityId,
    bodyB: '__ground__',
    normal: v3(0, 1, 0),
    penetration,
    contactPoint: v3(p.x, contactY, p.z),
    impulse: 0,
  };
}

// ============================================================
// PhysicsWorld — Main simulation class
// ============================================================

export class PhysicsWorld {
  config: PhysicsConfig;
  bodies: Map<string, PhysicsBody>;
  contacts: Contact[];
  events: CollisionEvent[];
  prevContactPairs: Set<string>; // for enter/exit detection
  debugContacts: Contact[];      // exposed for rendering
  stats: {
    broadphaseTests: number;
    narrowphaseTests: number;
    activeContacts: number;
    activeBodies: number;
    sleepingBodies: number;
  };

  constructor(config?: Partial<PhysicsConfig>) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
    this.bodies = new Map();
    this.contacts = [];
    this.events = [];
    this.prevContactPairs = new Set();
    this.debugContacts = [];
    this.stats = {
      broadphaseTests: 0,
      narrowphaseTests: 0,
      activeContacts: 0,
      activeBodies: 0,
      sleepingBodies: 0,
    };
  }

  // ---- Register/unregister bodies ----
  addBody(body: PhysicsBody): void {
    // Compute derived quantities
    body.invMass = body.mass > 0 && !body.isKinematic ? 1 / body.mass : 0;
    body.inertia = computeInertia(body.shape, body.mass, body.halfExtents, body.radius);
    body.invInertia = v3(
      body.inertia.x > 0 ? 1 / body.inertia.x : 0,
      body.inertia.y > 0 ? 1 / body.inertia.y : 0,
      body.inertia.z > 0 ? 1 / body.inertia.z : 0
    );
    this.bodies.set(body.entityId, body);
  }

  removeBody(entityId: string): void {
    this.bodies.delete(entityId);
  }

  getBody(entityId: string): PhysicsBody | undefined {
    return this.bodies.get(entityId);
  }

  clear(): void {
    this.bodies.clear();
    this.contacts = [];
    this.events = [];
    this.prevContactPairs.clear();
  }

  // ---- Apply forces ----
  applyForce(entityId: string, force: Vec3): void {
    const body = this.bodies.get(entityId);
    if (!body || body.invMass === 0) return;
    body.force = v3Add(body.force, force);
  }

  applyImpulse(entityId: string, impulse: Vec3): void {
    const body = this.bodies.get(entityId);
    if (!body || body.invMass === 0) return;
    body.velocity = v3Add(body.velocity, v3Scale(impulse, body.invMass));
  }

  applyTorque(entityId: string, torque: Vec3): void {
    const body = this.bodies.get(entityId);
    if (!body || body.invMass === 0) return;
    body.torque = v3Add(body.torque, torque);
  }

  // ---- Main step ----
  step(dt: number): void {
    if (dt <= 0) return;

    const subDt = dt / this.config.substeps;

    for (let sub = 0; sub < this.config.substeps; sub++) {
      this._integrateForces(subDt);
      const contacts = this._detectCollisions();
      this._solveConstraints(contacts, subDt);
      this._integrateVelocities(subDt);
      this._updateSleep(subDt);
    }

    // Generate collision events
    this._generateEvents();
  }

  // ---- Integration: apply forces to velocities ----
  private _integrateForces(dt: number): void {
    const g = this.config.gravity;

    this.bodies.forEach((body) => {
      if (body.invMass === 0 || body.isKinematic || body.isSleeping) return;

      // Gravity
      if (body.useGravity) {
        body.velocity = v3Add(body.velocity, v3Scale(g, dt));
      }

      // External force → acceleration → velocity
      if (body.mass > 0) {
        const accel = v3Scale(body.force, body.invMass);
        body.velocity = v3Add(body.velocity, v3Scale(accel, dt));
      }

      // External torque → angular acceleration → angular velocity
      body.angularVelocity = v3Add(body.angularVelocity, v3(
        body.invInertia.x * body.torque.x * dt,
        body.invInertia.y * body.torque.y * dt,
        body.invInertia.z * body.torque.z * dt
      ));

      // Damping
      body.velocity = v3Scale(body.velocity, Math.max(0, 1 - body.linearDamping * dt));
      body.angularVelocity = v3Scale(body.angularVelocity, Math.max(0, 1 - body.angularDamping * dt));

      // Clamp velocities
      const vLen = v3Len(body.velocity);
      if (vLen > this.config.maxVelocity) {
        body.velocity = v3Scale(v3Normalize(body.velocity), this.config.maxVelocity);
      }
      const avLen = v3Len(body.angularVelocity);
      if (avLen > this.config.maxAngularVelocity) {
        body.angularVelocity = v3Scale(v3Normalize(body.angularVelocity), this.config.maxAngularVelocity);
      }

      // Clear forces (applied per-frame, not persistent)
      body.force = v3();
      body.torque = v3();
    });
  }

  // ---- Broadphase + Narrowphase ----
  private _detectCollisions(): Contact[] {
    const contacts: Contact[] = [];
    const bodyArr = Array.from(this.bodies.values()).filter(
      (b) => !b.isSleeping
    );

    let broadTests = 0;
    let narrowTests = 0;

    // ---- Body vs Body (broadphase: AABB, narrowphase: shape-specific) ----
    for (let i = 0; i < bodyArr.length; i++) {
      for (let j = i + 1; j < bodyArr.length; j++) {
        const a = bodyArr[i];
        const b = bodyArr[j];

        // Skip if both are static/kinematic
        if (a.invMass === 0 && b.invMass === 0) continue;

        broadTests++;

        const aabbA = bodyAABB(a);
        const aabbB = bodyAABB(b);

        if (!aabbOverlap(aabbA, aabbB)) continue;

        narrowTests++;

        let contact: Contact | null = null;

        // Dispatch based on shapes
        if (a.shape === 'sphere' && b.shape === 'sphere') {
          contact = sphereVsSphere(a, b);
        } else if (a.shape === 'sphere' && b.shape === 'box') {
          contact = sphereVsBox(a, b, false);
        } else if (a.shape === 'box' && b.shape === 'sphere') {
          contact = sphereVsBox(b, a, true);
        } else {
          // box-box or any fallback
          contact = boxVsBox(a, b);
        }

        if (contact) {
          contacts.push(contact);
        }
      }
    }

    // ---- Body vs Ground ----
    if (this.config.groundEnabled) {
      bodyArr.forEach((body) => {
        if (body.invMass === 0) return;
        const contact = bodyVsGround(body, this.config.groundY);
        if (contact) contacts.push(contact);
      });
    }

    this.stats.broadphaseTests = broadTests;
    this.stats.narrowphaseTests = narrowTests;
    this.stats.activeContacts = contacts.length;
    this.stats.activeBodies = bodyArr.filter((b) => b.invMass > 0).length;
    this.stats.sleepingBodies = Array.from(this.bodies.values()).filter((b) => b.isSleeping).length;

    this.contacts = contacts;
    this.debugContacts = [...contacts];

    return contacts;
  }

  // ---- Sequential Impulse Solver ----
  private _solveConstraints(contacts: Contact[], _dt: number): void {
    for (let iter = 0; iter < this.config.solverIterations; iter++) {
      for (const contact of contacts) {
        const bodyA = this.bodies.get(contact.bodyA);
        const bodyB = contact.bodyB === '__ground__' ? null : this.bodies.get(contact.bodyB);

        const invMassA = bodyA ? bodyA.invMass : 0;
        const invMassB = bodyB ? bodyB.invMass : 0;

        // Skip triggers
        if (bodyA?.isTrigger || bodyB?.isTrigger) continue;

        const totalInvMass = invMassA + invMassB;
        if (totalInvMass === 0) continue;

        const n = contact.normal;

        // ---- Positional correction (Baumgarte stabilization) ----
        const slop = 0.005; // penetration allowance
        const baumgarte = 0.3;
        const correction = Math.max(contact.penetration - slop, 0) * baumgarte / totalInvMass;

        if (bodyA && bodyA.invMass > 0 && !bodyA.isKinematic) {
          bodyA.position = v3Sub(bodyA.position, v3Scale(n, correction * invMassA));
        }
        if (bodyB && bodyB.invMass > 0 && !bodyB.isKinematic) {
          bodyB.position = v3Add(bodyB.position, v3Scale(n, correction * invMassB));
        }

        // ---- Velocity resolution ----
        const velA = bodyA ? bodyA.velocity : v3();
        const velB = bodyB ? bodyB.velocity : v3();
        const relVel = v3Sub(velB, velA);
        const velAlongNormal = v3Dot(relVel, n);

        // Don't resolve if separating
        if (velAlongNormal > 0) continue;

        // Restitution (use minimum)
        const e = Math.min(
          bodyA?.restitution ?? 0.5,
          bodyB?.restitution ?? 0.5
        );

        // Impulse magnitude
        let j = -(1 + e) * velAlongNormal;
        j /= totalInvMass;

        // Apply normal impulse
        const impulse = v3Scale(n, j);

        if (bodyA && bodyA.invMass > 0 && !bodyA.isKinematic) {
          bodyA.velocity = v3Sub(bodyA.velocity, v3Scale(impulse, invMassA));
          // Wake up
          bodyA.isSleeping = false;
          bodyA.sleepTimer = 0;
        }
        if (bodyB && bodyB.invMass > 0 && !bodyB.isKinematic) {
          bodyB.velocity = v3Add(bodyB.velocity, v3Scale(impulse, invMassB));
          bodyB.isSleeping = false;
          bodyB.sleepTimer = 0;
        }

        // ---- Angular impulse from contact ----
        if (bodyA && bodyA.invMass > 0 && !bodyA.isKinematic) {
          const rA = v3Sub(contact.contactPoint, bodyA.position);
          const angImpulse = v3Cross(rA, v3Scale(impulse, -1));
          bodyA.angularVelocity = v3Add(bodyA.angularVelocity, v3(
            angImpulse.x * bodyA.invInertia.x * 0.3,
            angImpulse.y * bodyA.invInertia.y * 0.3,
            angImpulse.z * bodyA.invInertia.z * 0.3
          ));
        }
        if (bodyB && bodyB.invMass > 0 && !bodyB.isKinematic) {
          const rB = v3Sub(contact.contactPoint, bodyB.position);
          const angImpulse = v3Cross(rB, impulse);
          bodyB.angularVelocity = v3Add(bodyB.angularVelocity, v3(
            angImpulse.x * bodyB.invInertia.x * 0.3,
            angImpulse.y * bodyB.invInertia.y * 0.3,
            angImpulse.z * bodyB.invInertia.z * 0.3
          ));
        }

        // ---- Friction impulse (tangent) ----
        const friction = Math.sqrt(
          (bodyA?.friction ?? 0.5) * (bodyB?.friction ?? 0.5)
        );

        const tangentVel = v3Sub(relVel, v3Scale(n, velAlongNormal));
        const tangentLen = v3Len(tangentVel);

        if (tangentLen > 1e-6) {
          const tangent = v3Scale(tangentVel, 1 / tangentLen);

          // Coulomb friction: clamp tangent impulse
          let jt = -v3Dot(relVel, tangent) / totalInvMass;
          jt = Math.max(-Math.abs(j) * friction, Math.min(jt, Math.abs(j) * friction));

          const frictionImpulse = v3Scale(tangent, jt);

          if (bodyA && bodyA.invMass > 0 && !bodyA.isKinematic) {
            bodyA.velocity = v3Sub(bodyA.velocity, v3Scale(frictionImpulse, invMassA));
          }
          if (bodyB && bodyB.invMass > 0 && !bodyB.isKinematic) {
            bodyB.velocity = v3Add(bodyB.velocity, v3Scale(frictionImpulse, invMassB));
          }
        }

        // Store resolved impulse for debug
        contact.impulse = Math.abs(j);
      }
    }
  }

  // ---- Integration: apply velocities to positions ----
  private _integrateVelocities(dt: number): void {
    this.bodies.forEach((body) => {
      if (body.invMass === 0 || body.isKinematic || body.isSleeping) return;

      // Linear
      body.position = v3Add(body.position, v3Scale(body.velocity, dt));

      // Angular → rotation (simplified Euler)
      const degPerSec = v3Scale(body.angularVelocity, 180 / Math.PI);
      body.rotation = v3Add(body.rotation, v3Scale(degPerSec, dt));

      // Kill very small velocities to help sleeping
      if (Math.abs(body.velocity.x) < 1e-4) body.velocity.x = 0;
      if (Math.abs(body.velocity.y) < 1e-4) body.velocity.y = 0;
      if (Math.abs(body.velocity.z) < 1e-4) body.velocity.z = 0;
    });
  }

  // ---- Sleep system ----
  private _updateSleep(dt: number): void {
    this.bodies.forEach((body) => {
      if (body.invMass === 0 || body.isKinematic) return;

      const linearEnergy = v3Len(body.velocity);
      const angularEnergy = v3Len(body.angularVelocity);
      const totalEnergy = linearEnergy + angularEnergy;

      if (totalEnergy < this.config.sleepThreshold) {
        body.sleepTimer += dt;
        if (body.sleepTimer > this.config.sleepTimeRequired) {
          body.isSleeping = true;
          body.velocity = v3();
          body.angularVelocity = v3();
        }
      } else {
        body.isSleeping = false;
        body.sleepTimer = 0;
      }
    });
  }

  // ---- Collision events (enter/stay/exit) ----
  private _generateEvents(): void {
    this.events = [];
    const currentPairs = new Set<string>();

    for (const contact of this.contacts) {
      const pairKey =
        contact.bodyA < contact.bodyB
          ? `${contact.bodyA}|${contact.bodyB}`
          : `${contact.bodyB}|${contact.bodyA}`;
      currentPairs.add(pairKey);

      if (this.prevContactPairs.has(pairKey)) {
        this.events.push({
          type: 'stay',
          entityA: contact.bodyA,
          entityB: contact.bodyB,
          contacts: [contact],
        });
      } else {
        this.events.push({
          type: 'enter',
          entityA: contact.bodyA,
          entityB: contact.bodyB,
          contacts: [contact],
        });
      }
    }

    // Exit events
    this.prevContactPairs.forEach((pairKey) => {
      if (!currentPairs.has(pairKey)) {
        const [a, b] = pairKey.split('|');
        this.events.push({
          type: 'exit',
          entityA: a,
          entityB: b,
          contacts: [],
        });
      }
    });

    this.prevContactPairs = currentPairs;
  }

  // ---- Raycast ----
  raycast(
    origin: Vec3,
    direction: Vec3,
    maxDist = 100
  ): { entityId: string; distance: number; point: Vec3; normal: Vec3 } | null {
    const dir = v3Normalize(direction);
    let closest: { entityId: string; distance: number; point: Vec3; normal: Vec3 } | null = null;

    this.bodies.forEach((body) => {
      const aabb = bodyAABB(body);

      // Ray-AABB intersection
      let tmin = 0;
      let tmax = maxDist;
      const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
      let hitNormal = v3();

      for (const axis of axes) {
        if (Math.abs(dir[axis]) < 1e-8) {
          if (origin[axis] < aabb.min[axis] || origin[axis] > aabb.max[axis]) {
            tmin = Infinity;
            break;
          }
        } else {
          let t1 = (aabb.min[axis] - origin[axis]) / dir[axis];
          let t2 = (aabb.max[axis] - origin[axis]) / dir[axis];
          let n = v3();

          if (t1 > t2) {
            [t1, t2] = [t2, t1];
            n = v3(
              axis === 'x' ? 1 : 0,
              axis === 'y' ? 1 : 0,
              axis === 'z' ? 1 : 0
            );
          } else {
            n = v3(
              axis === 'x' ? -1 : 0,
              axis === 'y' ? -1 : 0,
              axis === 'z' ? -1 : 0
            );
          }

          if (t1 > tmin) {
            tmin = t1;
            hitNormal = n;
          }
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) {
            tmin = Infinity;
            break;
          }
        }
      }

      if (tmin < Infinity && tmin >= 0 && tmin < maxDist) {
        if (!closest || tmin < closest.distance) {
          closest = {
            entityId: body.entityId,
            distance: tmin,
            point: v3Add(origin, v3Scale(dir, tmin)),
            normal: hitNormal,
          };
        }
      }
    });

    return closest;
  }
}

// ---- Factory: create PhysicsBody from entity data ----
export function createPhysicsBody(
  entityId: string,
  position: Vec3,
  rotation: Vec3,
  scale: Vec3,
  rb: {
    mass: number;
    useGravity: boolean;
    isKinematic: boolean;
    drag: number;
    angularDrag: number;
    restitution: number;
    friction: number;
    velocity: Vec3;
    angularVelocity: Vec3;
  },
  collider: {
    shape: ColliderShape;
    size: Vec3;
    center: Vec3;
    radius: number;
    height: number;
    isTrigger: boolean;
  }
): PhysicsBody {
  const halfExtents = v3(
    collider.size.x * 0.5,
    collider.size.y * 0.5,
    collider.size.z * 0.5
  );

  return {
    entityId,
    position: { ...position },
    rotation: { ...rotation },
    shape: collider.shape,
    halfExtents,
    radius: collider.radius * Math.max(scale.x, scale.y, scale.z),
    height: collider.height * scale.y,
    center: { ...collider.center },
    isTrigger: collider.isTrigger,
    mass: rb.mass,
    invMass: 0, // computed in addBody
    useGravity: rb.useGravity,
    isKinematic: rb.isKinematic,
    velocity: { ...rb.velocity },
    acceleration: v3(),
    force: v3(),
    angularVelocity: { ...rb.angularVelocity },
    torque: v3(),
    inertia: v3(),
    invInertia: v3(),
    friction: rb.friction,
    restitution: rb.restitution,
    linearDamping: rb.drag,
    angularDamping: rb.angularDrag,
    isSleeping: false,
    sleepTimer: 0,
  };
}
