import { createClient } from '@/lib/supabase/server';
import NotesClient from '@/components/ui/NotesClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NotesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('notes')
    .select('body')
    .eq('trip_id', id)
    .single();

  return <NotesClient tripId={id} initialBody={data?.body ?? ''} />;
}
