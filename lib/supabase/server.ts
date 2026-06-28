// Server-side Supabase client (used in Server Components, API routes)
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/types';

// ROOT CAUSE / FIX (read before touching the `<Database>` generics below):
// @supabase/ssr@0.5.2 instantiates supabase-js's `SupabaseClient<Database, SchemaName,
// Schema>` with the OLD 3-arg arity. supabase-js@2.106 added a `SchemaNameOrClientOptions`
// type param, so ssr's schema object lands in the `SchemaName` (string) slot and `Schema`
// collapses to `never` — that's why every `.from(...).select(...)` row was `never`.
// Fix without a version bump: call the ssr factory WITHOUT the `<Database>` generic so its
// malformed instantiation defaults to `any` (loose) instead of `never` (broken), then
// re-bind precise types through the annotated `SupabaseClient<Database>` return. No casts.
// Once @supabase/ssr is upgraded to match supabase-js, the `<Database>` generic can return.

export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never),
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}

/** Service-role client — bypasses RLS. Server-only, never expose. */
export function createServiceClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
