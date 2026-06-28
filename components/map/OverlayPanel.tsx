'use client';

import { useState } from 'react';

export interface OverlayDef {
  id: string;
  label: string;
  emoji: string;
  color: string;
  /** OSM/Overpass query fragment, e.g. node["amenity"="fuel"] */
  query: string;
}

export const OVERLAY_DEFS: OverlayDef[] = [
  { id: 'gas',         label: 'Gas stations', emoji: '⛽', color: '#FF6B35', query: `node["amenity"="fuel"]` },
  { id: 'supermarket', label: 'Supermarkets',  emoji: '🛒', color: '#2E7D32', query: `(node["shop"="supermarket"];node["shop"="convenience"];)` },
  { id: 'pharmacy',    label: 'Pharmacies',    emoji: '💊', color: '#C2185B', query: `node["amenity"="pharmacy"]` },
  { id: 'restaurant',  label: 'Restaurants',   emoji: '🍽️', color: '#E64A19', query: `node["amenity"="restaurant"]` },
  { id: 'cafe',        label: 'Cafes',         emoji: '☕', color: '#5D4037', query: `node["amenity"="cafe"]` },
  { id: 'parking',     label: 'Parking lots',  emoji: '🅿️', color: '#37474F', query: `node["amenity"="parking"]` },
];

interface Props {
  active: Set<string>;
  loading: Set<string>;
  errors: Map<string, string>;
  onToggle: (id: string) => void;
}

export default function OverlayPanel({ active, loading, errors, onToggle }: Props) {
  // errors is now a Map<id, message>
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        top: 'calc(env(safe-area-inset-top) + 70px)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: open ? '#2C5878' : '#fff',
          border: 'none',
          boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        aria-label="Toggle map layers"
        title="Map layers"
      >
        <i
          className={open ? 'ti ti-x' : 'ti ti-layers-subtract'}
          style={{ fontSize: 20, color: open ? '#fff' : '#1a1a1a' }}
        />
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: '12px 6px',
            boxShadow: '0 6px 28px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 200,
          }}
        >
          <p style={{
            margin: '0 10px 6px',
            fontSize: 10,
            fontWeight: 700,
            color: '#999',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}>
            Map layers
          </p>

          {OVERLAY_DEFS.map(def => {
            const isActive = active.has(def.id);
            const isLoading = loading.has(def.id);
            const errorMsg = errors.get(def.id);
            const hasError = !!errorMsg;
            return (
              <button
                key={def.id}
                onClick={() => onToggle(def.id)}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: isActive ? def.color + '18' : 'transparent',
                  border: 'none',
                  borderRadius: 12,
                  cursor: isLoading ? 'default' : 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'background 0.15s',
                  pointerEvents: 'auto',
                }}
              >
                <span style={{ fontSize: 19, lineHeight: 1 }}>{def.emoji}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', display: 'block' }}>
                    {def.label}
                  </span>
                  {hasError && (
                    <span style={{ fontSize: 10, color: '#c0392b' }}>{errorMsg}</span>
                  )}
                </div>
                {/* Status indicator */}
                {isLoading ? (
                  <i className="ti ti-loader-2" style={{
                    fontSize: 18,
                    color: def.color,
                    animation: 'spin 0.8s linear infinite',
                    flexShrink: 0,
                  }} />
                ) : (
                  <span style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: isActive ? def.color : hasError ? '#fee' : 'transparent',
                    border: `2px solid ${isActive ? def.color : hasError ? '#c0392b' : '#d0d0d0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    color: hasError ? '#c0392b' : '#fff',
                    fontWeight: 700,
                    transition: 'all 0.15s',
                  }}>
                    {isActive ? '✓' : hasError ? '!' : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
