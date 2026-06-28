// Browser-side Supabase client (used in Client Components)
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

// Explicit return type is load-bearing — see lib/supabase/server.ts for the full
// explanation. ssr's factory is called without the `<Database>` generic on purpose.
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use the implicit flow for email links. PKCE stores a verifier cookie in
        // the browser that started sign-in, so the link breaks when it's opened in a
        // different browser, on another device, or inside an email app's in-app
        // webview — the exact case that left users stuck on the login page. Implicit
        // returns the session in the URL fragment, which needs no stored verifier and
        // is consumed client-side by /auth/finish.
        flowType: 'implicit',
      },
    },
  );
}
