// ============================================================
// KEVLA ENGINE — Timeline Panel v2.0
// Production-Grade Time-Travel Debugging UI
//
// Features:
//   • Waveform minimap (entity count, contacts, energy)
//   • Frame scrubber with playhead
//   • Frame Inspector (click to see entity states)
//   • Frame Comparison (diff two frames)
//   • Branch management
//   • Bookmark diamonds
//   • Compression stats
//   • Keyboard shortcuts
// ============================================================

import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useEngineStore } from '../engine/store';
import { Icon } from './Icons';
import type { WaveformPoint, FrameDiffEntry } from '../engine/temporal';

// ---- Keyframe bookmark indicator ----
function Keyframe({ x, color, label, onClick }: { x: number; color: string; label?: string; onClick?: () => void }) {
  return (
    <div className="tl-keyframe" style={{ left: `${x}%` }} onClick={onClick} title={label}>
      <div className="tl-keyframe-diamond" style={{ borderColor: color }} />
    </div>
  );
}

// ---- Waveform minimap (renders entity count / contacts as a bar graph) ----
function Waveform({ data, currentFrame, totalFrames, onScrub, mode }: {
  data: WaveformPoint[];
  currentFrame: number;
  totalFrames: number;
  onScrub: (frame: number) => void;
  mode: 'activity' | 'contacts' | 'energy';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Get max value for normalization
    let maxVal = 1;
    data.forEach(d => {
      const val = mode === 'activity' ? d.activity : mode === 'contacts' ? d.contacts : d.energy;
      if (val > maxVal) maxVal = val;
    });

    // Color based on mode
    const colors = {
      activity: { fill: 'rgba(97, 175, 239, 0.4)', stroke: 'rgba(97, 175, 239, 0.8)' },
      contacts: { fill: 'rgba(224, 108, 117, 0.4)', stroke: 'rgba(224, 108, 117, 0.8)' },
      energy: { fill: 'rgba(152, 195, 121, 0.4)', stroke: 'rgba(152, 195, 121, 0.8)' },
    };

    const { fill, stroke } = colors[mode];

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(0, h);

    data.forEach((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const val = mode === 'activity' ? d.activity : mode === 'contacts' ? d.contacts : d.energy;
      const barH = (val / maxVal) * h * 0.9;
      ctx.lineTo(x, h - barH);
    });

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // Draw line on top
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * w;
      const val = mode === 'activity' ? d.activity : mode === 'contacts' ? d.contacts : d.energy;
      const barH = (val / maxVal) * h * 0.9;
      if (i === 0) ctx.moveTo(x, h - barH);
      else ctx.lineTo(x, h - barH);
    });
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw playhead line
    const playheadX = (currentFrame / Math.max(1, totalFrames - 1)) * w;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [data, currentFrame, totalFrames, mode]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const frame = Math.round(pct * (totalFrames - 1));
    onScrub(frame);
  };

  return (
    <canvas
      ref={canvasRef}
      className="tl-waveform-canvas"
      width={600}
      height={30}
      onClick={handleClick}
    />
  );
}

