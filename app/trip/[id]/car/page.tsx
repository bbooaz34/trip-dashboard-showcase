import { createClient } from '@/lib/supabase/server';
import CarClient from '@/components/ui/CarClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CarPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [carRes, refuelsRes] = await Promise.all([
    supabase.from('car_state').select('*').eq('trip_id', id).single(),
    supabase.from('refuels').select('*').eq('trip_id', id).order('refueled_at', { ascending: true }),
  ]);

  return (
    <CarClient
      tripId={id}
      initialCar={carRes.data ?? null}
      initialRefuels={refuelsRes.data ?? []}
    />
  );
}
