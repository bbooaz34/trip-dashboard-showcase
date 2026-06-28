// Stale-while-revalidate localStorage cache layer.
// Mirrors the v3.1 key shape so old data is still readable on first load.

const KEYS = {
  notes:   'bf_notes_v3',
  groc:    'bf_groc_v3',
  shop:    'bf_shop_v3',
  car:     'bf_car_v3',
  weather: 'bf_weather_v4',
  trip:    'bf_trip_v4',
} as const;

type CacheKey = keyof typeof KEYS;

function isServer() {
  return typeof window === 'undefined';
}

export function cacheGet<T>(key: CacheKey, fallback: T): T {
  if (isServer()) return fallback;
  try {
    const raw = localStorage.getItem(KEYS[key]);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function cacheSet<T>(key: CacheKey, value: T): void {
  if (isServer()) return;
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    // storage full — ignore
  }
}

export { KEYS };
