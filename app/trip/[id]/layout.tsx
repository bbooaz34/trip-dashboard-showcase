import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TopBar from '@/components/nav/TopBar';
import BottomTabBar from '@/components/nav/BottomTabBar';

interface TripLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TripLayout({ children, params }: TripLayoutProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', id)
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect('/login?error=no-access');

  return (
    <div className="app">
      <TopBar email={user.email} tripId={id} />
      <main className="panels">
        {children}
      </main>
      <BottomTabBar tripId={id} />
    </div>
  );
}
