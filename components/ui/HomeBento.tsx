'use client';

import Link from 'next/link';
import WeatherQuickTile from './WeatherQuickTile';
import FlightStatusBadge from './FlightStatusBadge';

interface NextFlight {
  airline: string;
  flight_no: string;
  from_iata: string;
  to_iata: string;
  dep_time: string;
  arr_time: string;
  duration: string;
  flight_date: string | null;
}

interface HomeBentoProps {
  tripId: string;
  grocOpen: number;
  shopOpen: number;
  notePreview: string;
  fuelPct: number;
  startDate: string;
  endDate: string;
  nextFlight: NextFlight | null;
}

// Countdown to the user's arrival date.
function countdownTo(iso: string) {
  const tripDate = new Date(iso + 'T00:00:00');
  const now = new Date();
  const diff = tripDate.getTime() - now.getTime();
  if (diff <= 0) return { num: 0, label: 'days to go' };
  const days = Math.floor(diff / 86400000);
  if (days > 0) return { num: days, label: days === 1 ? 'day to go' : 'days to go' };
  const hours = Math.floor(diff / 3600000);
  return { num: hours, label: hours === 1 ? 'hour to go' : 'hours to go' };
}

function fmtShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Default itinerary shown when the user hasn't added their own flight.
const DEFAULT_FLIGHT: NextFlight = {
  airline: 'EL AL', flight_no: 'LY357',
  from_iata: 'TLV', to_iata: 'FRA',
  dep_time: '09:30', arr_time: '13:05',
  duration: '4h 35m', flight_date: '2026-07-06',
};

