// ============================================================
// KEVLA ENGINE — 3D Viewport (Production + Parallel Reality)
// Three.js with physics debug, temporal ghosts, trails,
// selection, AND split-screen parallel reality viewports
// ============================================================

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useEngineStore } from '../engine/store';
import type { MeshType } from '../engine/types';
import type { Entity } from '../engine/types';
import { Icon } from './Icons';

function createGeometry(type: MeshType | string): THREE.BufferGeometry {
  switch (type) {
    case 'cube': return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere': return new THREE.SphereGeometry(0.5, 32, 32);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case 'plane': { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }
    case 'cone': return new THREE.ConeGeometry(0.5, 1, 32);
    case 'torus': return new THREE.TorusGeometry(0.4, 0.15, 16, 48);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

// ---- Single viewport instance (reusable for main and parallel) ----
function ViewportInstance({ realityId, realityLabel, realityColor, divergence, isMain }: {
  realityId?: string;
  realityLabel?: string;
  realityColor?: string;
  divergence?: number;
  isMain?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(new THREE.PerspectiveCamera(60, 1, 0.1, 500));
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshMapRef = useRef(new Map<string, THREE.Mesh>());
  const ghostMeshesRef = useRef<THREE.Mesh[]>([]);
  const trailLinesRef = useRef<THREE.Line[]>([]);
  const velocityArrowsRef = useRef<THREE.ArrowHelper[]>([]);
  const contactSpritesRef = useRef<THREE.Mesh[]>([]);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);
  const rafRef = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const fpsRef = useRef<HTMLDivElement>(null);
  const frameCount = useRef(0);
  const fpsTime = useRef(0);

  const colliderMat = useRef(new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true, transparent: true, opacity: 0.3, depthWrite: false }));
  const colliderMatSelected = useRef(new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true, transparent: true, opacity: 0.45, depthWrite: false }));
  const colliderMapRef = useRef(new Map<string, THREE.Mesh>());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1a1a2e);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = cameraRef.current;
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1;
    controls.maxDistance = 100;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const scene = sceneRef.current;
    scene.add(new THREE.AmbientLight(0x8899bb, 0.5));
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x362d1e, 0.4));

    const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
    sun.position.set(8, 15, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15;
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 50;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const grid = new THREE.GridHelper(40, 40, 0x444455, 0x2a2a36);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    scene.add(grid);
    scene.add(new THREE.AxesHelper(2));

    const contactGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const contactMtl = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 });

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(container);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clockRef.current.getDelta(), 0.05);
      controls.update();

      const state = useEngineStore.getState();

      // Only main viewport runs physics
      if (isMain && state.isPlaying && !state.isPaused) state.physicsUpdate(dt);

      // Get entities — either from a parallel reality or the main scene
      let entities: Entity[];
      if (realityId) {
        entities = state.parallelEngine.getRealityEntities(realityId);
      } else {
        entities = state.entities;
      }

      const { selectedId, physicsDebug, showColliders, showVelocities, showContacts,
              debugContacts, isPlaying, temporalGhosts, temporalConfig, temporalEngine } = state;
      const meshMap = meshMapRef.current;
      const colliderMap = colliderMapRef.current;
      const entityIds = new Set(entities.map(e => e.id));

      // Cleanup removed meshes
      meshMap.forEach((mesh, id) => {
        if (!entityIds.has(id)) { scene.remove(mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); meshMap.delete(id); }
      });
      colliderMap.forEach((mesh, id) => {
        if (!entityIds.has(id)) { scene.remove(mesh); mesh.geometry.dispose(); colliderMap.delete(id); }
      });

      velocityArrowsRef.current.forEach(a => scene.remove(a));
      velocityArrowsRef.current = [];
      contactSpritesRef.current.forEach(s => scene.remove(s));
      contactSpritesRef.current = [];
      ghostMeshesRef.current.forEach(m => { scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      ghostMeshesRef.current = [];
      trailLinesRef.current.forEach(l => { scene.remove(l); l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
      trailLinesRef.current = [];

      // Render entities
      entities.forEach(entity => {
        let mesh = meshMap.get(entity.id);
        const meshType = entity.meshRenderer?.meshType || 'cube';

        if (!mesh) {
          const geo = createGeometry(meshType);
          const mat = new THREE.MeshStandardMaterial({ color: entity.material.color, metalness: entity.material.metallic, roughness: entity.material.roughness });
          mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true; mesh.receiveShadow = true;
          mesh.userData.entityId = entity.id; mesh.userData.meshType = meshType;
          scene.add(mesh); meshMap.set(entity.id, mesh);
        }

        if (mesh.userData.meshType !== meshType) {
          mesh.geometry.dispose(); mesh.geometry = createGeometry(meshType); mesh.userData.meshType = meshType;
        }

        const p = entity.transform.position, r = entity.transform.rotation, sc = entity.transform.scale;
        mesh.position.set(p.x, p.y, p.z);
        mesh.rotation.set(r.x * Math.PI / 180, r.y * Math.PI / 180, r.z * Math.PI / 180);
        mesh.scale.set(sc.x, sc.y, sc.z);

        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(entity.material.color); mat.metalness = entity.material.metallic;
        mat.roughness = entity.material.roughness; mat.emissive.set(entity.material.emissive);
        mat.transparent = entity.material.opacity < 1; mat.opacity = entity.material.opacity;
        mat.wireframe = entity.material.wireframe;
        mesh.visible = entity.active && (entity.meshRenderer?.visible ?? true);

        // Collider wireframes (main viewport only)
        if (isMain && physicsDebug && showColliders && entity.collider && entity.active) {
          let cwire = colliderMap.get(entity.id);
          const col = entity.collider;
          const isSelected = entity.id === selectedId;
          const matToUse = col.isTrigger
            ? new THREE.MeshBasicMaterial({ color: 0xff44ff, wireframe: true, transparent: true, opacity: 0.25, depthWrite: false })
            : isSelected ? colliderMatSelected.current : colliderMat.current;
          const shapeKey = `${col.shape}_${col.size.x}_${col.size.y}_${col.size.z}_${col.radius}_${col.height}`;

          if (!cwire || cwire.userData.shapeKey !== shapeKey) {
            if (cwire) { scene.remove(cwire); cwire.geometry.dispose(); }
            let geo: THREE.BufferGeometry;
            if (col.shape === 'sphere') geo = new THREE.SphereGeometry(col.radius, 16, 12);
            else if (col.shape === 'capsule') geo = new THREE.CapsuleGeometry(col.radius, col.height, 8, 16);
            else geo = new THREE.BoxGeometry(col.size.x, col.size.y, col.size.z);
            cwire = new THREE.Mesh(geo, matToUse);
            cwire.userData.shapeKey = shapeKey; cwire.renderOrder = 999;
            scene.add(cwire); colliderMap.set(entity.id, cwire);
          } else { cwire.material = matToUse; }

          cwire.position.set(p.x + col.center.x, p.y + col.center.y, p.z + col.center.z);
          cwire.rotation.copy(mesh.rotation);
          if (col.shape !== 'box') cwire.scale.set(sc.x, sc.y, sc.z); else cwire.scale.set(1, 1, 1);
          cwire.visible = col.showWireframe;
        } else {
          const cwire = colliderMap.get(entity.id);
          if (cwire) cwire.visible = false;
        }

        // Velocity arrows (main only)
        if (isMain && physicsDebug && showVelocities && isPlaying && entity.rigidbody && entity.active) {
          const vel = entity.rigidbody.velocity;
          const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
          if (speed > 0.1) {
            const arrow = new THREE.ArrowHelper(
              new THREE.Vector3(vel.x, vel.y, vel.z).normalize(),
              new THREE.Vector3(p.x, p.y, p.z),
              Math.min(speed * 0.3, 3), 0x00ccff, 0.15, 0.08
            );
            scene.add(arrow); velocityArrowsRef.current.push(arrow);
          }
        }
      });

      // Contact points (main only)
      if (isMain && physicsDebug && showContacts && isPlaying) {
        debugContacts.forEach(contact => {
          const sprite = new THREE.Mesh(contactGeo, contactMtl);
          sprite.position.set(contact.contactPoint.x, contact.contactPoint.y, contact.contactPoint.z);
          sprite.scale.setScalar(0.5 + Math.min(contact.impulse * 0.1, 2));
          scene.add(sprite); contactSpritesRef.current.push(sprite);
        });
      }

      // TEMPORAL: Ghost entities (main only)
      if (isMain && temporalConfig.enabled && temporalGhosts.length > 0) {
        temporalGhosts.forEach(ghost => {
          const geo = createGeometry(ghost.meshType);
          const isFuture = ghost.frameOffset > 0;
          const mat = new THREE.MeshStandardMaterial({
            color: isFuture ? '#44ffaa' : ghost.color,
            transparent: true, opacity: ghost.opacity,
            metalness: 0.3, roughness: 0.7, depthWrite: false,
            wireframe: isFuture,
          });
          const ghostMesh = new THREE.Mesh(geo, mat);
          ghostMesh.position.set(ghost.position.x, ghost.position.y, ghost.position.z);
          ghostMesh.rotation.set(ghost.rotation.x * Math.PI / 180, ghost.rotation.y * Math.PI / 180, ghost.rotation.z * Math.PI / 180);
          ghostMesh.scale.set(ghost.scale.x, ghost.scale.y, ghost.scale.z);
          ghostMesh.renderOrder = 998;
          scene.add(ghostMesh);
          ghostMeshesRef.current.push(ghostMesh);
        });
      }

      // TEMPORAL: Trails (main only)
      if (isMain && temporalConfig.enabled && temporalConfig.showTrails && temporalEngine.getFrameCount() > 1) {
        const trailEntityIds = selectedId
          ? [selectedId]
          : entities.filter(e => e.active && e.id !== 'ground_plane').map(e => e.id);

        trailEntityIds.forEach(entityId => {
          const trail = temporalEngine.generateTrail(entityId);
          if (trail.length < 2) return;
          const points = trail.map(p => new THREE.Vector3(p.x, p.y, p.z));
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const entity = entities.find(e => e.id === entityId);
          const material = new THREE.LineBasicMaterial({
            color: entity?.material.color || '#ffffff',
            transparent: true, opacity: 0.4, linewidth: 1,
          });
          const line = new THREE.Line(geometry, material);
          line.renderOrder = 997;
          scene.add(line);
          trailLinesRef.current.push(line);
        });
      }

      // Selection box
      if (isMain) {
        if (boxHelperRef.current) { scene.remove(boxHelperRef.current); boxHelperRef.current.dispose(); boxHelperRef.current = null; }
        if (selectedId) {
          const selectedMesh = meshMap.get(selectedId);
          if (selectedMesh && selectedMesh.visible) {
            const helper = new THREE.BoxHelper(selectedMesh, 0xff8800);
            scene.add(helper); boxHelperRef.current = helper;
          }
        }
      }

      renderer.render(scene, camera);

      // FPS overlay
      frameCount.current++;
      fpsTime.current += dt;
      if (fpsTime.current >= 0.5) {
        const fps = Math.round(frameCount.current / fpsTime.current);
        if (fpsRef.current) fpsRef.current.textContent = `${fps} FPS`;
        frameCount.current = 0; fpsTime.current = 0;
      }
    };
    animate();

    if (isMain) useEngineStore.getState().log('KEVLA Engine initialized — Parallel Reality Debugger enabled');

    return () => {
      cancelAnimationFrame(rafRef.current); ro.disconnect(); renderer.dispose();
      meshMapRef.current.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      meshMapRef.current.clear();
      colliderMapRef.current.forEach(m => m.geometry.dispose());
      colliderMapRef.current.clear();
      ghostMeshesRef.current.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      trailLinesRef.current.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (!isMain) return;
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const meshes = Array.from(meshMapRef.current.values()).filter(m => m.visible);
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) useEngineStore.getState().selectEntity(intersects[0].object.userData.entityId);
    else useEngineStore.getState().selectEntity(null);
  };

  return (
    <div className="kv-viewport-instance" style={realityColor ? { borderColor: realityColor + '44' } : {}}>
      <div ref={containerRef} className="kv-viewport-canvas" onClick={handleClick} />

      {/* Reality label badge */}
      {realityLabel && (
        <div className="kv-reality-label" style={{ backgroundColor: realityColor || '#61afef' }}>
          <span className="kv-reality-letter">{realityLabel}</span>
        </div>
      )}

      {/* Reality name and info */}
      {realityId && (
        <div className="kv-reality-info" style={{ borderColor: realityColor || '#61afef' }}>
          <span className="kv-reality-name">{realityLabel}</span>
          {divergence !== undefined && divergence > 0 && (
            <span className="kv-reality-divergence" style={{
              color: divergence > 50 ? '#e06c75' : divergence > 20 ? '#e5c07b' : '#98c379'
            }}>
              Δ {divergence.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* FPS (main only) */}
      {isMain && (
        <div className="kv-viewport-hud kv-hud-tr">
          <div ref={fpsRef} className="kv-hud-item kv-hud-fps">0 FPS</div>
        </div>
      )}

      <div className="kv-viewport-hud kv-hud-tl">
        <div className="kv-hud-item kv-hud-scene">{isMain ? 'Scene' : realityLabel}</div>
      </div>
    </div>
  );
}

// ---- Main viewport component — handles single and split views ----

export default function Viewport() {
  const isPlaying = useEngineStore(s => s.isPlaying);
  const isScrubbing = useEngineStore(s => s.temporalEngine.isScrubbing);
  const parallelEnabled = useEngineStore(s => s.parallelEnabled);
  const parallelViewMode = useEngineStore(s => s.parallelViewMode);
  const parallelEngine = useEngineStore(s => s.parallelEngine);

  // No parallel — render single viewport
  if (!parallelEnabled || parallelViewMode === 'single' || parallelEngine.realities.length === 0) {
    return (
      <div className="kv-viewport-wrap">
        <ViewportInstance isMain />
        {isPlaying && !isScrubbing && (
          <div className="kv-viewport-play-border"><div className="kv-play-indicator">▶ PLAYING</div></div>
        )}
        {isScrubbing && (
          <div className="kv-viewport-scrub-border"><div className="kv-scrub-indicator">⏱ SCRUBBING</div></div>
        )}
      </div>
    );
  }

  // Parallel mode — split view
  const visibleRealities = parallelEngine.getVisibleRealities();
  const { cols, rows } = parallelEngine.getGridDimensions();

  return (
    <div className="kv-viewport-wrap kv-parallel-active">
      <div className="kv-parallel-grid" style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}>
        {/* First slot is always the main viewport */}
        <div className="kv-parallel-cell kv-parallel-main">
          <ViewportInstance isMain realityLabel="Main" realityColor="#61afef" />
          <div className="kv-parallel-badge main">
            <Icon name="diamond" size={8} color="#61afef" />
            <span>Main Scene</span>
          </div>
        </div>

        {/* Subsequent slots are parallel realities */}
        {visibleRealities.map((reality, i) => {
          if (i >= cols * rows - 1) return null;
          return (
            <div key={reality.id} className="kv-parallel-cell">
              <ViewportInstance
                realityId={reality.id}
                realityLabel={reality.name}
                realityColor={reality.color}
                divergence={reality.divergence.divergencePercentage}
              />
              <div className="kv-parallel-badge" style={{ borderColor: reality.color }}>
                <span className="kv-par-dot" style={{ backgroundColor: reality.color }} />
                <span>{reality.name}</span>
                {reality.overrides.gravity && (
                  <span className="kv-par-detail">g={reality.overrides.gravity.y}</span>
                )}
                {reality.overrides.timeScale && reality.overrides.timeScale !== 1 && (
                  <span className="kv-par-detail">{reality.overrides.timeScale}×</span>
                )}
                <button className="kv-par-promote" onClick={() => useEngineStore.getState().parallelPromoteReality(reality.id)} title="Promote to main">
                  <Icon name="promote" size={10} />
                </button>
                <button className="kv-par-remove" onClick={() => useEngineStore.getState().parallelRemoveReality(reality.id)} title="Remove">
                  <Icon name="x" size={9} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isPlaying && (
        <div className="kv-viewport-play-border parallel"><div className="kv-play-indicator">▶ PARALLEL MODE</div></div>
      )}
    </div>
  );
}