// ---- Frame Inspector panel ----
function FrameInspector({ frame, onClose }: { frame: number; onClose: () => void }) {
  const temporal = useEngineStore(s => s.temporalEngine);
  const inspection = useMemo(() => temporal.inspectFrame(frame), [temporal, frame]);

  if (!inspection) return null;

  const { meta, entities, isKeyframe, deltaSize } = inspection;

  return (
    <div className="tl-inspector">
      <div className="tl-inspector-header">
        <span className="tl-inspector-title">
          <Icon name="info" size={11} />
          Frame #{meta.frameIndex}
          <span className={`tl-frame-badge ${isKeyframe ? 'keyframe' : 'delta'}`}>
            {isKeyframe ? 'K' : `Δ${deltaSize}`}
          </span>
        </span>
        <button className="tl-inspector-close" onClick={onClose}>
          <Icon name="x" size={10} />
        </button>
      </div>

      <div className="tl-inspector-meta">
        <div className="tl-meta-item"><span>Time</span><span>{meta.timestamp.toFixed(3)}s</span></div>
        <div className="tl-meta-item"><span>ΔT</span><span>{(meta.deltaTime * 1000).toFixed(1)}ms</span></div>
        <div className="tl-meta-item"><span>Entities</span><span>{meta.entityCount}</span></div>
        <div className="tl-meta-item"><span>Contacts</span><span>{meta.activeContacts}</span></div>
        <div className="tl-meta-item"><span>Errors</span><span className={meta.scriptErrorCount > 0 ? 'tl-val-err' : ''}>{meta.scriptErrorCount}</span></div>
        <div className="tl-meta-item"><span>Energy</span><span>{meta.physicsEnergy.toFixed(1)} J</span></div>
      </div>

      <div className="tl-inspector-entities">
        <div className="tl-inspector-subtitle">Entity States ({entities.length})</div>
        <div className="tl-entity-list">
          {entities.map(e => (
            <div key={e.id} className={`tl-entity-row ${!e.active ? 'inactive' : ''}`}>
              <span className="tl-entity-name" title={e.id}>
                <span className="tl-entity-dot" style={{ backgroundColor: e.color }} />
                {e.name}
              </span>
              <div className="tl-entity-details">
                <span title="Position">
                  P({e.position.x.toFixed(1)}, {e.position.y.toFixed(1)}, {e.position.z.toFixed(1)})
                </span>
                {(Math.abs(e.velocity.x) > 0.01 || Math.abs(e.velocity.y) > 0.01 || Math.abs(e.velocity.z) > 0.01) && (
                  <span className="tl-entity-vel" title="Velocity">
                    V({e.velocity.x.toFixed(1)}, {e.velocity.y.toFixed(1)}, {e.velocity.z.toFixed(1)})
                  </span>
                )}
                {e.isSleeping && <span className="tl-entity-badge sleep">ZZZ</span>}
                {e.collidingWith.length > 0 && (
                  <span className="tl-entity-badge collision">
                    💥{e.collidingWith.length}
                  </span>
                )}
                {e.scriptErrors.length > 0 && (
                  <span className="tl-entity-badge error">⚠{e.scriptErrors.length}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Frame Comparison panel ----
function FrameComparison({ frameA, frameB, onClose }: { frameA: number; frameB: number; onClose: () => void }) {
  const temporal = useEngineStore(s => s.temporalEngine);
  const diffs = useMemo(() => temporal.compareFrames(frameA, frameB), [temporal, frameA, frameB]);

  return (
    <div className="tl-comparison">
      <div className="tl-comparison-header">
        <span>
          <Icon name="fork" size={11} />
          Compare Frame #{frameA} ↔ #{frameB}
        </span>
        <button className="tl-inspector-close" onClick={onClose}>
          <Icon name="x" size={10} />
        </button>
      </div>
      <div className="tl-comparison-summary">
        <span className="tl-comp-stat modified">{diffs.filter(d => d.changeType === 'modified').length} modified</span>
        <span className="tl-comp-stat added">{diffs.filter(d => d.changeType === 'added').length} added</span>
        <span className="tl-comp-stat removed">{diffs.filter(d => d.changeType === 'removed').length} removed</span>
      </div>
      <div className="tl-diff-list">
        {diffs.length === 0 && <div className="tl-diff-empty">Frames are identical</div>}
        {diffs.map((diff: FrameDiffEntry, i: number) => (
          <div key={i} className={`tl-diff-row ${diff.changeType}`}>
            <span className="tl-diff-entity">{diff.entityName}</span>
            <span className="tl-diff-prop">.{diff.property}</span>
            <div className="tl-diff-values">
              <span className="tl-diff-a">{diff.valueA}</span>
              <span className="tl-diff-arrow">→</span>
              <span className="tl-diff-b">{diff.valueB}</span>
            </div>
            <div className="tl-diff-bar">
              <div className="tl-diff-bar-fill" style={{ width: `${diff.changeMagnitude * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main Timeline Component
// ============================================================

export default function Timeline() {
  const isPlaying = useEngineStore(s => s.isPlaying);
  const isPaused = useEngineStore(s => s.isPaused);
  const temporal = useEngineStore(s => s.temporalEngine);
  const temporalConfig = useEngineStore(s => s.temporalConfig);
  const temporalScrub = useEngineStore(s => s.temporalScrub);
  const temporalStepForward = useEngineStore(s => s.temporalStepForward);
  const temporalStepBackward = useEngineStore(s => s.temporalStepBackward);
  const temporalJumpToStart = useEngineStore(s => s.temporalJumpToStart);
  const temporalJumpToEnd = useEngineStore(s => s.temporalJumpToEnd);
  const temporalForkBranch = useEngineStore(s => s.temporalForkBranch);
  const temporalSwitchBranch = useEngineStore(s => s.temporalSwitchBranch);
  const temporalDeleteBranch = useEngineStore(s => s.temporalDeleteBranch);
  const temporalAddBookmark = useEngineStore(s => s.temporalAddBookmark);
  const temporalToggleGhosts = useEngineStore(s => s.temporalToggleGhosts);
  const temporalToggleTrails = useEngineStore(s => s.temporalToggleTrails);
  const temporalSetGhostCount = useEngineStore(s => s.temporalSetGhostCount);
  const pause = useEngineStore(s => s.pause);
  const play = useEngineStore(s => s.play);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const [showBranches, setShowBranches] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [waveformMode, setWaveformMode] = useState<'activity' | 'contacts' | 'energy'>('activity');
  const [showInspector, setShowInspector] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [compFrameA, setCompFrameA] = useState<number | null>(null);
  const [compFrameB, setCompFrameB] = useState<number | null>(null);
  const [selectingCompFrame, setSelectingCompFrame] = useState<'A' | 'B' | null>(null);

  const data = temporal.getTimelineData();
  const hasFrames = data.totalFrames > 0;
  const progress = hasFrames ? (data.currentFrame / Math.max(1, data.totalFrames - 1)) * 100 : 0;
  const currentMeta = temporal.getCurrentSnapshot();
  const waveformData = temporal.getWaveformData();

  // Format time
  const formatTime = (frame: number): string => {
    const meta = temporal.getFrameMeta(frame);
    if (!meta) return '0.00s';
    return `${meta.timestamp.toFixed(2)}s`;
  };

  // Scrub handler
  const handleScrub = useCallback((clientX: number) => {
    if (!scrubberRef.current || !hasFrames) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const frame = Math.round(pct * (data.totalFrames - 1));

    if (selectingCompFrame === 'A') {
      setCompFrameA(frame);
      setSelectingCompFrame('B');
      return;
    } else if (selectingCompFrame === 'B') {
      setCompFrameB(frame);
      setSelectingCompFrame(null);
      setShowComparison(true);
      return;
    }

    temporalScrub(frame);
  }, [hasFrames, data.totalFrames, temporalScrub, selectingCompFrame]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!hasFrames) return;
    if (selectingCompFrame) {
      handleScrub(e.clientX);
      return;
    }
    if (isPlaying && !isPaused) pause();
    setIsDragging(true);
    handleScrub(e.clientX);

    const onMove = (ev: MouseEvent) => handleScrub(ev.clientX);
    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [hasFrames, isPlaying, isPaused, pause, handleScrub, selectingCompFrame]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isPlaying && !hasFrames) return;
      if (e.key === ',' || e.key === '<') { e.preventDefault(); temporalStepBackward(); }
      if (e.key === '.' || e.key === '>') { e.preventDefault(); temporalStepForward(); }
      if (e.key === 'Home') { e.preventDefault(); temporalJumpToStart(); }
      if (e.key === 'End') { e.preventDefault(); temporalJumpToEnd(); }
      if (e.key === 'b' && e.ctrlKey) { e.preventDefault(); temporalForkBranch(); }
      if (e.key === 'm' && e.ctrlKey) { e.preventDefault(); temporalAddBookmark('Bookmark'); }
      if (e.key === 'i' && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        setShowInspector(prev => !prev);
        temporal.setInspectedFrame(temporal.currentFrame);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, hasFrames, temporalStepForward, temporalStepBackward, temporalJumpToStart, temporalJumpToEnd, temporalForkBranch, temporalAddBookmark, temporal]);

  const memLabel = data.memoryKB < 1024
    ? `${data.memoryKB} KB`
    : `${(data.memoryKB / 1024).toFixed(1)} MB`;

  // Compression info
  const compressionLabel = data.keyframeCount > 0
    ? `${data.keyframeCount}K + ${data.deltaCount}Δ (${data.compressionRatio.toFixed(1)}:1)`
    : '—';

  // Inactive state
  if (!isPlaying && !hasFrames) {
    return (
      <div className="tl-bar tl-inactive">
        <div className="tl-label">
          <Icon name="clock" size={12} />
          <span>Temporal Engine v2</span>
        </div>
        <div className="tl-hint">Press ▶ Play to start recording — delta compression enabled</div>
        <div className="tl-hint-extra">
          <span>Keyframe interval: {temporalConfig.keyframeInterval}f</span>
          <span>Max: {temporalConfig.maxFrames}f</span>
          <span>Budget: {temporalConfig.memoryBudgetMB}MB</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`tl-bar ${data.isRecording ? 'recording' : ''} ${isDragging ? 'dragging' : ''} ${selectingCompFrame ? 'selecting' : ''}`}>
      {/* Left transport controls */}
      <div className="tl-controls">
        <button className="tl-btn" onClick={temporalJumpToStart} title="Jump to Start (Home)" disabled={!hasFrames}>
          <Icon name="skipBack" size={11} />
        </button>
        <button className="tl-btn" onClick={temporalStepBackward} title="Step Back (<)" disabled={!hasFrames || data.currentFrame === 0}>
          <Icon name="stepBack" size={11} />
        </button>

        {data.isRecording ? (
          <div className="tl-rec-indicator" title="Recording with delta compression">
            <span className="tl-rec-dot" />
            <span>REC</span>
          </div>
        ) : (
          <button className="tl-btn tl-btn-resume" onClick={() => play()} title="Resume Recording">
            <Icon name="play" size={9} />
          </button>
        )}

        <button className="tl-btn" onClick={temporalStepForward} title="Step Forward (>)" disabled={!hasFrames || data.currentFrame >= data.totalFrames - 1}>
          <Icon name="stepForward" size={11} />
        </button>
        <button className="tl-btn" onClick={temporalJumpToEnd} title="Jump to End (End)" disabled={!hasFrames}>
          <Icon name="skipForward" size={11} />
        </button>
      </div>

      {/* Frame counter */}
      <div className="tl-frame-info">
        <span className="tl-frame-num">{data.currentFrame}</span>
        <span className="tl-frame-sep">/</span>
        <span className="tl-frame-total">{data.totalFrames}</span>
        <span className="tl-frame-time">{hasFrames ? formatTime(data.currentFrame) : '0.00s'}</span>
      </div>

      {/* Scrubber + Waveform area */}
      <div className="tl-scrubber-container">
        {/* Waveform minimap */}
        {waveformData.length > 5 && (
          <div className="tl-waveform-wrap">
            <Waveform
              data={waveformData}
              currentFrame={data.currentFrame}
              totalFrames={data.totalFrames}
              onScrub={temporalScrub}
              mode={waveformMode}
            />
            <div className="tl-waveform-mode">
              <button className={waveformMode === 'activity' ? 'active' : ''} onClick={() => setWaveformMode('activity')} title="Activity">A</button>
              <button className={waveformMode === 'contacts' ? 'active' : ''} onClick={() => setWaveformMode('contacts')} title="Contacts">C</button>
              <button className={waveformMode === 'energy' ? 'active' : ''} onClick={() => setWaveformMode('energy')} title="Energy">E</button>
            </div>
          </div>
        )}

        {/* Main scrubber bar */}
        <div className="tl-scrubber" ref={scrubberRef} onMouseDown={handleMouseDown}>
          <div className="tl-track">
            <div className="tl-track-fill" style={{
              width: `${progress}%`,
              backgroundColor: data.branches.find(b => b.isActive)?.color || '#61afef',
            }} />

            {/* Comparison frame markers */}
            {compFrameA !== null && (
              <div className="tl-comp-marker a" style={{ left: `${(compFrameA / Math.max(1, data.totalFrames - 1)) * 100}%` }} title={`Compare A: Frame ${compFrameA}`} />
            )}
            {compFrameB !== null && (
              <div className="tl-comp-marker b" style={{ left: `${(compFrameB / Math.max(1, data.totalFrames - 1)) * 100}%` }} title={`Compare B: Frame ${compFrameB}`} />
            )}

            {/* Bookmarks */}
            {data.bookmarks.map((bm, i) => {
              const pct = hasFrames ? (bm.frame / (data.totalFrames - 1)) * 100 : 0;
              return <Keyframe key={i} x={pct} color={bm.color} label={bm.label} onClick={() => temporalScrub(bm.frame)} />;
            })}

            {/* Fork points */}
            {data.branches.filter(b => !b.isActive && b.forkFrame > 0).map(b => {
              const pct = hasFrames ? (b.forkFrame / (data.totalFrames - 1)) * 100 : 0;
              return <Keyframe key={b.id} x={pct} color={b.color} label={`Fork: ${b.name}`} onClick={() => temporalSwitchBranch(b.id)} />;
            })}
          </div>

          {/* Playhead */}
          <div className="tl-playhead" style={{ left: `${progress}%` }}>
            <div className="tl-playhead-handle" />
            <div className="tl-playhead-line" />
          </div>
        </div>

        {/* Info bar under scrubber */}
        {currentMeta && (
          <div className="tl-snap-info">
            <span>{currentMeta.entityCount} entities</span>
            <span>{currentMeta.activeContacts} contacts</span>
            <span className="tl-snap-energy">{currentMeta.physicsEnergy.toFixed(1)}J</span>
            {currentMeta.scriptErrorCount > 0 && (
              <span className="tl-snap-err">{currentMeta.scriptErrorCount} errors</span>
            )}
            <span className="tl-snap-compression">{compressionLabel}</span>
          </div>
        )}
      </div>

      {/* Selection mode indicator */}
      {selectingCompFrame && (
        <div className="tl-select-mode">
          <span>Click to select Frame {selectingCompFrame}</span>
          <button onClick={() => { setSelectingCompFrame(null); setCompFrameA(null); setCompFrameB(null); }}>Cancel</button>
        </div>
      )}

      {/* Right controls */}
      <div className="tl-right-controls">
        {/* Inspect frame */}
        <button className={`tl-btn ${showInspector ? 'active' : ''}`}
          onClick={() => { setShowInspector(!showInspector); temporal.setInspectedFrame(data.currentFrame); }}
          title="Inspect Frame (Ctrl+Shift+I)">
          <Icon name="info" size={12} />
        </button>

        {/* Compare frames */}
        <button className={`tl-btn ${selectingCompFrame || showComparison ? 'active' : ''}`}
          onClick={() => {
            if (showComparison) { setShowComparison(false); return; }
            setCompFrameA(data.currentFrame);
            setSelectingCompFrame('B');
          }}
          title="Compare Frames">
          <Icon name="fork" size={12} />
        </button>

        {/* Ghost toggle */}
        <button className={`tl-btn ${temporalConfig.ghostCount > 0 ? 'active' : ''}`}
          onClick={temporalToggleGhosts}
          title="Toggle Ghosts">
          <Icon name="ghost" size={12} />
        </button>

        {/* Trail toggle */}
        <button className={`tl-btn ${temporalConfig.showTrails ? 'active' : ''}`}
          onClick={temporalToggleTrails}
          title="Toggle Trails">
          <Icon name="trail" size={12} />
        </button>

        {/* Fork */}
        <button className="tl-btn tl-btn-fork" onClick={() => temporalForkBranch()} title="Fork Branch (Ctrl+B)" disabled={!hasFrames}>
          <Icon name="fork" size={12} />
        </button>

        {/* Bookmark */}
        <button className="tl-btn" onClick={() => temporalAddBookmark(`F${data.currentFrame}`)} title="Bookmark (Ctrl+M)" disabled={!hasFrames}>
          <Icon name="bookmark" size={12} />
        </button>

        {/* Branch selector */}
        {data.branches.length > 1 && (
          <div className="tl-branch-wrapper">
            <button className={`tl-btn tl-btn-branch ${showBranches ? 'active' : ''}`}
              onClick={() => { setShowBranches(!showBranches); setShowSettings(false); }}>
              <span className="tl-branch-dot" style={{ backgroundColor: data.branches.find(b => b.isActive)?.color }} />
              <span className="tl-branch-count">{data.branches.length}</span>
            </button>
            {showBranches && (
              <div className="tl-branch-dropdown">
                <div className="tl-branch-title">Timeline Branches</div>
                {data.branches.map(b => (
                  <div key={b.id} className={`tl-branch-item ${b.isActive ? 'active' : ''}`}
                    onClick={() => { temporalSwitchBranch(b.id); setShowBranches(false); }}>
                    <span className="tl-branch-color" style={{ backgroundColor: b.color }} />
                    <span className="tl-branch-name">{b.name}</span>
                    <span className="tl-branch-frames">{b.frameCount}f</span>
                    {b.id !== 'main' && (
                      <button className="tl-branch-del" onClick={(e) => { e.stopPropagation(); temporalDeleteBranch(b.id); }}>
                        <Icon name="x" size={9} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="tl-settings-wrapper">
          <button className={`tl-btn ${showSettings ? 'active' : ''}`}
            onClick={() => { setShowSettings(!showSettings); setShowBranches(false); }}>
            <Icon name="settings" size={11} />
          </button>
          {showSettings && (
            <div className="tl-settings-dropdown">
              <div className="tl-settings-title">Temporal Settings</div>
              <div className="tl-setting">
                <span>Ghost Count</span>
                <input type="range" min={0} max={10} value={temporalConfig.ghostCount}
                  onChange={e => temporalSetGhostCount(parseInt(e.target.value))} />
                <span className="tl-setting-val">{temporalConfig.ghostCount}</span>
              </div>
              <div className="tl-setting">
                <span>Ghost Spacing</span>
                <input type="range" min={1} max={30} value={temporalConfig.ghostSpacing}
                  onChange={e => useEngineStore.getState().temporalUpdateConfig({ ghostSpacing: parseInt(e.target.value) })} />
                <span className="tl-setting-val">{temporalConfig.ghostSpacing}f</span>
              </div>
              <div className="tl-setting">
                <span>Keyframe Interval</span>
                <input type="range" min={5} max={120} value={temporalConfig.keyframeInterval}
                  onChange={e => useEngineStore.getState().temporalUpdateConfig({ keyframeInterval: parseInt(e.target.value) })} />
                <span className="tl-setting-val">{temporalConfig.keyframeInterval}f</span>
              </div>
              <div className="tl-setting">
                <span>Max Frames</span>
                <span className="tl-setting-val">{temporalConfig.maxFrames}</span>
              </div>
              <div className="tl-setting">
                <span>Memory Budget</span>
                <span className="tl-setting-val">{temporalConfig.memoryBudgetMB}MB</span>
              </div>
            </div>
          )}
        </div>

        {/* Memory */}
        <div className="tl-memory" title={`Memory: ${memLabel}`}>
          <Icon name="info" size={9} />
          <span>{memLabel}</span>
        </div>
      </div>

      {/* Floating panels */}
      {showInspector && hasFrames && (
        <FrameInspector frame={data.currentFrame} onClose={() => setShowInspector(false)} />
      )}

      {showComparison && compFrameA !== null && compFrameB !== null && (
        <FrameComparison frameA={compFrameA} frameB={compFrameB} onClose={() => {
          setShowComparison(false);
          setCompFrameA(null);
          setCompFrameB(null);
        }} />
      )}
    </div>
  );
}
