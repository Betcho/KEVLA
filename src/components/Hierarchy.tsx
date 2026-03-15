// ============================================================
// KEVLA ENGINE — Hierarchy Panel (Production)
// Unity-style entity tree with SVG icons
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useEngineStore } from '../engine/store';
import type { MeshType } from '../engine/types';
import { Icon, MeshIcon } from './Icons';

const MESH_OPTIONS: { type: MeshType; label: string }[] = [
  { type: 'cube', label: 'Cube' },
  { type: 'sphere', label: 'Sphere' },
  { type: 'cylinder', label: 'Cylinder' },
  { type: 'plane', label: 'Plane' },
  { type: 'cone', label: 'Cone' },
  { type: 'torus', label: 'Torus' },
];

export default function Hierarchy() {
  const entities = useEngineStore(s => s.entities);
  const selectedId = useEngineStore(s => s.selectedId);
  const selectEntity = useEngineStore(s => s.selectEntity);
  const removeEntity = useEngineStore(s => s.removeEntity);
  const duplicateEntity = useEngineStore(s => s.duplicateEntity);
  const addEntity = useEngineStore(s => s.addEntity);
  const toggleEntityActive = useEngineStore(s => s.toggleEntityActive);
  const renameEntity = useEngineStore(s => s.renameEntity);
  const isPlaying = useEngineStore(s => s.isPlaying);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editingId]);

  const commitRename = () => {
    if (editingId && editName.trim()) renameEntity(editingId, editName.trim());
    setEditingId(null);
  };

  const filteredEntities = searchQuery
    ? entities.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : entities;

  return (
    <div className="kv-panel">
      <div className="kv-panel-header">
        <Icon name="layout" size={12} />
        <span>Hierarchy</span>
        <div className="kv-panel-actions">
          <div className="kv-add-wrapper">
            <button className="kv-icon-btn" onClick={() => setShowAddMenu(!showAddMenu)} title="Add Entity">
              <Icon name="plus" size={14} />
            </button>
            {showAddMenu && (
              <div className="kv-dropdown" style={{ right: 0, top: '100%' }}>
                {MESH_OPTIONS.map(opt => (
                  <button key={opt.type} className="kv-dropdown-item" onClick={() => { addEntity(opt.type); setShowAddMenu(false); }}>
                    <MeshIcon type={opt.type} size={13} />
                    <span className="kv-dropdown-label">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="kv-search-bar">
        <Icon name="search" size={12} color="#666" />
        <input
          type="text"
          placeholder="Search entities..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="kv-search-clear" onClick={() => setSearchQuery('')}>
            <Icon name="x" size={10} />
          </button>
        )}
      </div>

      <div className="kv-panel-body kv-hierarchy-list">
        {filteredEntities.length === 0 && (
          <div className="kv-empty">
            {searchQuery ? 'No matching entities' : 'Empty scene — click + to add'}
          </div>
        )}

        {filteredEntities.map(entity => {
          const isSelected = entity.id === selectedId;
          const meshType = entity.meshRenderer?.meshType || 'cube';

          return (
            <div
              key={entity.id}
              className={`kv-hierarchy-item ${isSelected ? 'selected' : ''} ${!entity.active ? 'inactive' : ''}`}
              onClick={() => selectEntity(entity.id)}
              onDoubleClick={() => { setEditingId(entity.id); setEditName(entity.name); }}
            >
              <button className="kv-vis-toggle" onClick={e => { e.stopPropagation(); toggleEntityActive(entity.id); }}
                title={entity.active ? 'Hide' : 'Show'}>
                <Icon name={entity.active ? 'eye' : 'eyeOff'} size={12} />
              </button>

              <span className="kv-entity-icon">
                <MeshIcon type={meshType} size={13} />
              </span>

              {editingId === entity.id ? (
                <input ref={inputRef} className="kv-rename-input" value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null); }}
                  onClick={e => e.stopPropagation()} />
              ) : (
                <span className="kv-entity-label">{entity.name}</span>
              )}

              {/* Component indicators */}
              <div className="kv-entity-badges">
                {entity.rigidbody && <span className="kv-badge kv-badge-phys" title="Rigidbody">RB</span>}
                {entity.collider && <span className="kv-badge kv-badge-col" title="Collider">C</span>}
                {entity.scripts.length > 0 && <span className="kv-badge kv-badge-lua" title="Scripts">S</span>}
              </div>

              {isSelected && !isPlaying && (
                <div className="kv-entity-actions">
                  <button onClick={e => { e.stopPropagation(); duplicateEntity(entity.id); }} title="Duplicate">
                    <Icon name="copy" size={11} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeEntity(entity.id); }} title="Delete" className="kv-delete-btn">
                    <Icon name="trash" size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="kv-panel-footer">
        <span>{entities.length} entit{entities.length === 1 ? 'y' : 'ies'}</span>
        {searchQuery && <span className="kv-filter-badge">{filteredEntities.length} shown</span>}
      </div>
    </div>
  );
}
