import { createClient } from '@/lib/supabase/server';
import ListClient from '@/components/ui/ListClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FrankfurtPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('frankfurt_items')
    .select('*')
    .eq('trip_id', id)
    .order('position', { ascending: true });

  return (
    <ListClient
      tripId={id}
      table="frankfurt_items"
      initialItems={data ?? []}
      title="Frankfurt"
      subtitle="travel-day shopping"
      placeholder="What to buy in the city…"
      showMarket={false}
      footer="Frankfurt is ~4 h from base camp — save this for the travel day. Best shopping is around Zeil, MyZeil and Goethestraße, all walkable from the Hauptwache."
    />
  );
}
