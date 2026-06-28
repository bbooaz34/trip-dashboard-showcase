// Flights — each member manages their own flights + travel dates.
import { createClient } from '@/lib/supabase/server';
import FlightsClient from '@/components/ui/FlightsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FlightsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [tripRes, datesRes, flightsRes] = await Promise.all([
    supabase.from('trips').select('start_date,end_date').eq('id', id).single(),
    supabase.from('member_trip_dates').select('*').eq('trip_id', id).maybeSingle(),
    supabase.from('flights').select('*').eq('trip_id', id).order('position'),
  ]);

  return (
    <FlightsClient
      tripId={id}
      userId={user?.id ?? ''}
      tripStart={tripRes.data?.start_date ?? '2026-07-06'}
      tripEnd={tripRes.data?.end_date ?? '2026-07-13'}
      initialDates={datesRes.data ?? null}
      initialFlights={flightsRes.data ?? []}
    />
  );
}
