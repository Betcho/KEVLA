// ============================================================
// KEVLA ENGINE — Inspector Panel (Production)
// Full component editors with SVG icons
// ============================================================

import { useState } from 'react';
import { useEngineStore } from '../engine/store';
import { type MeshType, type Vector3, type ColliderShapeType } from '../engine/types';
import { LUA_PRESETS } from '../engine/lua';
import { Icon, MeshIcon } from './Icons';

function Vec3Input({ label, value, onChange, step = 0.1 }: {
  label: string; value: Vector3; onChange: (axis: 'x' | 'y' | 'z', val: number) => void; step?: number;
}) {
  const colors = ['#e06c75', '#98c379', '#61afef'];
  return (
    <div className="kv-vec3">
      <span className="kv-vec3-label">{label}</span>
      <div className="kv-vec3-inputs">
        {(['x', 'y', 'z'] as const).map((axis, i) => (
          <label key={axis} className="kv-vec3-field">
            <span style={{ color: colors[i] }}>{axis.toUpperCase()}</span>
            <input type="number" step={step} value={Number(value[axis].toFixed(3))}
              onChange={e => onChange(axis, parseFloat(e.target.value) || 0)} />
          </label>
        ))}
      </div>
    </div>
  );
}

function Section({ title, icon, defaultOpen = true, onRemove, badge, children }: {
  title: string; icon?: string; defaultOpen?: boolean; onRemove?: () => void; badge?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="kv-section">
      <div className="kv-section-header" onClick={() => setOpen(!open)}>
        <div className="kv-section-left">
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={10} />
          {icon && <Icon name={icon} size={13} />}
          <span>{title}</span>
          {badge && <span className="kv-section-badge">{badge}</span>}
        </div>
        {onRemove && (
          <button className="kv-section-remove" onClick={e => { e.stopPropagation(); onRemove(); }}><Icon name="x" size={10} /></button>
        )}
      </div>
      {open && <div className="kv-section-body">{children}</div>}
    </div>
  );
}

function Slider({ label, value, onChange, min = 0, max = 1, step = 0.01 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="kv-slider">
      <span className="kv-slider-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} />
      <span className="kv-slider-val">{value.toFixed(2)}</span>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="kv-field">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    </div>
  );
}

