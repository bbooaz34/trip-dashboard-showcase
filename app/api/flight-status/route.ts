// Live flight status via Israel Airports Authority (data.gov.il)
// Same data source as the @skills-il/ben-gurion-flights-mcp package.

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://data.gov.il/api/3/action/datastore_search';
const RESOURCE_ID = 'e83f763b-b7d7-479e-b172-ae981ddc6de5';

export interface FlightStatus {
  flight_no: string;
  direction: 'D' | 'A';  // D = departure, A = arrival
  airline_name: string;
  city: string;
  iata: string;
  scheduled: string | null;   // ISO
  estimated: string | null;   // ISO
  terminal: string | null;
  status_en: string | null;
  status_he: string | null;
  checkin_desk: string | null;
  checkin_zone: string | null;
}

function parseFlightNo(raw: string): { airline: string; number: string } | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
  const match = cleaned.match(/^([A-Z]{2})(\d+)$/);
  if (!match) return null;
  return { airline: match[1], number: match[2] };
}

export async function GET(req: NextRequest) {
  const flight_no = req.nextUrl.searchParams.get('flight_no');
  if (!flight_no) {
    return NextResponse.json({ error: 'flight_no required' }, { status: 400 });
  }

  const parsed = parseFlightNo(flight_no);
  if (!parsed) {
    return NextResponse.json({ error: 'Could not parse flight number' }, { status: 400 });
  }

  try {
    const url = new URL(BASE_URL);
    url.searchParams.set('resource_id', RESOURCE_ID);
    url.searchParams.set('limit', '10');
    url.searchParams.set('filters', JSON.stringify({ CHOPER: parsed.airline, CHFLTN: parsed.number }));

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 60 }, // cache 60s
    });

    if (!res.ok) throw new Error(`data.gov.il ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('data.gov.il returned success:false');

    const records = data.result.records as Record<string, string>[];
    if (records.length === 0) {
      return NextResponse.json({ flights: [] });
    }

    const flights: FlightStatus[] = records.map((r) => ({
      flight_no: `${r.CHOPER}${r.CHFLTN}`,
      direction: r.CHAORD as 'D' | 'A',
      airline_name: r.CHOPERD ?? '',
      city: r.CHLOC1D || r.CHLOC1T || '',
      iata: r.CHLOC1 ?? '',
      scheduled: r.CHSTOL ?? null,
      estimated: r.CHPTOL ?? null,
      terminal: r.CHTERM ?? null,
      status_en: r.CHRMINE ?? null,
      status_he: r.CHRMINH ?? null,
      checkin_desk: r.CHCINT ?? null,
      checkin_zone: r.CHCKZN ?? null,
    }));

    return NextResponse.json({ flights }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
