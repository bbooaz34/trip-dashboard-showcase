import { NextResponse } from 'next/server';
import { fetchWeather } from '@/lib/openmeteo';

// Server-side weather proxy — caches for 30 minutes via Next.js fetch cache
export async function GET() {
  try {
    const data = await fetchWeather();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
  }
}
