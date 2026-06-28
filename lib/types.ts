// App-level types (not DB schema). DB types live in lib/supabase/types.ts.

export type StopCategory =
  | 'base'
  | 'waterfall'
  | 'lake'
  | 'mountain'
  | 'city'
  | 'kids'
  | 'museum'
  | 'food'
  | 'church'
  | 'parking'
  | 'nature';

// Convenience row aliases derived from the generated DB schema.
// Kept here (not in lib/supabase/types.ts) so schema regens don't wipe them.
import type { Database } from '@/lib/supabase/types';

export type CarState = Database['public']['Tables']['car_state']['Row'];
export type Refuel = Database['public']['Tables']['refuels']['Row'];
export type Flight = Database['public']['Tables']['flights']['Row'];
export type MemberTripDates = Database['public']['Tables']['member_trip_dates']['Row'];
