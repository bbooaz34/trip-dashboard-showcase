// Per-user GeoJSON import layers — GET (load), POST (save), DELETE (remove)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface ImportLayer {
  id: string;
  name: string;
  color: string;
  emoji: string;
  features: GeoJsonFeature[];
  created_at: string;
}

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: number[] | number[][] };
  properties: Record<string, unknown>;
}

// GET /api/map-imports?trip_id=xxx
export async function GET(req: NextRequest) {
  const trip_id = req.nextUrl.searchParams.get('trip_id');
  if (!trip_id) return NextResponse.json({ error: 'trip_id required' }, { status: 400 });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_map_imports')
    .select('id, name, color, emoji, features, created_at')
    .eq('trip_id', trip_id)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ layers: data ?? [] });
}

// POST /api/map-imports  body: { trip_id, name, color, emoji, features }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { trip_id, name, color, emoji, features } = body;
  if (!trip_id || !name || !Array.isArray(features)) {
    return NextResponse.json({ error: 'trip_id, name, and features required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_map_imports')
    .upsert({
      trip_id,
      user_id: user.id,
      name,
      color: color ?? '#7C3AED',
      emoji: emoji ?? '📌',
      features,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'trip_id,user_id,name' })
    .select('id, name, color, emoji, features, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ layer: data });
}

// DELETE /api/map-imports?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('user_map_imports').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
