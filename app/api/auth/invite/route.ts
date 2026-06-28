import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Resolve the app's public origin for building the invite link.
// Priority: explicit override (NEXT_PUBLIC_SITE_URL) → the browser's Origin header
// → the proxy's forwarded host/proto → the Host header. This keeps invite links
// pointed at whatever environment actually served the request (preview, prod, or
// local) instead of a hard-coded localhost fallback.
function resolveOrigin(request: Request): string {
  const override = process.env.NEXT_PUBLIC_SITE_URL;
  if (override) return override.replace(/\/$/, '');

  const origin = request.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');

  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    return `${proto}://${host}`;
  }

  return 'http://localhost:3000';
}

export async function POST(request: Request) {
  const { email, tripId } = await request.json();

  if (!email || !tripId) {
    return NextResponse.json({ error: 'email and tripId required' }, { status: 400 });
  }

  // Verify requester is a member of the trip
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not a trip member' }, { status: 403 });
  }

  // Use service role to send magic link (bypasses RLS)
  const admin = createServiceClient();
  const redirectTo = `${resolveOrigin(request)}/auth/callback?next=${encodeURIComponent(`/trip/${tripId}`)}`;

  const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { trip_id: tripId },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // inviteUserByEmail returns the user object directly — use it instead of listUsers()
  const userId = inviteData?.user?.id;
  if (userId) {
    await admin.from('trip_members').upsert({
      trip_id: tripId,
      user_id: userId,
      role: 'member',
    });
  }

  return NextResponse.json({ ok: true });
}
// Mon Jun  1 22:03:03 IDT 2026
