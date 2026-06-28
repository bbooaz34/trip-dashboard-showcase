'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { StopCategory } from '@/lib/types';
import { CATEGORY_COLOR, CATEGORY_EMOJI, CATEGORY_LABEL, haversineKm, formatDistance, googleMapsUrl, wazeUrl } from '@/lib/stops';
import { OVERLAY_DEFS } from './OverlayPanel';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StopFeature {
  id: string; name: string; category: StopCategory;
  lat: number; lng: number; description_html: string;
  position: number; images?: string[];
}
interface SelectedStop extends StopFeature { distanceKm: number | null; poiDef?: undefined; importLayer?: undefined; }
interface SelectedPOI {
  id: string; name: string; lat: number; lng: number; distanceKm: number | null;
  poiDef: typeof OVERLAY_DEFS[number]; importLayer?: undefined; address?: string;
}
interface SelectedImport {
  id: string; name: string; lat: number; lng: number; distanceKm: number | null;
  description?: string; properties: Record<string, unknown>;
  layerName: string; layerColor: string; layerEmoji: string;
  poiDef?: undefined; importLayer: true;
}
type Selected = SelectedStop | SelectedPOI | SelectedImport;

export interface ImportLayer {
  id: string; name: string; color: string; emoji: string; features: any[];
}

const IMPORT_COLORS = ['#6155F5', '#FF383C', '#FF9500', '#0088FF', '#34C759', '#FFCC00'];
const BASE_LAT = 47.898;
const BASE_LNG = 8.156;

function pickColor(index: number) { return IMPORT_COLORS[index % IMPORT_COLORS.length]; }

