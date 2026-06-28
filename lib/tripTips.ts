// Daily trip tip — recommends one attraction based on the current weather.
import type { StopCategory } from './types';

export interface TipStop {
  id: string;
  name: string;
  category: StopCategory;
  lat: number;
  lng: number;
}

export interface TripTip {
  /** Short condition headline, e.g. "Rainy day" */
  headline: string;
  /** One-line reason for the pick */
  blurb: string;
  /** Tabler icon class for the tip card */
  icon: string;
  /** The recommended stop */
  stop: TipStop;
}

interface Rule {
  match: (w: { code: number; temp: number; rainProb: number }) => boolean;
  cats: StopCategory[];
  headline: string;
  blurb: string;
  icon: string;
}

// Ordered by priority — first matching rule wins.
const RULES: Rule[] = [
  {
    // Drizzle → thunderstorm, or a high chance of rain: stay indoors
    match: ({ code, rainProb }) => (code >= 51 && code <= 99) || rainProb >= 60,
    cats: ['museum', 'kids', 'food'],
    headline: 'Rainy day',
    blurb: 'Stay dry — a museum or an indoor park is the smart call today.',
    icon: 'ti-cloud-rain',
  },
  {
    // Fog / low cloud: skip the summits
    match: ({ code }) => code >= 45 && code <= 48,
    cats: ['city', 'museum', 'food'],
    headline: 'Low visibility',
    blurb: 'Summits are socked in — wander a town or duck into a museum.',
    icon: 'ti-cloud-fog',
  },
  {
    // Clear & hot: cool off in the water
    match: ({ code, temp }) => code <= 1 && temp >= 24,
    cats: ['lake', 'kids', 'waterfall'],
    headline: 'Hot and sunny',
    blurb: 'Cool off — head for the lake or a water park.',
    icon: 'ti-sun',
  },
  {
    // Clear / mostly clear: best light for waterfalls & peaks
    match: ({ code }) => code <= 1,
    cats: ['waterfall', 'mountain', 'lake'],
    headline: 'Clear skies',
    blurb: 'Perfect light for the waterfalls and mountain viewpoints.',
    icon: 'ti-sun-high',
  },
  {
    // Partly cloudy: easy day out
    match: ({ code }) => code >= 2 && code <= 3,
    cats: ['city', 'nature', 'waterfall'],
    headline: 'Mild and cloudy',
    blurb: 'An easy day for a town stroll or a gentle nature walk.',
    icon: 'ti-cloud',
  },
  {
    // Cold fallback
    match: ({ temp }) => temp < 8,
    cats: ['food', 'museum', 'church'],
    headline: 'Chilly out',
    blurb: 'Warm up with a cozy hut lunch or an indoor stop.',
    icon: 'ti-temperature-snow',
  },
];

const DEFAULT_RULE: Omit<Rule, 'match'> = {
  cats: ['waterfall', 'lake', 'city'],
  headline: "Today's pick",
  blurb: 'A great spot for the conditions out there right now.',
  icon: 'ti-map-pin',
};

/** Day-of-year, so the pick rotates once per calendar day. */
function dayOfYear(d = new Date()): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

/**
 * Pick a recommended attraction for the given weather.
 * Returns null only if no usable stops were provided.
 */
export function recommendAttraction(
  weather: { code: number; temp: number; rainProb: number },
  stops: TipStop[],
  today = new Date(),
): TripTip | null {
  const usable = stops.filter(
    s => s.category !== 'base' && s.category !== 'parking',
  );
  if (usable.length === 0) return null;

  const rule = RULES.find(r => r.match(weather)) ?? null;
  const cats = rule?.cats ?? DEFAULT_RULE.cats;

  // Candidates whose category is in the rule, ordered by category priority.
  let candidates = usable
    .filter(s => cats.includes(s.category))
    .sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category));

  // Fall back to any usable stop if nothing matched the preferred categories.
  if (candidates.length === 0) candidates = usable;

  const stop = candidates[dayOfYear(today) % candidates.length];

  return {
    headline: rule?.headline ?? DEFAULT_RULE.headline,
    blurb: rule?.blurb ?? DEFAULT_RULE.blurb,
    icon: rule?.icon ?? DEFAULT_RULE.icon,
    stop,
  };
}
