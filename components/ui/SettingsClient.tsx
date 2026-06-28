'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SettingsClientProps {
  tripId: string;
  userEmail: string;
}

export default function SettingsClient({ tripId, userEmail }: SettingsClientProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent]   = useState(false);
  const [inviteErr, setInviteErr]     = useState('');
  const [exporting, setExporting]     = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'BF';

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteErr('');
    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), tripId }),
    });
    if (res.ok) {
      setInviteSent(true);
      setInviteEmail('');
    } else {
      const json = await res.json().catch(() => ({}));
      setInviteErr(json.error ?? 'Something went wrong.');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleExport() {
    setExporting(true);
    const res  = await fetch(`/api/export?tripId=${tripId}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `black-forest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <>
      <div className="large-title">
        <h1>Settings</h1>
      </div>

      {/* Account */}
      <div className="group tight">
        <div className="card">
          <div className="row has-icon">
            <span className="nav-avatar-dot" style={{ width: 42, height: 42, fontSize: 16, flexShrink: 0 }}>
              {initials}
            </span>
            <span className="row-body">
              <span className="row-title" style={{ display: 'block', fontWeight: 600 }}>Black Forest crew</span>
              <span className="row-sub" style={{ display: 'block' }}>{userEmail}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Invite */}
      <div className="group">
        <div className="group-header">Invite to trip</div>
        <div className="card" style={{ padding: '14px 16px 16px' }}>
          {inviteSent ? (
            <div className="login-sent">
              Invitation sent! They'll get a magic link to join the trip.
            </div>
          ) : (
            <form onSubmit={handleInvite}>
              <div className="field-box">
                <input
                  type="email"
                  placeholder="partner@example.com"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteErr(''); }}
                  required
                />
              </div>
              {inviteErr && <div className="err-msg">{inviteErr}</div>}
              <button className="btn btn-filled" type="submit" style={{ marginTop: 12 }}>
                <i className="ti ti-send" /> Send magic link
              </button>
            </form>
          )}
        </div>
        <div className="group-footer">
          They'll get a magic link to join the trip — lists and notes sync for everyone.
        </div>
      </div>

      {/* Backup */}
      <div className="group">
        <div className="group-header">Backup</div>
        <div className="card">
          <button className="row has-icon" onClick={handleExport} disabled={exporting}>
            <span className="row-icon bg-blue"><i className="ti ti-download" /></span>
            <span className="row-body">
              <span className="row-title" style={{ display: 'block' }}>
                {exporting ? 'Preparing…' : 'Export trip data'}
              </span>
              <span className="row-sub" style={{ display: 'block' }}>JSON · lists, notes, fuel log</span>
            </span>
            <span className="chevron"><i className="ti ti-chevron-right" /></span>
          </button>
        </div>
        <div className="group-footer">
          Export everything as a single JSON file you can keep or re-import later.
        </div>
      </div>

      {/* Sign out */}
      <div className="group tight" style={{ marginTop: 22 }}>
        <div className="card">
          <button className="row" onClick={handleSignOut}
            style={{ justifyContent: 'center', color: 'var(--red)', fontWeight: 400 }}>
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
