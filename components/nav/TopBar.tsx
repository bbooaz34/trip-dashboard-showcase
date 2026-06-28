'use client';

import { useRouter } from 'next/navigation';

interface TopBarProps {
  email?: string;
  tripId?: string;
}

export default function TopBar({ email, tripId }: TopBarProps) {
  const router = useRouter();
  const initials = email
    ? email.slice(0, 2).toUpperCase()
    : 'BF';

  return (
    <div className="topbar">
      <div className="topbar-left" />
      <div className="topbar-center" />
      <button
        className="nav-pill lg"
        onClick={() => tripId && router.push(`/trip/${tripId}/settings`)}
        aria-label="Settings"
        style={{ width: 42, height: 42 }}
      >
        <span className="nav-avatar-dot">{initials}</span>
      </button>
    </div>
  );
}