function LuaScriptEditor({ entityId, scriptIndex, script }: {
  entityId: string; scriptIndex: number; script: { name: string; code: string; enabled: boolean };
}) {
  const updateScript = useEngineStore(s => s.updateScript);
  const removeScript = useEngineStore(s => s.removeScript);
  const luaVM = useEngineStore(s => s.luaVM);
  const scriptErrors = useEngineStore(s => s.scriptErrors);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const [showTranspiled, setShowTranspiled] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const scriptInfo = luaVM.getScriptInfo(entityId, scriptIndex);
  const errorKey = `${entityId}_${scriptIndex}`;
  const runtimeError = scriptErrors.get(errorKey);
  const hasError = !!scriptInfo?.compileError || !!runtimeError;
  const lineCount = script.code.split('\n').length;

  return (
    <div className={`kv-script-editor ${hasError ? 'has-error' : ''}`}>
      <div className="kv-script-header">
        <input type="checkbox" checked={script.enabled}
          onChange={e => updateScript(entityId, scriptIndex, { enabled: e.target.checked })} />
        <span className="kv-lua-badge">LUA</span>
        <input className="kv-script-name" value={script.name}
          onChange={e => updateScript(entityId, scriptIndex, { name: e.target.value })} />
        <div className="kv-script-actions">
          {isPlaying && scriptInfo && !hasError && <span className="kv-script-running" title="Running">●</span>}
          {hasError && <Icon name="warn" size={12} color="#ff6666" />}
          <button className="kv-icon-btn-sm" onClick={() => setShowPresets(!showPresets)} title="Presets">
            <Icon name="menu" size={11} />
          </button>
          <button className="kv-icon-btn-sm" onClick={() => setShowTranspiled(!showTranspiled)} title="Transpiled">
            <Icon name="search" size={11} />
          </button>
          <button className="kv-icon-btn-sm kv-delete-btn" onClick={() => removeScript(entityId, scriptIndex)}>
            <Icon name="x" size={11} />
          </button>
        </div>
      </div>

      {showPresets && (
        <div className="kv-presets-list">
          {Object.entries(LUA_PRESETS).map(([key, preset]) => (
            <button key={key} className="kv-preset-item"
              onClick={() => { updateScript(entityId, scriptIndex, { name: preset.name, code: preset.code }); setShowPresets(false); }}>
              <span className="kv-preset-name">{preset.name}</span>
              <span className="kv-preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
      )}

      <div className="kv-code-editor">
        <div className="kv-line-numbers">
          {Array.from({ length: lineCount }, (_, i) => <div key={i} className="kv-line-num">{i + 1}</div>)}
        </div>
        <textarea className="kv-code-textarea" value={script.code}
          onChange={e => updateScript(entityId, scriptIndex, { code: e.target.value })}
          spellCheck={false} rows={Math.min(Math.max(lineCount, 5), 18)} placeholder="-- Write Lua code..." />
      </div>

      {scriptInfo?.compileError && (
        <div className="kv-script-error"><Icon name="error" size={11} /> Compile: {scriptInfo.compileError}</div>
      )}
      {runtimeError && !scriptInfo?.compileError && (
        <div className="kv-script-error kv-runtime"><Icon name="warn" size={11} /> Runtime: {runtimeError}</div>
      )}

      {showTranspiled && scriptInfo?.transpiledCode && (
        <div className="kv-transpiled">
          <div className="kv-transpiled-title">Transpiled JS</div>
          <pre className="kv-transpiled-code">{scriptInfo.transpiledCode}</pre>
        </div>
      )}

      <div className="kv-script-footer">
        <span>{lineCount} lines</span>
        {scriptInfo?.hasStart && <span className="kv-lifecycle-tag start">Start</span>}
        {scriptInfo?.hasUpdate && <span className="kv-lifecycle-tag update">Update</span>}
        {scriptInfo?.hasOnCollision && <span className="kv-lifecycle-tag collision">OnCol</span>}
      </div>
    </div>
  );
}

export default function Inspector() {
  const entities = useEngineStore(s => s.entities);
  const selectedId = useEngineStore(s => s.selectedId);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const updateTransformField = useEngineStore(s => s.updateTransformField);
  const updateMaterial = useEngineStore(s => s.updateMaterial);
  const setMeshType = useEngineStore(s => s.setMeshType);
  const setMeshVisible = useEngineStore(s => s.setMeshVisible);
  const addRigidbody = useEngineStore(s => s.addRigidbody);
  const removeRigidbody = useEngineStore(s => s.removeRigidbody);
  const updateRigidbody = useEngineStore(s => s.updateRigidbody);
  const addCollider = useEngineStore(s => s.addCollider);
  const removeCollider = useEngineStore(s => s.removeCollider);
  const updateCollider = useEngineStore(s => s.updateCollider);
  const setColliderShape = useEngineStore(s => s.setColliderShape);
  const addLuaScript = useEngineStore(s => s.addLuaScript);
  const renameEntity = useEngineStore(s => s.renameEntity);
  const applyImpulseToEntity = useEngineStore(s => s.applyImpulseToEntity);

  const [showAddComponent, setShowAddComponent] = useState(false);
  const [showScriptPresets, setShowScriptPresets] = useState(false);
  const [impulseStrength, setImpulseStrength] = useState(5);

  const entity = entities.find(e => e.id === selectedId);

  if (!entity) {
    return (
      <div className="kv-panel">
        <div className="kv-panel-header"><Icon name="settings" size={12} /><span>Inspector</span></div>
        <div className="kv-panel-body kv-inspector-empty">
          <Icon name="search" size={32} color="#333" />
          <p>Select an entity to inspect</p>
        </div>
      </div>
    );
  }

  const MESH_OPTIONS: MeshType[] = ['cube', 'sphere', 'cylinder', 'plane', 'cone', 'torus'];
  const COLLIDER_SHAPES: ColliderShapeType[] = ['box', 'sphere', 'capsule'];

  return (
    <div className="kv-panel">
      <div className="kv-panel-header"><Icon name="settings" size={12} /><span>Inspector</span></div>
      <div className="kv-panel-body">
        {/* Entity header */}
        <div className="kv-entity-header">
          <div className="kv-entity-icon-lg">
            <MeshIcon type={entity.meshRenderer?.meshType || 'cube'} size={20} />
          </div>
          <div className="kv-entity-info">
            <input className="kv-entity-name-input" value={entity.name}
              onChange={e => renameEntity(entity.id, e.target.value)} disabled={isPlaying} />
            <span className="kv-entity-id">{entity.id.slice(0, 16)}</span>
          </div>
          <div className="kv-entity-component-tags">
            {entity.rigidbody && <span className="kv-tag kv-tag-phys">RB</span>}
            {entity.collider && <span className="kv-tag kv-tag-col">{entity.collider.shape[0].toUpperCase()}</span>}
            {entity.scripts.length > 0 && <span className="kv-tag kv-tag-lua">LUA ×{entity.scripts.length}</span>}
          </div>
        </div>

        {/* Transform */}
        <Section title="Transform" icon="transform">
          <Vec3Input label="Position" value={entity.transform.position}
            onChange={(axis, val) => updateTransformField(entity.id, 'position', axis, val)} />
          <Vec3Input label="Rotation" value={entity.transform.rotation}
            onChange={(axis, val) => updateTransformField(entity.id, 'rotation', axis, val)} step={1} />
          <Vec3Input label="Scale" value={entity.transform.scale}
            onChange={(axis, val) => updateTransformField(entity.id, 'scale', axis, val)} />
        </Section>

        {/* Mesh Renderer */}
        {entity.meshRenderer && (
          <Section title="Mesh Renderer" icon="cube">
            <div className="kv-field">
              <span>Mesh</span>
              <select value={entity.meshRenderer.meshType}
                onChange={e => setMeshType(entity.id, e.target.value as MeshType)}>
                {MESH_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <CheckRow label="Visible" checked={entity.meshRenderer.visible}
              onChange={v => setMeshVisible(entity.id, v)} />
          </Section>
        )}

        {/* Material */}
        <Section title="Material" icon="material">
          <div className="kv-field">
            <span>Color</span>
            <div className="kv-color-picker">
              <input type="color" value={entity.material.color}
                onChange={e => updateMaterial(entity.id, { color: e.target.value })} />
              <span className="kv-color-hex">{entity.material.color}</span>
            </div>
          </div>
          <Slider label="Metallic" value={entity.material.metallic}
            onChange={v => updateMaterial(entity.id, { metallic: v })} />
          <Slider label="Roughness" value={entity.material.roughness}
            onChange={v => updateMaterial(entity.id, { roughness: v })} />
          <Slider label="Opacity" value={entity.material.opacity}
            onChange={v => updateMaterial(entity.id, { opacity: v })} />
          <CheckRow label="Wireframe" checked={entity.material.wireframe}
            onChange={v => updateMaterial(entity.id, { wireframe: v })} />
        </Section>

        {/* Rigidbody */}
        {entity.rigidbody && (
          <Section title="Rigidbody" icon="rigidbody" badge={entity.rigidbody.mass === 0 ? 'Static' : `${entity.rigidbody.mass}kg`}
            onRemove={() => removeRigidbody(entity.id)}>
            <div className="kv-field">
              <span>Mass</span>
              <input type="number" step={0.1} min={0} value={entity.rigidbody.mass}
                onChange={e => updateRigidbody(entity.id, {
                  mass: parseFloat(e.target.value) || 0,
                  isKinematic: parseFloat(e.target.value) === 0,
                  useGravity: parseFloat(e.target.value) > 0,
                })} />
            </div>
            <CheckRow label="Use Gravity" checked={entity.rigidbody.useGravity}
              onChange={v => updateRigidbody(entity.id, { useGravity: v })} />
            <CheckRow label="Is Kinematic" checked={entity.rigidbody.isKinematic}
              onChange={v => updateRigidbody(entity.id, { isKinematic: v })} />
            <div className="kv-subsection-title">Physics Material</div>
            <Slider label="Restitution" value={entity.rigidbody.restitution}
              onChange={v => updateRigidbody(entity.id, { restitution: v })} />
            <Slider label="Friction" value={entity.rigidbody.friction}
              onChange={v => updateRigidbody(entity.id, { friction: v })} />
            <div className="kv-subsection-title">Damping</div>
            <Slider label="Linear" value={entity.rigidbody.drag}
              onChange={v => updateRigidbody(entity.id, { drag: v })} min={0} max={5} />
            <Slider label="Angular" value={entity.rigidbody.angularDrag}
              onChange={v => updateRigidbody(entity.id, { angularDrag: v })} min={0} max={5} />

            {isPlaying && !entity.rigidbody.isKinematic && entity.rigidbody.mass > 0 && (
              <div className="kv-impulse-area">
                <div className="kv-subsection-title">Apply Impulse</div>
                <div className="kv-field">
                  <span>Force</span>
                  <input type="number" step={1} min={1} max={50} value={impulseStrength}
                    onChange={e => setImpulseStrength(parseFloat(e.target.value) || 5)} />
                </div>
                <div className="kv-impulse-grid">
                  <button className="kv-impulse-btn" onClick={() => applyImpulseToEntity(entity.id, { x: 0, y: impulseStrength, z: 0 })}>↑ Up</button>
                  <button className="kv-impulse-btn" onClick={() => applyImpulseToEntity(entity.id, { x: impulseStrength, y: 0, z: 0 })}>→ X</button>
                  <button className="kv-impulse-btn" onClick={() => applyImpulseToEntity(entity.id, { x: 0, y: 0, z: impulseStrength })}>Z →</button>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Collider */}
        {entity.collider && (
          <Section title={`${entity.collider.shape.charAt(0).toUpperCase() + entity.collider.shape.slice(1)} Collider`}
            icon="collider" badge={entity.collider.isTrigger ? 'Trigger' : 'Solid'}
            onRemove={() => removeCollider(entity.id)}>
            <div className="kv-field">
              <span>Shape</span>
              <select value={entity.collider.shape}
                onChange={e => setColliderShape(entity.id, e.target.value as ColliderShapeType)}>
                {COLLIDER_SHAPES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            {entity.collider.shape === 'box' && (
              <Vec3Input label="Size" value={entity.collider.size}
                onChange={(axis, val) => updateCollider(entity.id, { size: { ...entity.collider!.size, [axis]: val } })} />
            )}
            {entity.collider.shape === 'sphere' && (
              <div className="kv-field">
                <span>Radius</span>
                <input type="number" step={0.05} min={0.01} value={entity.collider.radius}
                  onChange={e => updateCollider(entity.id, { radius: parseFloat(e.target.value) || 0.5 })} />
              </div>
            )}
            <Vec3Input label="Center" value={entity.collider.center}
              onChange={(axis, val) => updateCollider(entity.id, { center: { ...entity.collider!.center, [axis]: val } })} />
            <CheckRow label="Is Trigger" checked={entity.collider.isTrigger}
              onChange={v => updateCollider(entity.id, { isTrigger: v })} />
            <CheckRow label="Show Wireframe" checked={entity.collider.showWireframe}
              onChange={v => updateCollider(entity.id, { showWireframe: v })} />
          </Section>
        )}

        {/* Lua Scripts */}
        {entity.scripts.length > 0 && (
          <Section title={`Scripts (${entity.scripts.length})`} icon="script">
            {entity.scripts.map((script, idx) => (
              <LuaScriptEditor key={`${entity.id}_${idx}`} entityId={entity.id} scriptIndex={idx} script={script} />
            ))}
          </Section>
        )}

        {/* Add Component */}
        {!isPlaying && (
          <div className="kv-add-component">
            <div className="kv-add-wrapper">
              <button className="kv-add-component-btn" onClick={() => { setShowAddComponent(!showAddComponent); setShowScriptPresets(false); }}>
                <Icon name="plus" size={13} /> Add Component
              </button>
              {showAddComponent && (
                <div className="kv-dropdown kv-component-dropdown">
                  {!entity.rigidbody && (
                    <button className="kv-dropdown-item" onClick={() => { addRigidbody(entity.id); setShowAddComponent(false); }}>
                      <Icon name="rigidbody" size={13} /><span className="kv-dropdown-label">Rigidbody</span>
                    </button>
                  )}
                  {!entity.collider && (
                    <>
                      <button className="kv-dropdown-item" onClick={() => { addCollider(entity.id, 'box'); setShowAddComponent(false); }}>
                        <Icon name="collider" size={13} /><span className="kv-dropdown-label">Box Collider</span>
                      </button>
                      <button className="kv-dropdown-item" onClick={() => { addCollider(entity.id, 'sphere'); setShowAddComponent(false); }}>
                        <Icon name="sphere" size={13} /><span className="kv-dropdown-label">Sphere Collider</span>
                      </button>
                    </>
                  )}
                  <div className="kv-dropdown-divider" />
                  <button className="kv-dropdown-item kv-lua-menu" onClick={() => setShowScriptPresets(!showScriptPresets)}>
                    <Icon name="script" size={13} /><span className="kv-dropdown-label">Lua Script ▸</span>
                  </button>
                  {showScriptPresets && (
                    <div className="kv-sub-dropdown">
                      {Object.entries(LUA_PRESETS).map(([key, preset]) => (
                        <button key={key} className="kv-dropdown-item" onClick={() => {
                          addLuaScript(entity.id, key); setShowAddComponent(false); setShowScriptPresets(false);
                        }}>
                          <span className="kv-dropdown-label">{preset.name}</span>
                          <span className="kv-dropdown-hint">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