export default function HomeBento({
  tripId,
  grocOpen,
  shopOpen,
  notePreview,
  fuelPct,
  startDate,
  endDate,
  nextFlight,
}: HomeBentoProps) {
  const base = `/trip/${tripId}`;
  const cd = countdownTo(startDate);
  const fl = nextFlight ?? DEFAULT_FLIGHT;
  const days = Math.max(0, Math.round((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / 86400000));
  const flDateLabel = fl.flight_date
    ? new Date(fl.flight_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : '—';

  const fuelChip =
    fuelPct >= 40 ? 'chip-green' :
    fuelPct >= 20 ? 'chip-orange' :
    'chip-red';

  const fuelRange = Math.round((fuelPct / 100) * 650);

  const noteText = notePreview
    ? (notePreview.length > 110 ? notePreview.slice(0, 110) + '…' : notePreview)
    : 'Nothing yet — tap to write your first note.';

  return (
    <>
      {/* Photo header */}
      <div className="photo-header full">
        <img src="/assets/black-forest-header.webp" alt="" />
      </div>

      {/* Hero countdown */}
      <div className="hero">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="hero-eyebrow">Family road trip</div>
          <div className="hero-title">Black Forest</div>
          <div className="hero-dates">{fmtShort(startDate)} → {fmtShort(endDate)} · {days} days</div>
        </div>
        <div className="hero-count">
          <div className="hero-cd-num tnum">{cd.num}</div>
          <div className="hero-cd-lbl">{cd.label}</div>
        </div>
      </div>

      {/* Widgets grid */}
      <div className="widgets" style={{ marginTop: 14 }}>

        {/* Weather */}
        <Link href={`${base}/weather`} style={{ display: 'contents' }}>
          <WeatherQuickTile />
        </Link>

        {/* Fuel */}
        <Link href={`${base}/car`} className="widget" style={{ textDecoration: 'none' }}>
          <div className="wg-head">
            <i className="ti ti-gas-station" style={{ fontSize: 16, color: 'var(--green)' }} />
            <span className="wg-label">Tiguan</span>
            <span className={`wg-chip ${fuelChip}`}>{fuelRange} km</span>
          </div>
          <div className="wg-big tnum">{fuelPct}%</div>
          <div className="wg-sub">tap to update</div>
        </Link>

        {/* Next flight */}
        <Link href={`${base}/flights`} className="widget widget-wide" style={{ textDecoration: 'none' }}>
          <div className="wg-head">
            <i className="ti ti-plane-departure" style={{ fontSize: 16, color: 'var(--tint)' }} />
            <span className="wg-label">Next departure</span>
            <span className="wg-chip">{`${fl.airline} ${fl.flight_no}`.trim() || 'Flight'}</span>
          </div>
          <div className="wfl-route">
            <span className="wfl-iata">{fl.from_iata || '—'}</span>
            <span className="wfl-arrow">→</span>
            <span className="wfl-iata">{fl.to_iata || '—'}</span>
          </div>
          <div className="wfl-times">
            <div className="wfl-t"><div className="l">Dep</div><div className="v tnum">{fl.dep_time || '—'}</div></div>
            <div className="wfl-t"><div className="l">Arr</div><div className="v tnum">{fl.arr_time || '—'}</div></div>
            <div className="wfl-t"><div className="l">Duration</div><div className="v tnum">{fl.duration || '—'}</div></div>
            <div className="wfl-t"><div className="l">Date</div><div className="v">{flDateLabel}</div></div>
          </div>
          {fl.flight_no && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(255,59,48,0.1)', borderRadius: 5,
                padding: '2px 6px', fontSize: 9, fontWeight: 700,
                color: '#FF3B30', textTransform: 'uppercase', letterSpacing: 0.4,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF3B30', display: 'inline-block' }} />
                Live
              </span>
              <FlightStatusBadge
                flightNo={`${fl.airline.replace(/\s+/g, '')}${fl.flight_no}`}
                flightDate={fl.flight_date ?? null}
                variant="compact"
              />
            </div>
          )}
        </Link>

        {/* Map */}
        <Link href={`${base}/map`} className="widget widget-wide" style={{ textDecoration: 'none', paddingBottom: 14 }}>
          <div className="wg-head" style={{ marginBottom: 10 }}>
            <i className="ti ti-map-2" style={{ fontSize: 16, color: '#2E8B57' }} />
            <span className="wg-label">Trip map</span>
            <span className="wg-chip">12 stops</span>
          </div>
          <div className="wmap-preview">
            <span className="wmap-pin" style={{ left: '50%', top: '50%', background: '#2E8B57', width: 12, height: 12 }} />
          </div>
        </Link>

        {/* Groceries */}
        <Link href={`${base}/groceries`} className="widget" style={{ textDecoration: 'none' }}>
          <div className="wg-head">
            <i className="ti ti-shopping-cart" style={{ fontSize: 16, color: 'var(--orange)' }} />
            <span className="wg-label">Groceries</span>
          </div>
          <div className="wg-big tnum">{grocOpen}</div>
          <div className="wg-sub">items to buy</div>
        </Link>

        {/* Frankfurt */}
        <Link href={`${base}/frankfurt`} className="widget" style={{ textDecoration: 'none' }}>
          <div className="wg-head">
            <i className="ti ti-building-store" style={{ fontSize: 16, color: 'var(--indigo)' }} />
            <span className="wg-label">Frankfurt</span>
          </div>
          <div className="wg-big tnum">{shopOpen}</div>
          <div className="wg-sub">items to buy</div>
        </Link>

      </div>

      {/* Notes group */}
      <div className="group" style={{ marginTop: 8 }}>
        <div className="group-header">Latest note</div>
        <div className="card">
          <Link href={`${base}/notes`} className="row has-icon" style={{ textDecoration: 'none' }}>
            <span className="row-icon bg-yellow"><i className="ti ti-notes" /></span>
            <span className="row-body">
              <span className="row-title" style={{ display: 'block' }}>{noteText}</span>
            </span>
            <span className="chevron"><i className="ti ti-chevron-right" /></span>
          </Link>
        </div>
      </div>
    </>
  );
}
