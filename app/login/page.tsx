'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { VERSION_LABEL } from '@/lib/version';

type Method = 'link' | 'code';
type Step = 'email' | 'sent' | 'code';

export default function LoginPage() {
  const [method, setMethod]   = useState<Method>('link');
  const [step, setStep]       = useState<Step>('email');
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(() => {
    if (typeof window === 'undefined') return '';
    const p = new URLSearchParams(window.location.search);
    if (p.get('error') === 'no-trip' || p.get('error') === 'no-access') return 'Your account isn’t linked to this trip yet. Ask the trip organizer to send you an invite link.';
    if (p.get('error') === 'auth-failed') return 'The sign-in link has expired or already been used. Request a new one below.';
    return p.get('error') ?? '';
  });
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Send the sign-in email. The same email contains both a magic link and a
  // 6-digit code (see the Supabase "Magic Link" template), so the user can use
  // whichever they chose here.
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const addr = email.trim();
    if (!addr || loading || cooldown > 0) return;
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.signInWithOtp({
      email: addr,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStep(method === 'code' ? 'code' : 'sent');
    setCooldown(60);
    if (method === 'code') setTimeout(() => otpRef.current?.focus(), 50);
  }

  // Verify the 6-digit code and complete sign-in.
  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault();
    const token = otp.trim();
    if (token.length < 6 || loading) return;
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });

    setLoading(false);
    if (err) {
      setError('That code is incorrect or has expired. Check the email or request a new code.');
      setOtp('');
      return;
    }
    // Session cookies are now set by the browser client; full navigation so the
    // middleware/server components pick them up and route to the trip.
    window.location.replace('/');
  }

  function reset() {
    setStep('email');
    setOtp('');
    setError('');
  }

  return (
    <div className="login-wrap">
      <div className="login-icon">🌲</div>
      <div className="login-title">Black Forest</div>
      <div className="login-sub">Family trip · July 2026</div>

      {step === 'email' && (
        <form onSubmit={send} style={{ width: '100%', maxWidth: 340, marginTop: 30 }}>
          {/* Method picker */}
          <div className="seg" role="tablist">
            <button type="button" role="tab" aria-selected={method === 'link'}
              className={`seg-opt${method === 'link' ? ' seg-on' : ''}`}
              onClick={() => setMethod('link')}>
              <i className="ti ti-link" /> Magic link
            </button>
            <button type="button" role="tab" aria-selected={method === 'code'}
              className={`seg-opt${method === 'code' ? ' seg-on' : ''}`}
              onClick={() => setMethod('code')}>
              <i className="ti ti-password" /> Code
            </button>
          </div>

          <div className="field-box" style={{ marginTop: 16 }}>
            <i className="ti ti-send" style={{ fontSize: 18, color: 'var(--label-3)' }} />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
            />
          </div>
          {error && <div className="err-msg">{error}</div>}
          <button className="btn btn-filled" type="submit" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Sending…' : method === 'code' ? 'Email me a code' : 'Send sign-in link'}
          </button>
        </form>
      )}

      {step === 'sent' && (
        <div style={{ width: '100%', maxWidth: 340, marginTop: 30 }}>
          <div className="login-instr">
            We sent a sign-in link to <strong>{email}</strong>.<br />
            Open the email and tap the link to sign in. You can close this tab once you do.
          </div>
          {error && <div className="err-msg" style={{ marginTop: 16 }}>{error}</div>}
          <div className="login-secondary" style={{ marginTop: 24 }}>
            <button type="button" className="btn-link" style={{ color: 'var(--label-2)' }} onClick={reset}>
              Use a different email
            </button>
            <button type="button" className="btn-link" disabled={cooldown > 0} onClick={() => send()}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
            </button>
          </div>
        </div>
      )}

      {step === 'code' && (
        <form onSubmit={verifyCode} style={{ width: '100%', maxWidth: 340, marginTop: 30 }}>
          <div className="login-instr">
            Enter the 6-digit code we sent to <strong>{email}</strong>.
          </div>
          <div className="field-box" style={{ marginTop: 16, justifyContent: 'center' }}>
            <input
              ref={otpRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}
            />
          </div>
          {error && <div className="err-msg">{error}</div>}
          <button className="btn btn-filled" type="submit" disabled={loading || otp.length < 6} style={{ marginTop: 16 }}>
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <div className="login-secondary" style={{ marginTop: 24 }}>
            <button type="button" className="btn-link" style={{ color: 'var(--label-2)' }} onClick={reset}>
              Use a different email
            </button>
            <button type="button" className="btn-link" disabled={cooldown > 0} onClick={() => send()}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      <div className="login-footer">{VERSION_LABEL}</div>
    </div>
  );
}
