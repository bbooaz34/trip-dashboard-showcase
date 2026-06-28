import type { StopCategory } from './types';

// Category → map marker color
export const CATEGORY_COLOR: Record<StopCategory, string> = {
  base:      '#FF4444',
  waterfall: '#2C5878',
  lake:      '#4FA8C7',
  mountain:  '#4A6B3A',
  city:      '#7C4D99',
  kids:      '#D4A017',
  museum:    '#777777',
  food:      '#E07B20',
  church:    '#999999',
  parking:   '#555555',
  nature:    '#3A9A3A',
};

// Category → emoji for map markers
export const CATEGORY_EMOJI: Record<StopCategory, string> = {
  base:      '🏕️',
  waterfall: '💧',
  lake:      '🏞️',
  mountain:  '⛰️',
  city:      '🏘️',
  kids:      '🎡',
  museum:    '🏛️',
  food:      '🍽️',
  church:    '⛪',
  parking:   '🅿️',
  nature:    '🌲',
};

// Category → Tabler icon name
export const CATEGORY_ICON: Record<StopCategory, string> = {
  base:      'ti-home',
  waterfall: 'ti-ripple',
  lake:      'ti-wave-saw-tool',
  mountain:  'ti-mountain',
  city:      'ti-building',
  kids:      'ti-mood-kid',
  museum:    'ti-building-museum',
  food:      'ti-tools-kitchen-2',
  church:    'ti-building-church',
  parking:   'ti-parking',
  nature:    'ti-trees',
};

export const CATEGORY_LABEL: Record<StopCategory, string> = {
  base:      'Base camp',
  waterfall: 'Waterfall',
  lake:      'Lake',
  mountain:  'Mountain',
  city:      'City',
  kids:      'Kids',
  museum:    'Museum',
  food:      'Food',
  church:    'Church',
  parking:   'Parking',
  nature:    'Nature',
};

/** Haversine distance in km between two lat/lng points */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}
