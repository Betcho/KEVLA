// ============================================================
// KEVLA ENGINE — SVG Icon System
// Professional monochrome icons replacing all emoji
// ============================================================

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const Icon = ({ name, size = 14, className = '', color }: { name: string; size?: number; className?: string; color?: string }) => {
  const style = { width: size, height: size, flexShrink: 0, color };
  const icons: Record<string, React.JSX.Element> = {
    cube: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" {...s}/></svg>,
    sphere: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="10" {...s}/><ellipse cx="12" cy="12" rx="10" ry="4" {...s}/><line x1="12" y1="2" x2="12" y2="22" {...s}/></svg>,
    cylinder: <svg viewBox="0 0 24 24" style={style} className={className}><ellipse cx="12" cy="5" rx="8" ry="3" {...s}/><line x1="4" y1="5" x2="4" y2="19" {...s}/><line x1="20" y1="5" x2="20" y2="19" {...s}/><ellipse cx="12" cy="19" rx="8" ry="3" {...s}/></svg>,
    plane: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M2 16L12 22 22 16 12 10z" {...s}/></svg>,
    cone: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M12 2L4 20h16L12 2z" {...s}/><ellipse cx="12" cy="20" rx="8" ry="2" {...s}/></svg>,
    torus: <svg viewBox="0 0 24 24" style={style} className={className}><ellipse cx="12" cy="12" rx="10" ry="6" {...s}/><ellipse cx="12" cy="12" rx="4" ry="2" {...s}/></svg>,
    folder: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" {...s}/></svg>,
    folderOpen: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v1M2 10l3 9h16l3-9" {...s}/></svg>,
    file: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...s}/><polyline points="14 2 14 8 20 8" {...s}/></svg>,
    script: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...s}/><polyline points="14 2 14 8 20 8" {...s}/><line x1="8" y1="13" x2="16" y2="13" {...s}/><line x1="8" y1="17" x2="12" y2="17" {...s}/></svg>,
    image: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" {...s}/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><polyline points="21 15 16 10 5 21" {...s}/></svg>,
    model3d: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M12 2L2 7l10 5 10-5-10-5z" {...s}/><path d="M2 17l10 5 10-5" {...s}/><path d="M2 12l10 5 10-5" {...s}/></svg>,
    scene: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="2" y="3" width="20" height="14" rx="2" {...s}/><line x1="8" y1="21" x2="16" y2="21" {...s}/><line x1="12" y1="17" x2="12" y2="21" {...s}/></svg>,
    play: <svg viewBox="0 0 24 24" style={style} className={className}><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></svg>,
    pause: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/></svg>,
    stop: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" stroke="none"/></svg>,
    save: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" {...s}/><polyline points="17 21 17 13 7 13 7 21" {...s}/><polyline points="7 3 7 8 15 8" {...s}/></svg>,
    plus: <svg viewBox="0 0 24 24" style={style} className={className}><line x1="12" y1="5" x2="12" y2="19" {...s}/><line x1="5" y1="12" x2="19" y2="12" {...s}/></svg>,
    trash: <svg viewBox="0 0 24 24" style={style} className={className}><polyline points="3 6 5 6 21 6" {...s}/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" {...s}/></svg>,
    copy: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="9" y="9" width="13" height="13" rx="2" {...s}/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" {...s}/></svg>,
    eye: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...s}/><circle cx="12" cy="12" r="3" {...s}/></svg>,
    eyeOff: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" {...s}/><line x1="1" y1="1" x2="23" y2="23" {...s}/></svg>,
    settings: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="3" {...s}/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" {...s}/></svg>,
    physics: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="3" {...s}/><circle cx="12" cy="12" r="8" {...s} strokeDasharray="4 3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" {...s}/></svg>,
    rigidbody: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="4" y="4" width="16" height="16" rx="2" {...s}/><path d="M12 8v8M8 12h8" {...s}/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>,
    collider: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="3" y="3" width="18" height="18" rx="2" {...s} strokeDasharray="4 2"/></svg>,
    transform: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M12 22V6M12 6l-4 4M12 6l4 4" {...s} stroke="#e06c75"/><path d="M2 12h16M18 12l-4-4M18 12l-4 4" {...s} stroke="#98c379"/></svg>,
    material: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="10" {...s}/><path d="M12 2a10 10 0 010 20" fill="currentColor" fillOpacity="0.2" stroke="none"/></svg>,
    search: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="11" cy="11" r="8" {...s}/><line x1="21" y1="21" x2="16.65" y2="16.65" {...s}/></svg>,
    chevronRight: <svg viewBox="0 0 24 24" style={style} className={className}><polyline points="9 18 15 12 9 6" {...s}/></svg>,
    chevronDown: <svg viewBox="0 0 24 24" style={style} className={className}><polyline points="6 9 12 15 18 9" {...s}/></svg>,
    menu: <svg viewBox="0 0 24 24" style={style} className={className}><line x1="3" y1="12" x2="21" y2="12" {...s}/><line x1="3" y1="6" x2="21" y2="6" {...s}/><line x1="3" y1="18" x2="21" y2="18" {...s}/></svg>,
    terminal: <svg viewBox="0 0 24 24" style={style} className={className}><polyline points="4 17 10 11 4 5" {...s}/><line x1="12" y1="19" x2="20" y2="19" {...s}/></svg>,
    grid: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="3" y="3" width="7" height="7" {...s}/><rect x="14" y="3" width="7" height="7" {...s}/><rect x="14" y="14" width="7" height="7" {...s}/><rect x="3" y="14" width="7" height="7" {...s}/></svg>,
    list: <svg viewBox="0 0 24 24" style={style} className={className}><line x1="8" y1="6" x2="21" y2="6" {...s}/><line x1="8" y1="12" x2="21" y2="12" {...s}/><line x1="8" y1="18" x2="21" y2="18" {...s}/><line x1="3" y1="6" x2="3.01" y2="6" {...s} strokeWidth="3"/><line x1="3" y1="12" x2="3.01" y2="12" {...s} strokeWidth="3"/><line x1="3" y1="18" x2="3.01" y2="18" {...s} strokeWidth="3"/></svg>,
    refresh: <svg viewBox="0 0 24 24" style={style} className={className}><polyline points="23 4 23 10 17 10" {...s}/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" {...s}/></svg>,
    x: <svg viewBox="0 0 24 24" style={style} className={className}><line x1="18" y1="6" x2="6" y2="18" {...s}/><line x1="6" y1="6" x2="18" y2="18" {...s}/></svg>,
    info: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="10" {...s}/><line x1="12" y1="16" x2="12" y2="12" {...s}/><line x1="12" y1="8" x2="12.01" y2="8" {...s}/></svg>,
    warn: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" {...s}/><line x1="12" y1="9" x2="12" y2="13" {...s}/><line x1="12" y1="17" x2="12.01" y2="17" {...s}/></svg>,
    error: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="10" {...s}/><line x1="15" y1="9" x2="9" y2="15" {...s}/><line x1="9" y1="9" x2="15" y2="15" {...s}/></svg>,
    light: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="5" {...s}/><line x1="12" y1="1" x2="12" y2="3" {...s}/><line x1="12" y1="21" x2="12" y2="23" {...s}/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" {...s}/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" {...s}/><line x1="1" y1="12" x2="3" y2="12" {...s}/><line x1="21" y1="12" x2="23" y2="12" {...s}/></svg>,
    diamond: <svg viewBox="0 0 24 24" style={style} className={className}><polygon points="12 2 22 12 12 22 2 12" fill="currentColor" stroke="none"/></svg>,
    layout: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="3" y="3" width="18" height="18" rx="2" {...s}/><line x1="3" y1="9" x2="21" y2="9" {...s}/><line x1="9" y1="21" x2="9" y2="9" {...s}/></svg>,
    audio: <svg viewBox="0 0 24 24" style={style} className={className}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" {...s}/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" {...s}/></svg>,
    upload: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" {...s}/><polyline points="17 8 12 3 7 8" {...s}/><line x1="12" y1="3" x2="12" y2="15" {...s}/></svg>,
    // Temporal Engine icons
    clock: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="10" {...s}/><polyline points="12 6 12 12 16 14" {...s}/></svg>,
    rewind: <svg viewBox="0 0 24 24" style={style} className={className}><polygon points="11 19 2 12 11 5" {...s} fill="currentColor"/><polygon points="22 19 13 12 22 5" {...s} fill="currentColor"/></svg>,
    skipBack: <svg viewBox="0 0 24 24" style={style} className={className}><polygon points="19 20 9 12 19 4" {...s} fill="currentColor"/><line x1="5" y1="4" x2="5" y2="20" {...s} strokeWidth="2.5"/></svg>,
    skipForward: <svg viewBox="0 0 24 24" style={style} className={className}><polygon points="5 4 15 12 5 20" {...s} fill="currentColor"/><line x1="19" y1="4" x2="19" y2="20" {...s} strokeWidth="2.5"/></svg>,
    stepBack: <svg viewBox="0 0 24 24" style={style} className={className}><polygon points="17 20 7 12 17 4" {...s} fill="currentColor"/></svg>,
    stepForward: <svg viewBox="0 0 24 24" style={style} className={className}><polygon points="7 4 17 12 7 20" {...s} fill="currentColor"/></svg>,
    ghost: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M12 2C7.58 2 4 5.58 4 10v12l3-3 3 3 2-2 2 2 3-3 3 3V10c0-4.42-3.58-8-8-8z" {...s}/><circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none"/></svg>,
    trail: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="18" cy="6" r="3" {...s}/><circle cx="12" cy="12" r="2" {...s} opacity="0.6"/><circle cx="6" cy="18" r="1.5" {...s} opacity="0.3"/></svg>,
    fork: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="5" r="2.5" {...s}/><circle cx="6" cy="19" r="2.5" {...s}/><circle cx="18" cy="19" r="2.5" {...s}/><path d="M12 7.5v4.5M12 12l-4.5 4.5M12 12l4.5 4.5" {...s}/></svg>,
    bookmark: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" {...s}/></svg>,
    timeline: <svg viewBox="0 0 24 24" style={style} className={className}><line x1="2" y1="12" x2="22" y2="12" {...s}/><circle cx="6" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="6" y1="6" x2="6" y2="10" {...s}/><line x1="18" y1="14" x2="18" y2="18" {...s}/></svg>,
    branch: <svg viewBox="0 0 24 24" style={style} className={className}><line x1="6" y1="3" x2="6" y2="15" {...s}/><circle cx="18" cy="6" r="3" {...s}/><circle cx="6" cy="18" r="3" {...s}/><path d="M18 9c0 6-12 6-12 6" {...s}/></svg>,
    // Parallel Reality Debugger icons
    split: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="2" y="3" width="20" height="18" rx="2" {...s}/><line x1="12" y1="3" x2="12" y2="21" {...s}/></svg>,
    split4: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="2" y="3" width="20" height="18" rx="2" {...s}/><line x1="12" y1="3" x2="12" y2="21" {...s}/><line x1="2" y1="12" x2="22" y2="12" {...s}/></svg>,
    parallel: <svg viewBox="0 0 24 24" style={style} className={className}><rect x="2" y="3" width="8" height="8" rx="1" {...s}/><rect x="14" y="3" width="8" height="8" rx="1" {...s}/><rect x="2" y="13" width="8" height="8" rx="1" {...s}/><rect x="14" y="13" width="8" height="8" rx="1" {...s}/></svg>,
    merge: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="6" cy="6" r="2.5" {...s}/><circle cx="6" cy="18" r="2.5" {...s}/><circle cx="18" cy="12" r="2.5" {...s}/><path d="M8.5 6.5L15.5 11.5M8.5 17.5L15.5 12.5" {...s}/></svg>,
    compare: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" {...s}/></svg>,
    gravity: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="8" r="3" {...s}/><path d="M12 11v8M8 16l4 4 4-4" {...s}/></svg>,
    speed: <svg viewBox="0 0 24 24" style={style} className={className}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" {...s}/></svg>,
    promote: <svg viewBox="0 0 24 24" style={style} className={className}><polyline points="17 1 21 5 17 9" {...s}/><path d="M3 11V9a4 4 0 014-4h14" {...s}/><polyline points="7 23 3 19 7 15" {...s}/><path d="M21 13v2a4 4 0 01-4 4H3" {...s}/></svg>,
    diverge: <svg viewBox="0 0 24 24" style={style} className={className}><circle cx="12" cy="12" r="10" {...s}/><path d="M12 8v4l2 2" {...s}/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>,
  };
  return icons[name] || <svg viewBox="0 0 24 24" style={style}><circle cx="12" cy="12" r="4" {...s}/></svg>;
};

export const MeshIcon = ({ type, size = 14 }: { type: string; size?: number }) => {
  const map: Record<string, string> = { cube: 'cube', sphere: 'sphere', cylinder: 'cylinder', plane: 'plane', cone: 'cone', torus: 'torus' };
  return <Icon name={map[type] || 'cube'} size={size} />;
};
