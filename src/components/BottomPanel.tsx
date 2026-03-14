// ============================================================
// KEVLA ENGINE — Bottom Panel (Production)
// Console, Asset Browser, Physics, Scripts
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useEngineStore } from '../engine/store';
import { LUA_PRESETS } from '../engine/lua';
import { Icon } from './Icons';

// ---- Console ----
function Console() {
  const messages = useEngineStore(s => s.consoleMessages);
  const clearConsole = useEngineStore(s => s.clearConsole);
  const [filter, setFilter] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const filtered = filter === 'all' ? messages : messages.filter(m => m.type === filter);
  const counts = { log: messages.filter(m => m.type === 'log' || m.type === 'info').length, warn: messages.filter(m => m.type === 'warn').length, error: messages.filter(m => m.type === 'error').length };

  return (
    <div className="kv-console">
      <div className="kv-console-toolbar">
        <button className="kv-console-clear" onClick={clearConsole}>
          <Icon name="trash" size={11} /> Clear
        </button>
        <div className="kv-console-filters">
          {(['all', 'log', 'warn', 'error'] as const).map(f => (
            <button key={f} className={`kv-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? <Icon name="list" size={10} /> : f === 'log' ? <Icon name="info" size={10} /> : f === 'warn' ? <Icon name="warn" size={10} /> : <Icon name="error" size={10} />}
              <span>{f === 'all' ? `All (${messages.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="kv-console-messages" ref={scrollRef}>
        {filtered.length === 0 && <div className="kv-console-empty">No messages</div>}
        {filtered.map(msg => (
          <div key={msg.id} className={`kv-console-msg kv-msg-${msg.type}`}>
            <span className="kv-msg-icon">
              {msg.type === 'warn' ? <Icon name="warn" size={10} color="#e5c07b" /> :
               msg.type === 'error' ? <Icon name="error" size={10} color="#e06c75" /> :
               <Icon name="info" size={10} color="#61afef" />}
            </span>
            <span className="kv-msg-time">{msg.timestamp}</span>
            <span className="kv-msg-text">{msg.message}</span>
            {msg.count > 1 && <span className="kv-msg-count">{msg.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Physics Panel ----
function PhysicsPanel() {
  const config = useEngineStore(s => s.physicsConfig);
  const updateConfig = useEngineStore(s => s.updatePhysicsConfig);
  const physicsDebug = useEngineStore(s => s.physicsDebug);
  const showColliders = useEngineStore(s => s.showColliders);
  const showVelocities = useEngineStore(s => s.showVelocities);
  const showContacts = useEngineStore(s => s.showContacts);
  const togglePhysicsDebug = useEngineStore(s => s.togglePhysicsDebug);
  const toggleShowColliders = useEngineStore(s => s.toggleShowColliders);
  const toggleShowVelocities = useEngineStore(s => s.toggleShowVelocities);
  const toggleShowContacts = useEngineStore(s => s.toggleShowContacts);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const physicsWorld = useEngineStore(s => s.physicsWorld);

  return (
    <div className="kv-physics-panel">
      <div className="kv-physics-grid">
        <div className="kv-physics-section">
          <div className="kv-physics-title"><Icon name="settings" size={11} /> World Settings</div>
          <div className="kv-field"><span>Gravity Y</span>
            <input type="number" step={0.5} value={config.gravity.y}
              onChange={e => updateConfig({ gravity: { ...config.gravity, y: parseFloat(e.target.value) || -9.81 } })} />
          </div>
          <div className="kv-field"><span>Substeps</span>
            <input type="number" step={1} min={1} max={16} value={config.substeps}
              onChange={e => updateConfig({ substeps: parseInt(e.target.value) || 4 })} />
          </div>
        </div>

        <div className="kv-physics-section">
          <div className="kv-physics-title"><Icon name="eye" size={11} /> Debug Visualization</div>
          <div className="kv-physics-toggles">
            {[
              { label: 'Debug', checked: physicsDebug, toggle: togglePhysicsDebug },
              { label: 'Colliders', checked: showColliders, toggle: toggleShowColliders },
              { label: 'Velocity', checked: showVelocities, toggle: toggleShowVelocities },
              { label: 'Contacts', checked: showContacts, toggle: toggleShowContacts },
            ].map(t => (
              <label key={t.label} className={`kv-physics-toggle ${t.checked ? 'on' : ''}`}>
                <input type="checkbox" checked={t.checked} onChange={t.toggle} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {isPlaying && (
          <div className="kv-physics-section">
            <div className="kv-physics-title"><Icon name="physics" size={11} /> Live Stats</div>
            <div className="kv-stats-row">
              <div className="kv-stat"><span className="kv-stat-val">{physicsWorld.stats.activeBodies}</span><span className="kv-stat-lbl">Bodies</span></div>
              <div className="kv-stat"><span className="kv-stat-val">{physicsWorld.stats.activeContacts}</span><span className="kv-stat-lbl">Contacts</span></div>
              <div className="kv-stat"><span className="kv-stat-val">{physicsWorld.stats.sleepingBodies}</span><span className="kv-stat-lbl">Sleeping</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Scripts Panel ----
function ScriptsPanel() {
  const entities = useEngineStore(s => s.entities);
  const scriptErrors = useEngineStore(s => s.scriptErrors);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const luaVM = useEngineStore(s => s.luaVM);
  const inputState = useEngineStore(s => s.inputState);
  const selectEntity = useEngineStore(s => s.selectEntity);

  const totalScripts = entities.reduce((n, e) => n + e.scripts.length, 0);
  const enabledScripts = entities.reduce((n, e) => n + e.scripts.filter(s => s.enabled).length, 0);
  const heldKeys = Array.from(inputState.keys).slice(0, 8);

  return (
    <div className="kv-scripts-panel">
      <div className="kv-scripts-stats">
        <span><Icon name="script" size={11} /> {totalScripts} scripts</span>
        <span><Icon name="play" size={9} /> {enabledScripts} enabled</span>
        <span style={{ color: scriptErrors.size > 0 ? '#ff6666' : '#88ff88' }}>
          <Icon name={scriptErrors.size > 0 ? 'error' : 'info'} size={11} /> {scriptErrors.size} errors
        </span>
        <span>{luaVM.scripts.size} compiled</span>
      </div>

      <div className="kv-input-state">
        <div className="kv-input-row">
          <span className="kv-input-label">Keys:</span>
          {heldKeys.length === 0 ? <span className="kv-no-keys">none</span> :
            heldKeys.map(k => <span key={k} className="kv-key-badge">{k === ' ' ? 'Space' : k}</span>)}
        </div>
      </div>

      <div className="kv-scripts-list">
        {entities.filter(e => e.scripts.length > 0).map(entity => (
          <div key={entity.id} className="kv-scripts-group">
            <div className="kv-scripts-entity" onClick={() => selectEntity(entity.id)}>{entity.name}</div>
            {entity.scripts.map((script, idx) => {
              const key = `${entity.id}_${idx}`;
              const hasError = scriptErrors.has(key);
              return (
                <div key={idx} className={`kv-scripts-item ${hasError ? 'error' : ''} ${!script.enabled ? 'disabled' : ''}`}>
                  <span className="kv-si-status">{!script.enabled ? '○' : hasError ? '⚠' : isPlaying ? '●' : '◎'}</span>
                  <span className="kv-si-name">{script.name}</span>
                  <span className="kv-si-lang">LUA</span>
                </div>
              );
            })}
          </div>
        ))}
        {totalScripts === 0 && <div className="kv-scripts-empty">No scripts. Add via Inspector → Add Component → Lua Script</div>}
      </div>
    </div>
  );
}

// ---- Asset Browser ----
interface AssetFolder { name: string; icon: string; files: { name: string; icon: string; type: string }[]; }

const ASSET_FOLDERS: AssetFolder[] = [
  { name: 'Scripts', icon: 'folder', files: Object.keys(LUA_PRESETS).map(k => ({ name: `${k}.lua`, icon: 'script', type: 'lua' })) },
  { name: 'Models', icon: 'folder', files: [
    { name: 'cube.obj', icon: 'model3d', type: 'model' }, { name: 'sphere.fbx', icon: 'model3d', type: 'model' },
    { name: 'character.gltf', icon: 'model3d', type: 'model' }, { name: 'helmet.glb', icon: 'model3d', type: 'model' },
  ]},
  { name: 'Textures', icon: 'folder', files: [
    { name: 'wood_diffuse.png', icon: 'image', type: 'texture' }, { name: 'metal_normal.png', icon: 'image', type: 'texture' },
    { name: 'brick_albedo.jpg', icon: 'image', type: 'texture' }, { name: 'ground_rough.png', icon: 'image', type: 'texture' },
  ]},
  { name: 'Materials', icon: 'folder', files: [
    { name: 'default.mat', icon: 'material', type: 'material' }, { name: 'metal.mat', icon: 'material', type: 'material' },
  ]},
  { name: 'Audio', icon: 'folder', files: [
    { name: 'footstep.wav', icon: 'audio', type: 'audio' }, { name: 'ambient.ogg', icon: 'audio', type: 'audio' },
  ]},
  { name: 'Scenes', icon: 'folder', files: [
    { name: 'main.scene', icon: 'scene', type: 'scene' }, { name: 'level_01.scene', icon: 'scene', type: 'scene' },
  ]},
];

function AssetBrowser() {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['Scripts']));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const log = useEngineStore(s => s.log);
  const savedScenes = useEngineStore.getState().getSavedSceneNames();

  const toggleFolder = (name: string) => {
    const next = new Set(openFolders);
    if (next.has(name)) next.delete(name); else next.add(name);
    setOpenFolders(next);
  };

  const typeColors: Record<string, string> = {
    lua: '#ffaa44', model: '#61afef', texture: '#98c379', material: '#c678dd', audio: '#56b6c2', scene: '#e5c07b',
  };

  return (
    <div className="kv-asset-browser">
      <div className="kv-asset-toolbar">
        <div className="kv-asset-path">
          <Icon name="folder" size={12} color="#e5c07b" />
          <span>Assets/</span>
        </div>
        <div className="kv-asset-tools">
          <button className={`kv-icon-btn-sm ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view">
            <Icon name="list" size={11} />
          </button>
          <button className={`kv-icon-btn-sm ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">
            <Icon name="grid" size={11} />
          </button>
          <button className="kv-icon-btn-sm" title="Refresh"><Icon name="refresh" size={11} /></button>
          <button className="kv-icon-btn-sm" title="Import"><Icon name="upload" size={11} /></button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="kv-asset-tree">
          {ASSET_FOLDERS.map(folder => (
            <div key={folder.name}>
              <div className="kv-asset-folder" onClick={() => toggleFolder(folder.name)}>
                <Icon name={openFolders.has(folder.name) ? 'chevronDown' : 'chevronRight'} size={10} />
                <Icon name={openFolders.has(folder.name) ? 'folderOpen' : 'folder'} size={13} color="#e5c07b" />
                <span className="kv-folder-name">{folder.name}</span>
                <span className="kv-folder-count">{folder.files.length}</span>
              </div>
              {openFolders.has(folder.name) && (
                <div className="kv-asset-files">
                  {folder.files.map(file => (
                    <div key={file.name}
                      className={`kv-asset-file ${selectedFile === file.name ? 'selected' : ''}`}
                      onClick={() => setSelectedFile(file.name)}
                      onDoubleClick={() => log(`Opened: ${file.name}`)}>
                      <Icon name={file.icon} size={12} color={typeColors[file.type]} />
                      <span className="kv-file-name">{file.name}</span>
                      <span className="kv-file-type" style={{ color: typeColors[file.type] }}>{file.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {savedScenes.length > 0 && (
            <div>
              <div className="kv-asset-folder" onClick={() => toggleFolder('_saved')}>
                <Icon name={openFolders.has('_saved') ? 'chevronDown' : 'chevronRight'} size={10} />
                <Icon name="save" size={13} color="#98c379" />
                <span className="kv-folder-name">Saved Scenes</span>
                <span className="kv-folder-count">{savedScenes.length}</span>
              </div>
              {openFolders.has('_saved') && (
                <div className="kv-asset-files">
                  {savedScenes.map(name => (
                    <div key={name} className={`kv-asset-file ${selectedFile === name ? 'selected' : ''}`}
                      onClick={() => setSelectedFile(name)}
                      onDoubleClick={() => useEngineStore.getState().loadScene(name)}>
                      <Icon name="scene" size={12} color="#e5c07b" />
                      <span className="kv-file-name">{name}.scene</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="kv-asset-grid">
          {ASSET_FOLDERS.flatMap(f => f.files).map(file => (
            <div key={file.name}
              className={`kv-asset-tile ${selectedFile === file.name ? 'selected' : ''}`}
              onClick={() => setSelectedFile(file.name)}
              onDoubleClick={() => log(`Opened: ${file.name}`)}>
              <div className="kv-tile-icon"><Icon name={file.icon} size={24} color={typeColors[file.type]} /></div>
              <span className="kv-tile-name">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Main ----
export default function BottomPanel() {
  const activeTab = useEngineStore(s => s.activeBottomTab);
  const setTab = useEngineStore(s => s.setActiveBottomTab);
  const scriptErrors = useEngineStore(s => s.scriptErrors);

  const tabs = [
    { id: 'console' as const, label: 'Console', icon: 'terminal' },
    { id: 'assets' as const, label: 'Assets', icon: 'folder' },
    { id: 'physics' as const, label: 'Physics', icon: 'physics' },
    { id: 'scripts' as const, label: 'Scripts', icon: 'script' },
  ];

  return (
    <div className="kv-panel kv-bottom-panel">
      <div className="kv-tab-bar">
        {tabs.map(tab => (
          <button key={tab.id} className={`kv-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setTab(tab.id)}>
            <Icon name={tab.icon} size={11} />
            <span>{tab.label}</span>
            {tab.id === 'scripts' && scriptErrors.size > 0 && <span className="kv-tab-badge">{scriptErrors.size}</span>}
          </button>
        ))}
      </div>
      <div className="kv-tab-content">
        {activeTab === 'console' ? <Console /> :
         activeTab === 'physics' ? <PhysicsPanel /> :
         activeTab === 'scripts' ? <ScriptsPanel /> :
         <AssetBrowser />}
      </div>
    </div>
  );
}
