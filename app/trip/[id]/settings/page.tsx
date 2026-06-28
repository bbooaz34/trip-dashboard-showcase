import { createClient } from '@/lib/supabase/server';
import SettingsClient from '@/components/ui/SettingsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <SettingsClient tripId={id} userEmail={user?.email ?? ''} />;
}
