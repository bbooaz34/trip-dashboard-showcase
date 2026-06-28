import { createClient } from '@/lib/supabase/server';
import ListClient from '@/components/ui/ListClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroceriesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('groceries')
    .select('*')
    .eq('trip_id', id)
    .order('position', { ascending: true });

  return (
    <ListClient
      tripId={id}
      table="groceries"
      initialItems={data ?? []}
      title="Groceries"
      subtitle="shared with the crew"
      placeholder="Milk, bread, diapers…"
      showMarket
    />
  );
}
