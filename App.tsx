// ============================================================
// KEVLA ENGINE v1.0.0 — Keystone Engine for Virtual Landscapes & Adventures
// Professional 3D Game Engine Editor
// https://github.com/your-username/kevla
// ============================================================

import { useEffect, useState, useRef, useCallback } from 'react';
import Viewport from './components/Viewport';
import Hierarchy from './components/Hierarchy';
import Inspector from './components/Inspector';
import BottomPanel from './components/BottomPanel';
import Timeline from './components/Timeline';
import { useEngineStore } from './engine/store';
import type { MeshType } from './engine/types';
import { LUA_PRESETS } from './engine/lua';
import { REALITY_PRESETS } from './engine/parallel';
import { Icon } from './components/Icons';
import BuildPanel from './components/BuildPanel';
import ExportManager from './components/ExportManager';
import DesktopBuild from './components/DesktopBuild';
import { isElectron } from './components/WindowChrome';

const MESH_OPTIONS: { type: MeshType; label: string; icon: string }[] = [
  { type: 'cube', label: 'Cube', icon: 'cube' },
  { type: 'sphere', label: 'Sphere', icon: 'sphere' },
  { type: 'cylinder', label: 'Cylinder', icon: 'cylinder' },
  { type: 'plane', label: 'Plane', icon: 'plane' },
  { type: 'cone', label: 'Cone', icon: 'cone' },
  { type: 'torus', label: 'Torus', icon: 'torus' },
];

function ResizeHandle({ direction, onResize }: { direction: 'horizontal' | 'vertical'; onResize: (delta: number) => void }) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const onMouseMove = (ev: MouseEvent) => {
      const current = direction === 'horizontal' ? ev.clientX : ev.clientY;
      onResize(current - startPos);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [direction, onResize]);

  return <div className={`resize-handle resize-${direction}`} onMouseDown={handleMouseDown} />;
}

function Modal({ title, onClose, children, width }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div className="kv-modal-overlay" onClick={onClose}>
      <div className="kv-modal" onClick={e => e.stopPropagation()} style={width ? { width } : {}}>
        <div className="kv-modal-header">
          <span className="kv-modal-title">{title}</span>
          <button className="kv-modal-close" onClick={onClose}><Icon name="x" size={12} /></button>
        </div>
        <div className="kv-modal-body">{children}</div>
      </div>
    </div>
  );
}

function MenuDropdown({ label, children, isOpen, onToggle }: { label: string; children: React.ReactNode; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="kv-menu-wrapper">
      <button className={`kv-menu-trigger ${isOpen ? 'active' : ''}`} onClick={onToggle}>{label}</button>
      {isOpen && <div className="kv-dropdown">{children}</div>}
    </div>
  );
}

function DropdownItem({ icon, label, shortcut, onClick, disabled, danger }: {
  icon?: string; label: string; shortcut?: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button className={`kv-dropdown-item ${disabled ? 'disabled' : ''} ${danger ? 'danger' : ''}`}
      onClick={disabled ? undefined : onClick}>
      {icon && <Icon name={icon} size={13} />}
      <span className="kv-dropdown-label">{label}</span>
      {shortcut && <span className="kv-dropdown-shortcut">{shortcut}</span>}
    </button>
  );
}

function DropdownDivider() { return <div className="kv-dropdown-divider" />; }

