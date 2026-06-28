import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('tripId');
  if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify membership
  const { data: membership } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .single();

  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  // Fetch all data
  const [tripRes, grocRes, shopRes, notesRes, carRes, refuelsRes] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).single(),
    supabase.from('groceries').select('*').eq('trip_id', tripId),
    supabase.from('frankfurt_items').select('*').eq('trip_id', tripId),
    supabase.from('notes').select('*').eq('trip_id', tripId).single(),
    supabase.from('car_state').select('*').eq('trip_id', tripId).single(),
    supabase.from('refuels').select('*').eq('trip_id', tripId).order('refueled_at'),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    trip: tripRes.data,
    groceries: grocRes.data ?? [],
    frankfurt_items: shopRes.data ?? [],
    notes: notesRes.data,
    car_state: carRes.data,
    refuels: refuelsRes.data ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="black-forest-backup.json"`,
    },
  });
}
