'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Completes sign-in for links that deliver the session in the URL fragment
// (implicit flow — e.g. admin-generated invite links). The fragment is only
// visible to the browser, so this work has to happen client-side. Once the
// session is set, the @supabase/ssr browser client writes the auth cookies that
// the middleware and server components read, then we do a full navigation so
// those cookies take effect.
export default function AuthFinishPage() {
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();

    function safeNext(): string {
      const raw = new URLSearchParams(window.location.search).get('next') ?? '/';
      // Only allow same-site relative paths to avoid open-redirects.
      return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
    }

    async function run() {
      const next = safeNext();
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      // Supabase reports failures in the fragment too.
      const hashError = hash.get('error_description') || hash.get('error');
      if (hashError) {
        window.location.replace(`/login?error=${encodeURIComponent(hashError)}`);
        return;
      }

      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');

      if (access_token && refresh_token) {
        const { error: err } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!err) {
          window.location.replace(next);
          return;
        }
      }

      // The browser client may have already consumed the fragment on init.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.replace(next);
        return;
      }

      setError('We couldn’t complete sign-in from that link. Please request a new one.');
    }

    run();
  }, []);

  return (
    <div className="login-wrap">
      <div className="login-icon">🌲</div>
      <div className="login-title">Black Forest</div>
      {error ? (
        <>
          <div className="err-msg" style={{ marginTop: 24 }}>{error}</div>
          <a className="btn btn-filled" href="/login" style={{ marginTop: 16, maxWidth: 340 }}>
            Back to sign in
          </a>
        </>
      ) : (
        <div className="login-sub" style={{ marginTop: 24 }}>Signing you in…</div>
      )}
    </div>
  );
}
