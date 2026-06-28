'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CarState, Refuel } from '@/lib/types';

interface CarClientProps {
  tripId: string;
  initialCar: CarState | null;
  initialRefuels: Refuel[];
}

const TANK_CAP = 60;
const DEFAULT_CONS = 7.5;

function fuelMeta(pct: number) {
  if (pct < 20) return { color: 'var(--red)', chip: 'chip-red', word: 'Low' };
  if (pct < 40) return { color: 'var(--orange)', chip: 'chip-orange', word: 'Half' };
  return { color: 'var(--green)', chip: 'chip-green', word: 'Good' };
}

function calcConsumption(refuels: Refuel[]): number | null {
  if (refuels.length < 2) return null;
  let totalL = 0, totalKm = 0;
  for (let i = 1; i < refuels.length; i++) {
    totalL  += refuels[i].liters;
    totalKm += refuels[i].odo_km - refuels[i - 1].odo_km;
  }
  return totalKm > 0 ? (totalL / totalKm) * 100 : null;
}

export default function CarClient({ tripId, initialCar, initialRefuels }: CarClientProps) {
  const [car, setCar]         = useState<CarState | null>(initialCar);
  const [refuels, setRefuels] = useState<Refuel[]>(initialRefuels);
  const [liters, setLiters]   = useState('');
  const [odo, setOdo]         = useState('');
  const [saving, setSaving]   = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const ch = supabase.channel(`car:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'car_state', filter: `trip_id=eq.${tripId}` },
        payload => { if (payload.new) setCar(payload.new as CarState); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'refuels', filter: `trip_id=eq.${tripId}` },
        payload => { if (payload.new) setRefuels(prev => [...prev, payload.new as Refuel]); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tripId]);

  const fuelLiters = car?.fuel_liters ?? 45;
  const tankCap    = car?.tank_capacity_l ?? TANK_CAP;
  const currentOdo = car?.current_odo_km ?? 0;
  const startOdo   = car?.start_odo_km ?? 0;
  const pct        = Math.max(0, Math.min(100, Math.round((fuelLiters / tankCap) * 100)));
  const avgCons    = calcConsumption(refuels);
  const consRate   = avgCons ?? DEFAULT_CONS;
  const range      = Math.round((fuelLiters / consRate) * 100);
  const kmTrip     = Math.max(0, currentOdo - startOdo);
  const meta       = fuelMeta(pct);

  const R = 42, C = 2 * Math.PI * R;
  const dashOffset = C * (1 - pct / 100);

  async function handleRefuel() {
    const l  = parseFloat(liters);
    const km = parseFloat(odo);
    if (isNaN(l) || isNaN(km) || l <= 0 || km < 0) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('refuels').insert({ trip_id: tripId, liters: l, odo_km: km, created_by: user.id });

    const newFuel  = Math.min(tankCap, Math.max(0, fuelLiters) + l);
    const newOdo   = Math.max(currentOdo, km);
    const newStart = startOdo === 0 && refuels.length === 0 ? Math.max(0, km - 50) : startOdo;

    await supabase.from('car_state').upsert({
      trip_id: tripId, tank_capacity_l: tankCap,
      fuel_liters: newFuel, start_odo_km: newStart,
      current_odo_km: newOdo, updated_at: new Date().toISOString(),
    });

    setLiters('');
    setOdo('');
    setSaving(false);
  }

  return (
    <>
      <div className="large-title">
        <h1>Car</h1>
        <div className="lt-sub">Volkswagen Tiguan · Booking.com rental</div>
      </div>

      {/* Car + gauge */}
      <div className="group tight">
        <div className="card">
          <div className="row has-icon">
            <span className="row-icon bg-green"><i className="ti ti-car" /></span>
            <span className="row-body">
              <span className="row-title" style={{ display: 'block', fontWeight: 600 }}>Volkswagen Tiguan</span>
              <span className="row-sub" style={{ display: 'block' }}>Booking.com rental</span>
            </span>
            <span className={`status-chip ${meta.chip}`}>{meta.word} · {pct}%</span>
          </div>

          <div className="gauge-wrap">
            <div className="gauge">
              <svg width="122" height="122" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={R} fill="none" stroke="var(--fill-3)" strokeWidth="8.5" />
                <circle cx="50" cy="50" r={R} fill="none" stroke={meta.color} strokeWidth="8.5"
                  strokeLinecap="round" strokeDasharray={C} strokeDashoffset={dashOffset}
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.32,0.72,0,1), stroke 0.3s' }} />
              </svg>
              <div className="gauge-label">
                <div className="gauge-pct tnum">{pct}%</div>
                <div className="gauge-cap">tank</div>
              </div>
            </div>
            <div className="gauge-stats">
              <div className="gs-row"><span className="gs-label">Fuel</span><span className="gs-value tnum">{fuelLiters.toFixed(1)} L</span></div>
              <div className="gs-row"><span className="gs-label">Tank</span><span className="gs-value tnum">{tankCap} L</span></div>
              <div className="gs-row"><span className="gs-label">Range</span><span className="gs-value tnum">{range.toLocaleString()} km</span></div>
              <div className="gs-row"><span className="gs-label">Odometer</span><span className="gs-value tnum">{currentOdo.toLocaleString()} km</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip stats */}
      <div className="group">
        <div className="group-header">This trip</div>
        <div className="card">
          <div className="row has-icon">
            <span className="row-icon bg-teal"><i className="ti ti-gauge" /></span>
            <span className="row-body"><span className="row-title" style={{ display: 'block' }}>Trip distance</span></span>
            <span className="row-detail tnum">{kmTrip.toLocaleString()} km</span>
          </div>
          <div className="row has-icon">
            <span className="row-icon bg-blue"><i className="ti ti-droplet" /></span>
            <span className="row-body"><span className="row-title" style={{ display: 'block' }}>Avg consumption</span></span>
            <span className="row-detail tnum">{avgCons !== null ? avgCons.toFixed(1) : '—'} L/100km</span>
          </div>
        </div>
      </div>

      {/* Roadside assistance */}
      <div className="group">
        <div className="group-header">Roadside assistance</div>
        <div className="card">
          <div className="row has-icon">
            <span className="row-icon bg-green"><i className="ti ti-shield-check" /></span>
            <span className="row-body">
              <span className="row-title" style={{ display: 'block' }}>VW Roadside</span>
              <span className="row-sub" style={{ display: 'block' }}>Included · free</span>
            </span>
            <a className="btn-link" href="tel:+498000" style={{ fontWeight: 600 }}>
              <i className="ti ti-phone" style={{ fontSize: 15, marginRight: 4, verticalAlign: '-2px', display: 'inline-flex' }} />
              Call
            </a>
          </div>
        </div>
        <div className="group-footer">24/7 assistance included with this Tiguan across Germany — breakdown, tyre, battery and lockout.</div>
      </div>

      {/* Voucher */}
      <div className="group">
        <div className="group-header">Booking voucher</div>
        <div className="card">
          <a
            href="https://www.booking.com"
            target="_blank" rel="noopener noreferrer"
            className="row has-icon" style={{ textDecoration: 'none' }}
          >
            <span className="row-icon bg-indigo"><i className="ti ti-ticket" /></span>
            <span className="row-body">
              <span className="row-title" style={{ display: 'block' }}>Booking.com voucher</span>
              <span className="row-sub" style={{ display: 'block' }}>Pickup details, insurance & contact</span>
            </span>
            <span className="chevron"><i className="ti ti-chevron-right" /></span>
          </a>
        </div>
      </div>

      {/* Log refuel */}
      <div className="group">
        <div className="group-header">Log a refuel</div>
        <div className="card" style={{ padding: '14px 16px 16px' }}>
          <div className="refuel-grid">
            <div className="field-box">
              <input type="number" inputMode="decimal" placeholder="Litres"
                value={liters} onChange={e => setLiters(e.target.value)} />
            </div>
            <div className="field-box">
              <input type="number" inputMode="numeric" placeholder="Odometer km"
                value={odo} onChange={e => setOdo(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-filled" style={{ marginTop: 12 }}
            onClick={handleRefuel} disabled={saving || !liters || !odo}>
            {saving ? 'Saving…' : 'Log refuel'}
          </button>
        </div>
      </div>

      {/* Refuel history */}
      <div className="group">
        <div className="group-header">Refuel history</div>
        <div className="card">
          {refuels.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px' }}>No refuels logged yet.</div>
          ) : (
            [...refuels].reverse().map(r => (
              <div key={r.id} className="row">
                <span className="row-body">
                  <span className="row-title" style={{ display: 'block' }}>{r.liters.toFixed(1)} L</span>
                  <span className="row-sub" style={{ display: 'block' }}>
                    {new Date(r.refueled_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                </span>
                <span className="row-detail tnum">{r.odo_km.toLocaleString()} km</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
