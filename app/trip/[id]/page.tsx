// Home — bento grid overview
import { createClient } from '@/lib/supabase/server';
import HomeBento from '@/components/ui/HomeBento';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [grocRes, shopRes, notesRes, carRes, tripRes, datesRes, flightsRes] = await Promise.all([
    supabase.from('groceries').select('done').eq('trip_id', id),
    supabase.from('frankfurt_items').select('done').eq('trip_id', id),
    supabase.from('notes').select('body').eq('trip_id', id).single(),
    supabase.from('car_state').select('fuel_liters,tank_capacity_l').eq('trip_id', id).single(),
    supabase.from('trips').select('start_date,end_date').eq('id', id).single(),
    supabase.from('member_trip_dates').select('start_date,end_date').eq('trip_id', id).maybeSingle(),
    supabase.from('flights').select('*').eq('trip_id', id).order('position'),
  ]);

  const grocOpen  = (grocRes.data  ?? []).filter(g => !g.done).length;
  const shopOpen  = (shopRes.data  ?? []).filter(s => !s.done).length;
  const noteBody  = notesRes.data?.body ?? '';
  const fuelPct   = carRes.data
    ? Math.round((carRes.data.fuel_liters / carRes.data.tank_capacity_l) * 100)
    : 75;

  // Per-user dates fall back to the shared trip defaults.
  const startDate = datesRes.data?.start_date ?? tripRes.data?.start_date ?? '2026-07-06';
  const endDate   = datesRes.data?.end_date   ?? tripRes.data?.end_date   ?? '2026-07-13';

  // The user's own outbound flight powers the home widget; null → default EL AL.
  const flights = flightsRes.data ?? [];
  const own = flights.find(f => f.direction === 'outbound') ?? flights[0] ?? null;
  const nextFlight = own
    ? {
        airline: own.airline, flight_no: own.flight_no,
        from_iata: own.from_iata, to_iata: own.to_iata,
        dep_time: own.dep_time, arr_time: own.arr_time,
        duration: own.duration, flight_date: own.flight_date,
      }
    : null;

  return (
    <HomeBento
      tripId={id}
      grocOpen={grocOpen}
      shopOpen={shopOpen}
      notePreview={noteBody}
      fuelPct={fuelPct}
      startDate={startDate}
      endDate={endDate}
      nextFlight={nextFlight}
    />
  );
}