function getFeaturePoint(feature: any): [number, number] | null {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === 'Point') return g.coordinates as [number, number];
  if (g.type === 'LineString' && g.coordinates?.length > 0) return g.coordinates[0];
  if (g.type === 'Polygon' && g.coordinates?.[0]?.length > 0) return g.coordinates[0][0];
  return null;
}
function featureName(props: Record<string, unknown>): string {
  return (props.name as string) || (props.Name as string) || (props.title as string) || (props.label as string) || 'Unnamed';
}
function featureDescription(props: Record<string, unknown>): string {
  return (props.description as string) || (props.desc as string) || (props.notes as string) || (props.note as string) || (props.comment as string) || '';
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MapView({ tripId }: { tripId: string }) {
  const mapContainerRef  = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<any>(null);
  const maplibreRef      = useRef<any>(null);
  const watchRef         = useRef<number | null>(null);
  const userMarkerRef    = useRef<any>(null);
  const stopMarkersRef   = useRef<any[]>([]);
  const importMarkersRef = useRef<Map<string, any[]>>(new Map());
  const popupRef         = useRef<any>(null);
  const layerCacheRef    = useRef<Record<string, any>>({});
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const mapReadyRef      = useRef(false);

  const [selected,       setSelected]       = useState<Selected | null>(null);
  const [dragY,          setDragY]          = useState(0);
  const [dragging,       setDragging]       = useState(false);
  const dragStartRef = useRef<{ y: number; active: boolean }>({ y: 0, active: false });

  const [userPos,        setUserPos]        = useState<{ lat: number; lng: number } | null>(null);
  const [locError,       setLocError]       = useState(false);
  const [locating,       setLocating]       = useState(false);

  // Layers sheet state
  const [layersOpen,     setLayersOpen]     = useState(false);
  const [layersUp,       setLayersUp]       = useState(false);
  const [layersDragY,    setLayersDragY]    = useState(0);
  const [layersDragging, setLayersDragging] = useState(false);
  const layersDragRef = useRef<{ y: number; active: boolean }>({ y: 0, active: false });

  // POI overlay state
  const [activeLayers,  setActiveLayers]  = useState<Set<string>>(new Set());
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const [errorLayers,   setErrorLayers]   = useState<Map<string, string>>(new Map());

  // Import state
  const [importLayers, setImportLayers] = useState<ImportLayer[]>([]);
  const [importing,    setImporting]    = useState(false);
  const [importError,  setImportError]  = useState('');

  // ── Layers sheet open/close ────────────────────────────────────────────────

  const openLayers = useCallback(() => {
    setSelected(null);
    setLayersOpen(true);
    setTimeout(() => setLayersUp(true), 20);
  }, []);

  const closeLayers = useCallback(() => {
    setLayersUp(false);
    setTimeout(() => { setLayersOpen(false); setImportError(''); }, 360);
  }, []);

  // ── Layers sheet drag-to-close ─────────────────────────────────────────────

  const onLayersGrabDown = useCallback((e: React.PointerEvent) => {
    layersDragRef.current = { y: e.clientY, active: true };
    setLayersDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);
  const onLayersGrabMove = useCallback((e: React.PointerEvent) => {
    if (!layersDragRef.current.active) return;
    setLayersDragY(Math.max(0, e.clientY - layersDragRef.current.y));
  }, []);
  const onLayersGrabUp = useCallback(() => {
    if (!layersDragRef.current.active) return;
    layersDragRef.current.active = false;
    setLayersDragging(false);
    setLayersDragY(prev => { if (prev > 110) closeLayers(); return 0; });
  }, [closeLayers]);

  // ── Initialize MapLibre ────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let map: any;
    import('maplibre-gl').then(({ default: maplibregl }) => {
      maplibreRef.current = maplibregl;
      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? 'no-key';
      if (mapContainerRef.current) mapContainerRef.current.setAttribute('dir', 'ltr');
      if (!(maplibregl as any).getRTLTextPluginStatus || (maplibregl as any).getRTLTextPluginStatus() === 'unavailable') {
        (maplibregl as any).setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js', null, true);
      }
      map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${key}`,
        center: [BASE_LNG, BASE_LAT], zoom: 11, attributionControl: false,
      });
      mapRef.current = map;

      map.on('load', () => {
        mapReadyRef.current = true;

        fetch('/stops.geojson').then(r => r.json()).then(geojson => {
          stopMarkersRef.current.forEach(m => m.remove());
          stopMarkersRef.current = [];
          geojson.features.forEach((feature: any) => {
            const props = feature.properties;
            const [lng, lat] = feature.geometry.coordinates;
            const cat = props.category as StopCategory;
            const isBase = cat === 'base';
            const size = isBase ? 40 : 34;
            const el = document.createElement('div');
            el.style.cssText = `width:${size}px;height:${size}px;cursor:pointer;`;
            const inner = document.createElement('div');
            inner.style.cssText = `width:100%;height:100%;border-radius:50%;background:${CATEGORY_COLOR[cat]??'#888'};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:${isBase?20:17}px;user-select:none;transition:transform 0.15s ease;`;
            inner.textContent = CATEGORY_EMOJI[cat] ?? '📍';
            inner.title = props.name;
            el.appendChild(inner);
            el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.15)'; });
            el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              const pos = (window as any).__mapUserPos ?? null;
              const distKm = pos ? haversineKm(pos.lat, pos.lng, lat, lng) : null;
              setSelected({ id: props.id, name: props.name, category: cat, lat, lng,
                description_html: props.description_html, position: props.position,
                images: Array.isArray(props.images) ? props.images : undefined, distanceKm: distKm });
            });
            stopMarkersRef.current.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map));
          });
        });

        fetch(`/api/map-imports?trip_id=${tripId}`).then(r => r.json())
          .then(({ layers }) => {
            if (layers?.length) {
              setImportLayers(layers);
              layers.forEach((layer: ImportLayer) => renderImportLayer(layer, map, maplibregl));
            }
          }).catch(() => {});
      });
    });

    return () => {
      mapReadyRef.current = false;
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      stopMarkersRef.current.forEach(m => m.remove());
      stopMarkersRef.current = [];
      importMarkersRef.current.forEach(markers => markers.forEach(m => m.remove()));
      importMarkersRef.current.clear();
      popupRef.current?.remove();
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { (window as any).__mapUserPos = userPos; }, [userPos]);

  useEffect(() => {
    if (!mapRef.current || !userPos) return;
    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([userPos.lng, userPos.lat]);
      } else {
        const el = document.createElement('div');
        el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2C5878;border:3px solid white;box-shadow:0 0 0 4px rgba(44,88,120,0.25);';
        userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([userPos.lng, userPos.lat]).addTo(mapRef.current);
      }
    });
  }, [userPos]);

  // ── Import layer renderer ──────────────────────────────────────────────────

  const renderImportLayer = useCallback((layer: ImportLayer, map: any, maplibregl: any) => {
    const existing = importMarkersRef.current.get(layer.id) ?? [];
    existing.forEach(m => m.remove());
    const newMarkers: any[] = [];
    layer.features.forEach((feature: any, fi: number) => {
      const coords = getFeaturePoint(feature);
      if (!coords) return;
      const [lng, lat] = coords;
      const props = feature.properties ?? {};
      const name = featureName(props);
      const el = document.createElement('div');
      el.style.cssText = 'width:32px;height:32px;cursor:pointer;';
      const inner = document.createElement('div');
      inner.style.cssText = `width:100%;height:100%;border-radius:50%;background:${layer.color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:15px;user-select:none;transition:transform 0.15s ease;`;
      inner.textContent = layer.emoji;
      inner.title = name;
      el.appendChild(inner);
      el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.2)'; });
      el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const pos = (window as any).__mapUserPos ?? null;
        const distKm = pos ? haversineKm(pos.lat, pos.lng, lat, lng) : null;
        setSelected({ id: `import-${layer.id}-${fi}`, name, lat, lng, distanceKm: distKm,
          description: featureDescription(props), properties: props,
          layerName: layer.name, layerColor: layer.color, layerEmoji: layer.emoji, importLayer: true });
      });
      newMarkers.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map));
    });
    importMarkersRef.current.set(layer.id, newMarkers);
  }, []);

  // ── File import handler ────────────────────────────────────────────────────

  const handleFileImport = useCallback(async (file: File) => {
    setImporting(true); setImportError('');
    try {
      const text = await file.text();
      const geojson = JSON.parse(text);
      if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features))
        throw new Error('File must be a GeoJSON FeatureCollection.');
      const features = geojson.features.filter((f: any) => f.geometry && getFeaturePoint(f) !== null);
      if (features.length === 0) throw new Error('No mappable features found.');
      const layerName = file.name.replace(/\.geojson$/i, '');
      const color = pickColor(importLayers.length);
      const res = await fetch('/api/map-imports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: tripId, name: layerName, color, emoji: '📌', features }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      const newLayer: ImportLayer = data.layer;
      setImportLayers(prev => [...prev.filter(l => l.name !== newLayer.name), newLayer]);
      if (mapRef.current && maplibreRef.current) {
        renderImportLayer(newLayer, mapRef.current, maplibreRef.current);
        const first = getFeaturePoint(features[0]);
        if (first) mapRef.current.flyTo({ center: first, zoom: 12 });
      }
      setImportError('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [tripId, importLayers, renderImportLayer]);

  const handleDeleteLayer = useCallback(async (layer: ImportLayer) => {
    const markers = importMarkersRef.current.get(layer.id) ?? [];
    markers.forEach(m => m.remove());
    importMarkersRef.current.delete(layer.id);
    setImportLayers(prev => prev.filter(l => l.id !== layer.id));
    if (selected?.importLayer && (selected as SelectedImport).layerName === layer.name) setSelected(null);
    await fetch(`/api/map-imports?id=${layer.id}`, { method: 'DELETE' });
  }, [selected]);

  // ── POI overlay layers ─────────────────────────────────────────────────────

  const fetchOverpassPOI = useCallback(async (def: typeof OVERLAY_DEFS[number]) => {
    const map = mapRef.current;
    if (!map) return { type: 'FeatureCollection', features: [] };
    const b = map.getBounds();
    const bbox = `${b.getSouth().toFixed(4)},${b.getWest().toFixed(4)},${b.getNorth().toFixed(4)},${b.getEast().toFixed(4)}`;
    const res = await fetch(`/api/overpass?category=${encodeURIComponent(def.id)}&bbox=${bbox}`);
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? `HTTP ${res.status}`); }
    return res.json();
  }, []);

  const addOverlayLayer = useCallback((def: typeof OVERLAY_DEFS[number], geojson: any) => {
    const map = mapRef.current; const ml = maplibreRef.current;
    if (!map || !ml) return;
    const sourceId = `overlay-${def.id}`, circleId = `overlay-${def.id}-circles`, labelId = `overlay-${def.id}-labels`;
    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(geojson);
      map.setLayoutProperty(circleId, 'visibility', 'visible');
      map.setLayoutProperty(labelId,  'visibility', 'visible');
      return;
    }
    map.addSource(sourceId, { type: 'geojson', data: geojson });
    map.addLayer({ id: circleId, type: 'circle', source: sourceId, paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 9],
      'circle-color': def.color, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-opacity': 0.9,
    }});
    map.addLayer({ id: labelId, type: 'symbol', source: sourceId,
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Open Sans Regular'], 'text-size': 10,
        'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-optional': true, 'text-max-width': 8 },
      paint: { 'text-color': '#1A1A1A', 'text-halo-color': '#fff', 'text-halo-width': 1.2 }, minzoom: 13,
    });
    map.on('click', circleId, (e: any) => {
      e.preventDefault();
      const props = e.features[0].properties;
      const [poiLng, poiLat] = e.features[0].geometry.coordinates;
      const pos = (window as any).__mapUserPos ?? null;
      setSelected({ id: `poi-${props.osm_id || poiLng}-${poiLat}`,
        name: props.name || def.label, lat: poiLat, lng: poiLng,
        distanceKm: pos ? haversineKm(pos.lat, pos.lng, poiLat, poiLng) : null,
        poiDef: def, address: props.address || undefined });
    });
    map.on('mouseenter', circleId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', circleId, () => { map.getCanvas().style.cursor = ''; });
  }, []);

  const removeOverlayLayer = useCallback((id: string) => {
    const map = mapRef.current; if (!map) return;
    if (map.getLayer(`overlay-${id}-circles`)) map.setLayoutProperty(`overlay-${id}-circles`, 'visibility', 'none');
    if (map.getLayer(`overlay-${id}-labels`))  map.setLayoutProperty(`overlay-${id}-labels`,  'visibility', 'none');
    popupRef.current?.remove();
  }, []);

  const toggleLayer = useCallback(async (layerId: string) => {
    const def = OVERLAY_DEFS.find(d => d.id === layerId)!;
    if (activeLayers.has(layerId)) {
      removeOverlayLayer(layerId);
      setActiveLayers(prev => { const s = new Set(prev); s.delete(layerId); return s; });
      return;
    }
    setLoadingLayers(prev => { const s = new Set(prev); s.add(layerId); return s; });
    setErrorLayers(prev => { const m = new Map(prev); m.delete(layerId); return m; });
    try {
      let geojson = layerCacheRef.current[layerId];
      if (!geojson) { geojson = await fetchOverpassPOI(def); layerCacheRef.current[layerId] = geojson; }
      addOverlayLayer(def, geojson);
      setActiveLayers(prev => { const s = new Set(prev); s.add(layerId); return s; });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorLayers(prev => { const m = new Map(prev); m.set(layerId, msg); return m; });
    } finally {
      setLoadingLayers(prev => { const s = new Set(prev); s.delete(layerId); return s; });
    }
  }, [activeLayers, fetchOverpassPOI, addOverlayLayer, removeOverlayLayer]);

  // ── Location ───────────────────────────────────────────────────────────────

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) { setLocError(true); return; }
    setLocating(true); setLocError(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng }); setLocating(false);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 13 });
        if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = navigator.geolocation.watchPosition(
          p => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true });
      },
      () => { setLocating(false); setLocError(true); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // ── Bottom-sheet drag ──────────────────────────────────────────────────────

  const closeSheet = useCallback(() => { setSelected(null); setDragY(0); setDragging(false); }, []);

  const onGrabberPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = { y: e.clientY, active: true };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);
  const onGrabberPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStartRef.current.active) return;
    setDragY(Math.max(0, e.clientY - dragStartRef.current.y));
  }, []);
  const onGrabberPointerUp = useCallback(() => {
    if (!dragStartRef.current.active) return;
    dragStartRef.current.active = false; setDragging(false);
    setDragY(prev => { if (prev > 110) setSelected(null); return 0; });
  }, []);

  // ── Extra props for imported features ─────────────────────────────────────

  function renderImportedProps(props: Record<string, unknown>) {
    const skip = new Set(['name', 'Name', 'title', 'label', 'description', 'desc', 'notes', 'note', 'comment']);
    const entries = Object.entries(props).filter(([k, v]) => !skip.has(k) && v != null && v !== '');
    if (entries.length === 0) return null;
    return (
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {entries.slice(0, 10).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, fontSize: 13, letterSpacing: '-0.08px' }}>
            <span style={{ color: 'var(--label-2)', minWidth: 80, textTransform: 'capitalize', flexShrink: 0 }}>
              {k.replace(/_/g, ' ')}
            </span>
            <span style={{ color: 'var(--label)', wordBreak: 'break-word' }}>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeCount = activeLayers.size + importLayers.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Map */}
      <div ref={mapContainerRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        bottom: 'calc(76px + env(safe-area-inset-bottom))', zIndex: 0,
      }} />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".geojson,application/geo+json,application/json"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileImport(f); }} />

      {/* Control stack — right side */}
      <div className="map-ctl-stack" style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
        {/* Layers button */}
        <button
          className={`map-glass-btn lg${activeCount > 0 ? ' on' : ''}`}
          onClick={openLayers}
          aria-label="Map layers"
          style={{ position: 'relative' }}
        >
          <i className="ti ti-stack-2" />
          {activeCount > 0 && <span className="map-ctl-badge">{activeCount}</span>}
        </button>

        {/* Locate-me button */}
        <button className="map-glass-btn lg" onClick={handleLocate} aria-label="Locate me">
          <i className={`ti ${locating ? 'ti-loader' : 'ti-current-location'}`}
            style={{ color: locError ? 'var(--red)' : undefined,
              animation: locating ? 'spin 0.9s linear infinite' : undefined }} />
        </button>
      </div>

      {/* Location error toast */}
      {locError && (
        <div style={{
          position: 'fixed', top: 'calc(env(safe-area-inset-top) + 80px)',
          left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface)', padding: '10px 16px', borderRadius: 999,
          fontSize: 13, fontWeight: 600, color: 'var(--label)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)', zIndex: 20, whiteSpace: 'nowrap',
        }}>
          Location blocked — enable in browser settings
        </div>
      )}

      {/* ── Layers sheet ── */}
      {layersOpen && (
        <div className="sheet-overlay"
          style={{ position: 'fixed', inset: 0, bottom: 'calc(76px + env(safe-area-inset-bottom))', zIndex: 25 }}
          onClick={closeLayers}>
          <div
            className={`sheet layers-sheet lg${layersUp ? ' up' : ''}`}
            style={{
              transform: layersDragY ? `translateY(${layersDragY}px)` : undefined,
              transition: layersDragging ? 'none' : undefined,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Grabber */}
            <div className="sheet-grab-zone"
              onPointerDown={onLayersGrabDown} onPointerMove={onLayersGrabMove}
              onPointerUp={onLayersGrabUp} onPointerCancel={onLayersGrabUp}>
              <div className="sheet-grabber" />
            </div>

            {/* Header */}
            <div className="layers-head">
              <div>
                <div className="layers-title">Map Layers</div>
                <div className="layers-sub">
                  {activeLayers.size > 0 ? `${activeLayers.size} showing` : 'Show points of interest'}
                </div>
              </div>
              <button className="drawer-close" onClick={closeLayers} aria-label="Close">
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Scrollable area */}
            <div className="layers-scroll">
              {/* POI toggles */}
              <div className="card" style={{ margin: '4px 16px 0' }}>
                {OVERLAY_DEFS.map((def, i) => {
                  const isOn      = activeLayers.has(def.id);
                  const isLoading = loadingLayers.has(def.id);
                  const errMsg    = errorLayers.get(def.id);
                  return (
                    <label key={def.id} className="row has-icon poi-row">
                      <span className="row-icon" style={{ background: def.color }}>
                        {isLoading
                          ? <i className="ti ti-loader-2" style={{ animation: 'spin 0.8s linear infinite', fontSize: 18 }} />
                          : <span style={{ fontSize: 19 }}>{def.emoji}</span>
                        }
                      </span>
                      <span className="row-body">
                        <span className="row-title">{def.label}</span>
                        {errMsg && <span style={{ display: 'block', fontSize: 11, color: 'var(--red)', marginTop: 1 }}>{errMsg}</span>}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        aria-label={def.label}
                        className={`ios-switch${isOn ? ' on' : ''}`}
                        disabled={isLoading}
                        onClick={() => toggleLayer(def.id)}
                      >
                        <span className="knob" />
                      </button>
                    </label>
                  );
                })}
              </div>

              {/* Divider + My Layers section */}
              <div style={{ padding: '18px 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--label-2)' }}>
                  My Layers
                </span>
                {importLayers.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--label-3)' }}>{importLayers.length} imported</span>
                )}
              </div>

              {/* Empty state */}
              {importLayers.length === 0 && (
                <div style={{ padding: '8px 20px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--label-2)', lineHeight: 1.4 }}>
                    Import a .geojson file to plot custom stops on the map.
                  </p>
                </div>
              )}

              {/* Import layer rows */}
              {importLayers.length > 0 && (
                <div className="card" style={{ margin: '0 16px' }}>
                  {importLayers.map((layer, i) => (
                    <div key={layer.id} className={`row has-icon${i > 0 ? '' : ''}`}>
                      <span className="row-icon" style={{ background: layer.color, fontSize: 18 }}>
                        {layer.emoji}
                      </span>
                      <span className="row-body">
                        <span className="row-title" style={{ fontSize: 15 }}>{layer.name}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--label-2)', marginTop: 1 }}>
                          {layer.features.length} {layer.features.length === 1 ? 'place' : 'places'}
                        </span>
                      </span>
                      <button
                        onClick={() => handleDeleteLayer(layer)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--label-3)', display: 'flex', borderRadius: 8 }}
                        aria-label="Remove layer"
                      >
                        <i className="ti ti-trash" style={{ fontSize: 18 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Import button */}
              <div style={{ padding: '14px 16px 0' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="btn btn-filled"
                  style={{ width: '100%', justifyContent: 'center', opacity: importing ? 0.7 : 1 }}
                >
                  <i className={`ti ${importing ? 'ti-loader-2' : 'ti-upload'}`}
                    style={importing ? { animation: 'spin 0.8s linear infinite' } : undefined} />
                  {importing ? 'Importing…' : 'Import .geojson'}
                </button>
                {importError && (
                  <p style={{ marginTop: 6, fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{importError}</p>
                )}
              </div>

              {/* Footer */}
              <div className="layers-foot">
                <i className="ti ti-map-pin" style={{ fontSize: 13 }} />
                Nearby places along your route
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stop / POI bottom sheet ── */}
      {selected && (
        <div className="sheet-overlay"
          style={{ position: 'fixed', inset: 0, bottom: 'calc(76px + env(safe-area-inset-bottom))', zIndex: 30 }}
          onClick={closeSheet}>
          <div className="sheet up" onClick={e => e.stopPropagation()}
            style={{
              transform: dragY ? `translateY(${dragY}px)` : undefined,
              transition: dragging ? 'none' : undefined,
            }}>
            <div className="sheet-grab-zone"
              onPointerDown={onGrabberPointerDown} onPointerMove={onGrabberPointerMove}
              onPointerUp={onGrabberPointerUp} onPointerCancel={onGrabberPointerUp}>
              <div className="sheet-grabber" />
            </div>

            <div className="sheet-scroll">
              {/* Trip stop photos */}
              {!selected.poiDef && !selected.importLayer && selected.images && selected.images.length > 0 && (
                <div className="sheet-gallery">
                  {selected.images.map(src => <img key={src} src={src} alt={selected.name} className="sheet-photo" loading="lazy" />)}
                </div>
              )}

              <div className={`sheet-head${!selected.poiDef && !selected.importLayer ? ' rtl' : ''}`}>
                {/* Imported feature */}
                {selected.importLayer && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: (selected as SelectedImport).layerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                      {(selected as SelectedImport).layerEmoji}
                    </div>
                    <div>
                      <div className="sheet-name" style={{ marginBottom: 2 }}>{selected.name}</div>
                      <div className="sheet-cat" style={{ color: (selected as SelectedImport).layerColor }}>
                        {(selected as SelectedImport).layerName}
                      </div>
                    </div>
                  </div>
                )}

                {/* POI */}
                {selected.poiDef && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: selected.poiDef.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                      {selected.poiDef.emoji}
                    </div>
                    <div>
                      <div className="sheet-name" style={{ marginBottom: 2 }}>{selected.name}</div>
                      <div className="sheet-cat" style={{ color: selected.poiDef.color }}>{selected.poiDef.label}</div>
                    </div>
                  </div>
                )}

                {/* Trip stop */}
                {!selected.poiDef && !selected.importLayer && (
                  <>
                    <div className="sheet-name">{selected.name}</div>
                    <div className="sheet-cat" style={{ color: CATEGORY_COLOR[selected.category] }}>
                      {CATEGORY_LABEL[selected.category]}
                    </div>
                  </>
                )}

                {selected.poiDef && (selected as SelectedPOI).address && (
                  <div className="sheet-dist"><i className="ti ti-map-pin" />{(selected as SelectedPOI).address}</div>
                )}
                {selected.distanceKm !== null && (
                  <div className="sheet-dist"><i className="ti ti-ruler" />{formatDistance(selected.distanceKm)} as the crow flies</div>
                )}
                {!selected.poiDef && !selected.importLayer && (
                  <div className="sheet-desc" dangerouslySetInnerHTML={{ __html: (selected as SelectedStop).description_html! }} />
                )}
                {selected.importLayer && (
                  <>
                    {(selected as SelectedImport).description && (
                      <p className="sheet-desc" style={{ marginTop: 8 }}>{(selected as SelectedImport).description}</p>
                    )}
                    {renderImportedProps((selected as SelectedImport).properties)}
                  </>
                )}
              </div>
            </div>

            <div className="sheet-nav">
              <a href={googleMapsUrl(selected.lat, selected.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-gray">
                <i className="ti ti-map-pin" /> Google Maps
              </a>
              <a href={wazeUrl(selected.lat, selected.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-tinted">
                <i className="ti ti-navigation" /> Waze
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
