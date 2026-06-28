import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Handle the Supabase auth callback.
//
// A sign-in link can come back in three shapes:
//   1. token_hash + type  → verifyOtp. Works cross-device (the link can be opened
//      on a different browser/phone than the one that requested it).
//   2. code               → exchangeCodeForSession (PKCE). Same-browser magic links.
//   3. #access_token=… (URL fragment) → implicit flow. Used by admin-generated
//      invite links, where there is no PKCE verifier in the recipient's browser.
//      The fragment is NOT sent to the server, so we forward to a client page that
//      can read it. Browsers preserve the fragment across this redirect because the
//      Location we send has no fragment of its own.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  const supabase = await createClient();

  // Preferred: cross-device verification via hashed token.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth-failed`);
  }

  // Same-browser PKCE code exchange (the verifier lives in a cookie this route can read).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth-failed`);
  }

  // No server-readable auth params. The tokens are likely in the URL fragment
  // (implicit flow / invite links). Hand off to the client page, which can read it.
  return NextResponse.redirect(`${origin}/auth/finish?next=${encodeURIComponent(next)}`);
}