// ============================================================
export default function App() {
  const sceneName = useEngineStore(s => s.sceneName);
  const isPlaying = useEngineStore(s => s.isPlaying);
  const isPaused = useEngineStore(s => s.isPaused);
  const play = useEngineStore(s => s.play);
  const pause = useEngineStore(s => s.pause);
  const stop = useEngineStore(s => s.stop);
  const addEntity = useEngineStore(s => s.addEntity);
  const saveScene = useEngineStore(s => s.saveScene);
  const loadScene = useEngineStore(s => s.loadScene);
  const newScene = useEngineStore(s => s.newScene);
  const removeEntity = useEngineStore(s => s.removeEntity);
  const duplicateEntity = useEngineStore(s => s.duplicateEntity);
  const selectedId = useEngineStore(s => s.selectedId);
  const setActiveBottomTab = useEngineStore(s => s.setActiveBottomTab);
  const addLuaScript = useEngineStore(s => s.addLuaScript);
  const entities = useEngineStore(s => s.entities);
  const temporalEngine = useEngineStore(s => s.temporalEngine);

  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(320);
  const [bottomHeight, setBottomHeight] = useState(200);
  const leftBase = useRef(240);
  const rightBase = useRef(320);
  const bottomBase = useRef(200);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showBuild, setShowBuild] = useState(false);
  const [showBranding, setShowBranding] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDesktopBuild, setShowDesktopBuild] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Branding state
  const engineLogo = useEngineStore(s => s.engineLogo);
  const engineName = useEngineStore(s => s.engineName);
  const engineAccentColor = useEngineStore(s => s.engineAccentColor);
  const setEngineLogo = useEngineStore(s => s.setEngineLogo);
  const setEngineName = useEngineStore(s => s.setEngineName);
  const setEngineAccentColor = useEngineStore(s => s.setEngineAccentColor);
  const clearBranding = useEngineStore(s => s.clearBranding);

  const closeMenus = () => setOpenMenu(null);
  const toggleMenu = (menu: string) => setOpenMenu(openMenu === menu ? null : menu);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId && !isPlaying) removeEntity(selectedId);
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveScene(); }
      if (e.ctrlKey && e.key === 'd' && selectedId) { e.preventDefault(); duplicateEntity(selectedId); }
      if (e.key === 'F5') { e.preventDefault(); if (!isPlaying) play(); else stop(); }
      if (e.key === 'F6') { e.preventDefault(); if (isPlaying) pause(); }
      if (e.key === 'Escape') closeMenus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, isPlaying, removeEntity, saveScene, duplicateEntity, play, stop, pause]);

  const savedScenes = useEngineStore.getState().getSavedSceneNames();
  const scriptCount = entities.reduce((n, e) => n + e.scripts.length, 0);
  const physicsCount = entities.filter(e => e.rigidbody).length;
  const frameCount = temporalEngine.getFrameCount();

  return (
    <div className="kv-root">
      {/* ========== TITLE BAR ========== */}
      <div className="kv-titlebar">
        <div className="kv-titlebar-left">
          <div className="kv-logo" onClick={() => setShowBranding(true)} title="Click to customize branding" style={{ cursor: 'pointer' }}>
            {engineLogo ? (
              <img src={engineLogo} alt="logo" className="kv-logo-img" />
            ) : (
              <Icon name="diamond" size={10} color={engineAccentColor} />
            )}
            <span style={{ color: engineAccentColor }}>{engineName}</span>
          </div>

          <MenuDropdown label="File" isOpen={openMenu === 'file'} onToggle={() => toggleMenu('file')}>
            <DropdownItem icon="file" label="New Scene" onClick={() => { newScene(); closeMenus(); }} />
            <DropdownItem icon="save" label="Save Scene" shortcut="Ctrl+S" onClick={() => { setShowSave(true); setSaveName(sceneName); closeMenus(); }} />
            <DropdownItem icon="folder" label="Load Scene" onClick={() => { setShowLoad(true); closeMenus(); }} />
            <DropdownDivider />
            <DropdownItem icon="save" label="Quick Save" shortcut="Ctrl+S" onClick={() => { saveScene(); closeMenus(); }} />
            <DropdownDivider />
            <DropdownItem icon="cube" label="Package as Desktop App (.exe)" onClick={() => { setShowDesktopBuild(true); closeMenus(); }} />
          </MenuDropdown>

          <MenuDropdown label="GameObject" isOpen={openMenu === 'gameobject'} onToggle={() => toggleMenu('gameobject')}>
            {MESH_OPTIONS.map(opt => (
              <DropdownItem key={opt.type} icon={opt.icon} label={opt.label} onClick={() => { addEntity(opt.type); closeMenus(); }} />
            ))}
          </MenuDropdown>

          <MenuDropdown label="Component" isOpen={openMenu === 'component'} onToggle={() => toggleMenu('component')}>
            <DropdownItem icon="rigidbody" label="Rigidbody" disabled={!selectedId} onClick={() => {
              if (selectedId) useEngineStore.getState().addRigidbody(selectedId); closeMenus();
            }} />
            <DropdownItem icon="collider" label="Box Collider" disabled={!selectedId} onClick={() => {
              if (selectedId) useEngineStore.getState().addCollider(selectedId, 'box'); closeMenus();
            }} />
            <DropdownDivider />
            {Object.entries(LUA_PRESETS).slice(0, 6).map(([key, preset]) => (
              <DropdownItem key={key} icon="script" label={preset.name} disabled={!selectedId} onClick={() => {
                if (selectedId) addLuaScript(selectedId, key); closeMenus();
              }} />
            ))}
          </MenuDropdown>

          {/* TEMPORAL MENU — NEW */}
          <MenuDropdown label="Temporal" isOpen={openMenu === 'temporal'} onToggle={() => toggleMenu('temporal')}>
            <DropdownItem icon="ghost" label="Toggle Ghosts" onClick={() => { useEngineStore.getState().temporalToggleGhosts(); closeMenus(); }} />
            <DropdownItem icon="trail" label="Toggle Trails" onClick={() => { useEngineStore.getState().temporalToggleTrails(); closeMenus(); }} />
            <DropdownDivider />
            <DropdownItem icon="info" label="Inspect Current Frame" shortcut="Ctrl+Shift+I" disabled={frameCount === 0} onClick={() => {
              temporalEngine.setInspectedFrame(temporalEngine.currentFrame); closeMenus();
            }} />
            <DropdownItem icon="fork" label="Compare Two Frames" disabled={frameCount < 2} onClick={() => {
              useEngineStore.getState().log('🔍 Click two points on the timeline to compare frames'); closeMenus();
            }} />
            <DropdownDivider />
            <DropdownItem icon="fork" label="Fork Branch" shortcut="Ctrl+B" disabled={frameCount === 0} onClick={() => {
              useEngineStore.getState().temporalForkBranch(); closeMenus();
            }} />
            <DropdownItem icon="bookmark" label="Add Bookmark" shortcut="Ctrl+M" disabled={frameCount === 0} onClick={() => {
              useEngineStore.getState().temporalAddBookmark(`Bookmark ${temporalEngine.bookmarks.length + 1}`); closeMenus();
            }} />
            <DropdownDivider />
            <DropdownItem icon="skipBack" label="Jump to Start" shortcut="Home" onClick={() => { useEngineStore.getState().temporalJumpToStart(); closeMenus(); }} />
            <DropdownItem icon="skipForward" label="Jump to End" shortcut="End" onClick={() => { useEngineStore.getState().temporalJumpToEnd(); closeMenus(); }} />
          </MenuDropdown>

          <MenuDropdown label="Parallel" isOpen={openMenu === 'parallel'} onToggle={() => toggleMenu('parallel')}>
            <DropdownItem icon="parallel" label="Auto Setup (2×2)" onClick={() => { useEngineStore.getState().parallelAutoSetup(); closeMenus(); }} />
            <DropdownDivider />
            {Object.entries(REALITY_PRESETS).map(([key, preset]) => (
              <DropdownItem key={key} icon="gravity" label={preset.name}
                onClick={() => { useEngineStore.getState().parallelCreateFromPreset(key); closeMenus(); }} />
            ))}
            <DropdownDivider />
            <DropdownItem icon="split" label="View: Side by Side" onClick={() => { useEngineStore.getState().parallelSetViewMode('1x2'); closeMenus(); }} />
            <DropdownItem icon="split4" label="View: 2×2 Grid" onClick={() => { useEngineStore.getState().parallelSetViewMode('2x2'); closeMenus(); }} />
            <DropdownDivider />
            <DropdownItem icon="x" label="Disable Parallel" danger onClick={() => { useEngineStore.getState().parallelReset(); closeMenus(); }} />
          </MenuDropdown>

          <MenuDropdown label="Window" isOpen={openMenu === 'window'} onToggle={() => toggleMenu('window')}>
            <DropdownItem icon="terminal" label="Console" onClick={() => { setActiveBottomTab('console'); closeMenus(); }} />
            <DropdownItem icon="folder" label="Asset Browser" onClick={() => { setActiveBottomTab('assets'); closeMenus(); }} />
            <DropdownItem icon="physics" label="Physics" onClick={() => { setActiveBottomTab('physics'); closeMenus(); }} />
            <DropdownItem icon="script" label="Scripts" onClick={() => { setActiveBottomTab('scripts'); closeMenus(); }} />
            <DropdownDivider />
            <DropdownItem icon="diamond" label="Branding & Logo" onClick={() => { setShowBranding(true); closeMenus(); }} />
          </MenuDropdown>

          <button className="kv-menu-trigger" onClick={() => setShowHelp(true)}>Help</button>
          <button className="kv-menu-trigger kv-build-trigger" onClick={() => setShowBuild(true)}>
            <Icon name="terminal" size={11} /> Build
          </button>
          <button className="kv-menu-trigger kv-export-trigger" onClick={() => setShowExport(true)}>
            <Icon name="save" size={11} /> Export .exe
          </button>
          <button className="kv-menu-trigger kv-desktop-trigger" onClick={() => setShowDesktopBuild(true)}>
            <Icon name="cube" size={11} /> {isElectron ? 'Desktop ✓' : 'Package .exe'}
          </button>
        </div>

        <div className="kv-titlebar-center">
          <span className="kv-scene-name">{sceneName}</span>
          {isPlaying && <span className="kv-playing-badge">PLAYING</span>}
          {frameCount > 0 && <span className="kv-temporal-badge">⏱ {frameCount} frames</span>}
        </div>

        <div className="kv-titlebar-right">
          <span className="kv-status-item">{entities.length} entities</span>
          {scriptCount > 0 && <span className="kv-status-item kv-status-lua">{scriptCount} scripts</span>}
          {physicsCount > 0 && <span className="kv-status-item kv-status-phys">{physicsCount} rigidbodies</span>}
          <span className="kv-version">v1.0.0</span>
        </div>
      </div>

      {/* ========== TOOLBAR ========== */}
      <div className="kv-toolbar">
        <div className="kv-toolbar-section">
          {MESH_OPTIONS.slice(0, 6).map(opt => (
            <button key={opt.type} className="kv-tool-btn" onClick={() => addEntity(opt.type)} title={`Add ${opt.label}`} disabled={isPlaying}>
              <Icon name={opt.icon} size={14} />
            </button>
          ))}
        </div>

        <div className="kv-toolbar-divider" />

        <div className="kv-toolbar-section kv-playback">
          {!isPlaying ? (
            <button className="kv-play-btn" onClick={play} title="Play (F5)">
              <Icon name="play" size={12} /><span>Play</span>
            </button>
          ) : (
            <>
              <button className="kv-pause-btn" onClick={pause} title="Pause (F6)">
                <Icon name={isPaused ? 'play' : 'pause'} size={12} />
              </button>
              <button className="kv-stop-btn" onClick={stop} title="Stop (F5)">
                <Icon name="stop" size={12} /><span>Stop</span>
              </button>
            </>
          )}
        </div>

        <div className="kv-toolbar-divider" />

        {/* TEMPORAL TOOLBAR BUTTONS */}
        <div className="kv-toolbar-section kv-temporal-tools">
          <button className="kv-tool-btn" onClick={() => useEngineStore.getState().temporalStepBackward()}
            title="Step Back (<)" disabled={frameCount === 0}>
            <Icon name="stepBack" size={13} />
          </button>
          <button className="kv-tool-btn" onClick={() => useEngineStore.getState().temporalStepForward()}
            title="Step Forward (>)" disabled={frameCount === 0}>
            <Icon name="stepForward" size={13} />
          </button>
          <button className="kv-tool-btn" onClick={() => useEngineStore.getState().temporalToggleGhosts()} title="Toggle Ghosts">
            <Icon name="ghost" size={14} />
          </button>
          <button className="kv-tool-btn" onClick={() => useEngineStore.getState().temporalToggleTrails()} title="Toggle Trails">
            <Icon name="trail" size={14} />
          </button>
          <button className="kv-tool-btn kv-tool-fork" onClick={() => useEngineStore.getState().temporalForkBranch()}
            title="Fork Branch (Ctrl+B)" disabled={frameCount === 0}>
            <Icon name="fork" size={14} />
          </button>
        </div>

        <div className="kv-toolbar-divider" />

        <div className="kv-toolbar-section kv-toolbar-right">
          <button className="kv-tool-btn kv-save-tool" onClick={() => saveScene()} title="Save (Ctrl+S)" disabled={isPlaying}>
            <Icon name="save" size={14} />
          </button>
          <button className="kv-tool-btn" onClick={() => useEngineStore.getState().togglePhysicsDebug()} title="Toggle Physics Debug">
            <Icon name="physics" size={14} />
          </button>
          <button className="kv-tool-btn" onClick={() => setShowHelp(true)} title="Help">
            <Icon name="info" size={14} />
          </button>
        </div>
      </div>

      {/* ========== MAIN DOCKING AREA ========== */}
      <div className="kv-dock">
        <div className="kv-dock-panel kv-dock-left" style={{ width: leftWidth }}><Hierarchy /></div>
        <ResizeHandle direction="horizontal" onResize={(delta) => {
          setLeftWidth(Math.max(180, Math.min(400, leftBase.current + delta)));
        }} />

        <div className="kv-dock-center">
          <div className="kv-viewport-area"><Viewport /></div>

          {/* TIMELINE BAR — between viewport and bottom panel */}
          <Timeline />

          <ResizeHandle direction="vertical" onResize={(delta) => {
            setBottomHeight(Math.max(100, Math.min(500, bottomBase.current - delta)));
          }} />

          <div className="kv-bottom-area" style={{ height: bottomHeight }}><BottomPanel /></div>
        </div>

        <ResizeHandle direction="horizontal" onResize={(delta) => {
          setRightWidth(Math.max(240, Math.min(500, rightBase.current - delta)));
        }} />

        <div className="kv-dock-panel kv-dock-right" style={{ width: rightWidth }}><Inspector /></div>
      </div>

      {/* ========== STATUS BAR ========== */}
      <div className="kv-statusbar">
        <div className="kv-statusbar-left">
          {engineLogo ? (
            <img src={engineLogo} alt="" style={{ width: 12, height: 12, borderRadius: 2, objectFit: 'contain' }} />
          ) : (
            <Icon name="diamond" size={10} color={engineAccentColor} />
          )}
          <span style={{ color: engineAccentColor }}>{engineName} Engine</span>
          <span className="kv-statusbar-sep">|</span>
          <span>{sceneName}</span>
          {frameCount > 0 && (
            <>
              <span className="kv-statusbar-sep">|</span>
              <span className="kv-statusbar-temporal">
                <Icon name="clock" size={10} color="#61afef" />
                {temporalEngine.currentFrame}/{frameCount} frames
                {temporalEngine.branches.length > 1 && ` • ${temporalEngine.branches.length} branches`}
              </span>
            </>
          )}
        </div>
        <div className="kv-statusbar-right">
          <span>Entities: {entities.length}</span>
          <span className="kv-statusbar-sep">|</span>
          <span>OpenGL 4.5</span>
          <span className="kv-statusbar-sep">|</span>
          <span>{isElectron ? 'Electron Desktop' : 'GLFW + ImGui'}</span>
          <span className="kv-statusbar-sep">|</span>
          <span style={{ color: '#61afef' }}>Temporal Engine</span>
        </div>
      </div>

      {/* ========== MODALS ========== */}
      {showSave && (
        <Modal title="Save Scene" onClose={() => setShowSave(false)} width={420}>
          <div className="kv-form-field">
            <label>Scene Name</label>
            <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && saveName.trim()) { saveScene(saveName.trim()); setShowSave(false); }}} />
          </div>
          <div className="kv-modal-actions">
            <button className="kv-btn kv-btn-primary" onClick={() => { if (saveName.trim()) { saveScene(saveName.trim()); setShowSave(false); }}}>
              <Icon name="save" size={13} /> Save
            </button>
            <button className="kv-btn" onClick={() => setShowSave(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {showLoad && (
        <Modal title="Load Scene" onClose={() => setShowLoad(false)} width={420}>
          {savedScenes.length === 0 ? (
            <p className="kv-empty-text">No saved scenes found.</p>
          ) : (
            <div className="kv-scene-list">
              {savedScenes.map(name => (
                <button key={name} className="kv-scene-item" onClick={() => { loadScene(name); setShowLoad(false); }}>
                  <Icon name="scene" size={14} /><span>{name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="kv-modal-actions">
            <button className="kv-btn" onClick={() => setShowLoad(false)}>Close</button>
          </div>
        </Modal>
      )}

      {showHelp && (
        <Modal title="KEVLA Engine v1.0.0 — User Guide" onClose={() => setShowHelp(false)} width={620}>
          <div className="kv-help">
            <div className="kv-help-section">
              <h3>⏱ Temporal Engine v2 — Delta Compressed</h3>
              <p style={{ color: '#abb2bf', marginBottom: 12, fontSize: 13 }}>
                KEVLA records every frame during Play mode using <b>delta compression</b>: keyframes every {temporalEngine.config.keyframeInterval} frames,
                deltas between. Scrub backward/forward, <b>fork branches</b>, <b>inspect frames</b>, <b>compare two frames</b>,
                see <b>ghost renderings</b>, view <b>waveform minimap</b> of activity/contacts/energy.
                <br/><span style={{ color: '#e5c07b' }}>Unity does not have this feature. Typical 3-8× memory savings from delta compression.</span>
              </p>
              <div className="kv-help-grid">
                <div className="kv-help-card">
                  <h4><Icon name="clock" size={14} /> Time Scrubbing</h4>
                  <p>Pause, then drag the <b>timeline bar</b> to rewind or fast-forward to any frame.</p>
                </div>
                <div className="kv-help-card">
                  <h4><Icon name="ghost" size={14} /> Ghost Rendering</h4>
                  <p>See transparent <b>past positions</b> (solid) and <b>future positions</b> (wireframe) of objects.</p>
                </div>
                <div className="kv-help-card">
                  <h4><Icon name="fork" size={14} /> Timeline Branching</h4>
                  <p>Fork from any frame to create <b>alternate timelines</b>. Compare physics scenarios.</p>
                </div>
                <div className="kv-help-card">
                  <h4><Icon name="trail" size={14} /> Movement Trails</h4>
                  <p>See <b>colored trails</b> showing each object's movement path through time.</p>
                </div>
              </div>
            </div>
            <div className="kv-help-section">
              <h3>Keyboard Shortcuts</h3>
              <table className="kv-help-table">
                <tbody>
                  <tr><td>F5</td><td>Play / Stop</td></tr>
                  <tr><td>F6</td><td>Pause / Resume</td></tr>
                  <tr><td>&lt; / &gt;</td><td>Step backward / forward one frame</td></tr>
                  <tr><td>Home / End</td><td>Jump to start / end of timeline</td></tr>
                  <tr><td>Ctrl+B</td><td>Fork timeline branch</td></tr>
                  <tr><td>Ctrl+M</td><td>Add bookmark at current frame</td></tr>
                  <tr><td>Ctrl+S</td><td>Save scene</td></tr>
                  <tr><td>Ctrl+D</td><td>Duplicate entity</td></tr>
                  <tr><td>Delete</td><td>Delete entity</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="kv-modal-actions">
            <button className="kv-btn kv-btn-primary" onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </Modal>
      )}

      {/* ========== BRANDING MODAL ========== */}
      {showBranding && (
        <Modal title="Engine Branding & Logo" onClose={() => setShowBranding(false)} width={520}>
          <div className="kv-branding">
            {/* Logo Upload */}
            <div className="kv-branding-section">
              <h4 className="kv-branding-label">Engine Logo</h4>
              <p className="kv-branding-hint">Upload a PNG, JPG, SVG, or WebP. Recommended size: 64×64 or 128×128.</p>

              <div
                className={`kv-logo-dropzone ${engineLogo ? 'has-logo' : ''}`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      useEngineStore.getState().warn('Logo file too large (max 2MB)');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result as string;
                      setEngineLogo(result);
                    };
                    reader.readAsDataURL(file);
                  };
                  input.click();
                }}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drag-over');
                  const file = e.dataTransfer.files[0];
                  if (!file || !file.type.startsWith('image/')) return;
                  if (file.size > 2 * 1024 * 1024) {
                    useEngineStore.getState().warn('Logo file too large (max 2MB)');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setEngineLogo(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              >
                {engineLogo ? (
                  <div className="kv-logo-preview-area">
                    <img src={engineLogo} alt="Engine Logo" className="kv-logo-preview-img" />
                    <div className="kv-logo-preview-overlay">
                      <Icon name="upload" size={16} />
                      <span>Click or drop to replace</span>
                    </div>
                  </div>
                ) : (
                  <div className="kv-logo-upload-prompt">
                    <Icon name="upload" size={28} color="#666" />
                    <span className="kv-upload-text">Click to upload or drag & drop</span>
                    <span className="kv-upload-hint">PNG, JPG, SVG, WebP · Max 2MB</span>
                  </div>
                )}
              </div>

              {engineLogo && (
                <div className="kv-logo-actions">
                  <button className="kv-btn" onClick={() => setEngineLogo(null)}>
                    <Icon name="trash" size={12} /> Remove Logo
                  </button>
                </div>
              )}
            </div>

            {/* Engine Name */}
            <div className="kv-branding-section">
              <h4 className="kv-branding-label">Engine Name</h4>
              <p className="kv-branding-hint">Displayed in the title bar and status bar.</p>
              <input
                type="text"
                className="kv-branding-name-input"
                value={engineName}
                onChange={(e) => setEngineName(e.target.value)}
                placeholder="KEVLA"
                maxLength={20}
              />
            </div>

            {/* Accent Color */}
            <div className="kv-branding-section">
              <h4 className="kv-branding-label">Accent Color</h4>
              <p className="kv-branding-hint">The brand color shown next to the engine name.</p>
              <div className="kv-branding-color-row">
                <input
                  type="color"
                  value={engineAccentColor}
                  onChange={(e) => setEngineAccentColor(e.target.value)}
                />
                <span className="kv-color-hex">{engineAccentColor}</span>
                <div className="kv-color-presets">
                  {['#ff8800', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#06b6d4', '#eab308', '#f97316', '#ec4899'].map(c => (
                    <button key={c} className={`kv-color-swatch ${c === engineAccentColor ? 'active' : ''}`}
                      style={{ background: c }} onClick={() => setEngineAccentColor(c)} title={c} />
                  ))}
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="kv-branding-section">
              <h4 className="kv-branding-label">Preview</h4>
              <div className="kv-branding-preview-bar">
                <div className="kv-branding-preview-logo">
                  {engineLogo ? (
                    <img src={engineLogo} alt="preview" className="kv-logo-img" />
                  ) : (
                    <Icon name="diamond" size={12} color={engineAccentColor} />
                  )}
                  <span style={{ color: engineAccentColor, fontWeight: 800, fontSize: 13, letterSpacing: 1.5 }}>{engineName}</span>
                </div>
                <span style={{ color: '#666', fontSize: 11 }}>File  GameObject  Component  Window  Help</span>
              </div>
            </div>

            <div className="kv-modal-actions">
              <button className="kv-btn" style={{ marginRight: 'auto' }} onClick={() => { clearBranding(); }}>
                <Icon name="refresh" size={12} /> Reset to Default
              </button>
              <button className="kv-btn kv-btn-primary" onClick={() => setShowBranding(false)}>
                <Icon name="save" size={12} /> Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {openMenu && <div className="kv-click-away" onClick={closeMenus} />}
      {showBuild && <BuildPanel onClose={() => setShowBuild(false)} />}
      {showExport && <ExportManager onClose={() => setShowExport(false)} />}
      {showDesktopBuild && <DesktopBuild onClose={() => setShowDesktopBuild(false)} />}
    </div>
  );
}
