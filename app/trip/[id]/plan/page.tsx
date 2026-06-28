import { createClient } from '@/lib/supabase/server';
import PlanClient from '@/components/ui/PlanClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [tripRes, datesRes, itemsRes, stopsRes, stopsCountRes] = await Promise.all([
    supabase.from('trips').select('start_date,end_date,base_camp_lat,base_camp_lng').eq('id', id).single(),
    supabase.from('member_trip_dates').select('start_date,end_date').eq('trip_id', id).maybeSingle(),
    supabase.from('plan_items').select('*').eq('trip_id', id).order('position'),
    supabase.from('stops').select('id,name,category,lat,lng').eq('trip_id', id).neq('category', 'base').order('name'),
    supabase.from('stops').select('id', { count: 'exact', head: true }).eq('trip_id', id),
  ]);

  const startDate   = datesRes.data?.start_date ?? tripRes.data?.start_date ?? '2026-07-06';
  const endDate     = datesRes.data?.end_date   ?? tripRes.data?.end_date   ?? '2026-07-13';
  const stopsCount  = stopsCountRes.count ?? 0;
  const baseCampLat = Number(tripRes.data?.base_camp_lat ?? 47.8900);
  const baseCampLng = Number(tripRes.data?.base_camp_lng ?? 8.0550);

  return (
    <PlanClient
      tripId={id}
      initialItems={itemsRes.data ?? []}
      startDate={startDate}
      endDate={endDate}
      stopsCount={stopsCount}
      stops={stopsRes.data ?? []}
      baseCampLat={baseCampLat}
      baseCampLng={baseCampLng}
    />
  );
}
