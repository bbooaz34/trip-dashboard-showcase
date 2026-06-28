'use client';

import { useEffect, useState, useCallback } from 'react';

interface FlightStatus {
  status_en: string | null;
  estimated: string | null;
  scheduled: string | null;
  terminal: string | null;
  checkin_desk: string | null;
  checkin_zone: string | null;
  direction: 'D' | 'A';
}

interface Props {
  flightNo: string;      // e.g. "LY357"
  flightDate: string | null;  // ISO date e.g. "2026-07-06"
  /** compact = just the pill badge; full = pill + extra info row */
  variant?: 'compact' | 'full';
}

const STATUS_COLORS: Record<string, string> = {
  'DEPARTED':    'var(--green)',
  'LANDED':      'var(--green)',
  'BOARDING':    '#FF9500',
  'FINAL CALL':  '#FF3B30',
  'GATE OPEN':   '#007AFF',
  'GATE CLOSED': '#8E8E93',
  'DELAYED':     '#FF9500',
  'CANCELLED':   '#FF3B30',
  'EXPECTED':    '#007AFF',
  'ON TIME':     'var(--green)',
  'CHECK-IN':    '#007AFF',
};

function statusColor(s: string | null): string {
  if (!s) return '#8E8E93';
  const upper = s.toUpperCase();
  for (const [k, v] of Object.entries(STATUS_COLORS)) {
    if (upper.includes(k)) return v;
  }
  return '#8E8E93';
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-IL', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return ''; }
}

/** Is the flight date today or tomorrow (worth showing live status)? */
function isNearToday(flightDate: string | null): boolean {
  if (!flightDate) return true; // show if unknown
  const today = new Date();
  const fd = new Date(flightDate + 'T00:00:00');
  const diffDays = Math.round((fd.getTime() - today.getTime()) / 86400000);
  return diffDays >= -1 && diffDays <= 1;
}

export default function FlightStatusBadge({ flightNo, flightDate, variant = 'compact' }: Props) {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const near = isNearToday(flightDate);

  const fetchStatus = useCallback(async () => {
    if (!near) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/flight-status?flight_no=${encodeURIComponent(flightNo)}`);
      const data = await res.json();
      if (data.flights && data.flights.length > 0) {
        setStatus(data.flights[0]);
        setLastUpdated(new Date());
      }
    } catch {
      // silent — keep previous state
    } finally {
      setLoading(false);
    }
  }, [flightNo, near]);

  useEffect(() => {
    fetchStatus();
    // refresh every 2 minutes while visible
    const iv = setInterval(fetchStatus, 120_000);
    return () => clearInterval(iv);
  }, [fetchStatus]);

  if (!near) return null;

  const statusText = status?.status_en ?? null;
  const color = statusColor(statusText);

  const estimatedTime = status?.estimated ? fmtTime(status.estimated) : null;
  const scheduledTime = status?.scheduled ? fmtTime(status.scheduled) : null;
  const showDelayedTime = estimatedTime && estimatedTime !== scheduledTime;

  if (variant === 'compact') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {loading && !status
          ? <span style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 500 }}>loading…</span>
          : statusText
            ? <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                color: color, textTransform: 'uppercase',
              }}>{statusText}</span>
            : null}
      </span>
    );
  }

  // full variant
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--separator)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* Live badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'rgba(255,59,48,0.12)', borderRadius: 6,
          padding: '2px 7px', fontSize: 10, fontWeight: 700,
          color: '#FF3B30', textTransform: 'uppercase', letterSpacing: 0.4,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#FF3B30', display: 'inline-block',
            animation: loading ? 'none' : 'pulse 2s infinite',
          }} />
          Live
        </span>

        {loading && !status
          ? <span style={{ fontSize: 12, color: 'var(--secondary)' }}>Fetching status…</span>
          : statusText
            ? <span style={{
                fontSize: 13, fontWeight: 700, color,
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>{statusText}</span>
            : <span style={{ fontSize: 12, color: 'var(--secondary)' }}>Not yet on board</span>
        }

        {showDelayedTime && (
          <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 500 }}>
            → {estimatedTime}
          </span>
        )}

        {status?.terminal && (
          <span style={{ fontSize: 12, color: 'var(--secondary)' }}>
            Terminal {status.terminal}
          </span>
        )}

        {status?.checkin_desk && (
          <span style={{ fontSize: 12, color: 'var(--secondary)' }}>
            Check-in {status.checkin_desk}
            {status.checkin_zone ? ` (Zone ${status.checkin_zone})` : ''}
          </span>
        )}
      </div>

      {lastUpdated && (
        <div style={{ fontSize: 10, color: 'var(--tertiary)', marginTop: 5 }}>
          Updated {lastUpdated.toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit', hour12: false })}
          {' · '}
          <button
            onClick={fetchStatus}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 10, color: 'var(--tint)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Refresh
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
