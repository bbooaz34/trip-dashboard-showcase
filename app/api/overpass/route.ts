import { NextRequest, NextResponse } from 'next/server';

/**
 * POI proxy — uses Nominatim (OSM structured search) to avoid Overpass rate limits.
 * Results cached on the CDN edge for 6 hours.
 *
 * GET /api/overpass?category=gas&bbox=south,west,north,east
 */

// Nominatim structured search only supports amenity=, not shop=.
// Use q= (free-text) for shop-based categories.
const NOMINATIM_TAGS: Record<string, Record<string, string>> = {
  gas:         { amenity: 'fuel' },
  supermarket: { q: 'supermarket' },   // shop= not supported by Nominatim
  pharmacy:    { amenity: 'pharmacy' },
  restaurant:  { amenity: 'restaurant' },
  cafe:        { amenity: 'cafe' },
  parking:     { amenity: 'parking' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category');
  const bbox = searchParams.get('bbox'); // "south,west,north,east"

  if (!category || !bbox) {
    return NextResponse.json({ error: 'Missing category or bbox' }, { status: 400 });
  }

  const tags = NOMINATIM_TAGS[category];
  if (!tags) {
    return NextResponse.json({ error: `Unknown category: ${category}` }, { status: 400 });
  }

  const [south, west, north, east] = bbox.split(',').map(Number);
  if ([south, west, north, east].some(isNaN)) {
    return NextResponse.json({ error: 'Invalid bbox' }, { status: 400 });
  }

  // Nominatim viewbox = left,top,right,bottom = west,north,east,south
  const params = new URLSearchParams({
    format: 'json',
    viewbox: `${west},${north},${east},${south}`,
    bounded: '1',
    limit: '100',
    ...tags,
  });

  let res: Response;
  try {
    res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'BlackForestTripApp/1.0',
        'Accept': 'application/json',
      },
      next: { revalidate: 21600 }, // CDN cache 6 hours
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: `Nominatim ${res.status}` }, { status: 502 });
  }

  const items: any[] = await res.json();

  // Convert to GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    features: items
      .filter(item => item.lat && item.lon)
      .map(item => {
        const parts = (item.display_name ?? '').split(',');
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(item.lon), parseFloat(item.lat)] },
          properties: {
            osm_id: String(item.osm_id ?? ''),
            name: parts[0]?.trim() ?? '',
            address: parts.slice(1, 3).map((s: string) => s.trim()).filter(Boolean).join(', '),
            layerId: category,
          },
        };
      }),
  };

  return NextResponse.json(geojson, {
    headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' },
  });
}
