// Root page: redirect authenticated users to their trip, others to /login
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage({
  searchParams,
}: {
  searchParams: { code?: string; token_hash?: string; type?: string; next?: string };
}) {
  // Resilience: if a magic-link param ever lands on `/` (e.g. Supabase falls back to
  // the Site URL root because the callback URL isn't allow-listed), forward it to the
  // real callback handler instead of dead-ending here.
  const next = searchParams.next ?? '/';
  if (searchParams.token_hash && searchParams.type) {
    redirect(
      `/auth/callback?token_hash=${searchParams.token_hash}&type=${searchParams.type}&next=${encodeURIComponent(next)}`,
    );
  }
  if (searchParams.code) {
    redirect(`/auth/callback?code=${searchParams.code}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Find the user's first trip
  const { data: membership } = await supabase
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (membership) {
    redirect(`/trip/${membership.trip_id}`);
  }

  // No trip yet — send to login for now (owner must create trip first via seed.sql)
  redirect('/login?error=no-trip');
}
