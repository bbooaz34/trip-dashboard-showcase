'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Flight, MemberTripDates } from '@/lib/types';
import FlightStatusBadge from './FlightStatusBadge';

interface FlightsClientProps {
  tripId: string;
  userId: string;
  tripStart: string;
  tripEnd: string;
  initialDates: MemberTripDates | null;
  initialFlights: Flight[];
}

// The shared family itinerary, shown to anyone who hasn't added their own
// flights yet. Read-only — adding a flight replaces it with the user's own.
const DEFAULT_FLIGHTS = [
  {
    direction: 'outbound', airline: 'EL AL', flight_no: 'LY357',
    from_iata: 'TLV', from_city: 'Tel Aviv', dep_time: '09:30',
    to_iata: 'FRA', to_city: 'Frankfurt', arr_time: '13:05',
    duration: '4h 35m', date_label: 'Mon 6 Jul', confirmation: '',
    manage_url: 'https://www.elal.com/en/PassengersInfo/managebooking/Pages/default.aspx',
  },
  {
    direction: 'return', airline: 'EL AL', flight_no: 'LY358',
    from_iata: 'FRA', from_city: 'Frankfurt', dep_time: '14:40',
    to_iata: 'TLV', to_city: 'Tel Aviv', arr_time: '19:30',
    duration: '4h 50m', date_label: 'Mon 13 Jul', confirmation: '',
    manage_url: 'https://www.elal.com/en/PassengersInfo/managebooking/Pages/default.aspx',
  },
];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

type FormState = Partial<Flight> & { direction: string };

const EMPTY_FORM: FormState = {
  direction: 'outbound', airline: '', flight_no: '',
  from_iata: '', from_city: '', dep_time: '',
  to_iata: '', to_city: '', arr_time: '',
  duration: '', flight_date: null, confirmation: '', manage_url: '',
};

export default function FlightsClient({
  tripId, userId, tripStart, tripEnd, initialDates, initialFlights,
}: FlightsClientProps) {
  const supabase = createClient();

  const [flights, setFlights] = useState<Flight[]>(initialFlights);
  const [start, setStart]     = useState(initialDates?.start_date ?? tripStart);
  const [end, setEnd]         = useState(initialDates?.end_date ?? tripEnd);
  const [datesSaved, setDatesSaved] = useState(!!initialDates);
  const [savingDates, setSavingDates] = useState(false);

  const [form, setForm]       = useState<FormState | null>(null);
  const [editId, setEditId]   = useState<string | null>(null);
  const [savingFlight, setSavingFlight] = useState(false);

  async function saveDates() {
    if (!start || !end || savingDates) return;
    setSavingDates(true);
    await supabase.from('member_trip_dates').upsert({
      trip_id: tripId, user_id: userId,
      start_date: start, end_date: end,
      updated_at: new Date().toISOString(),
    });
    setSavingDates(false);
    setDatesSaved(true);
  }

  function openAdd() { setEditId(null); setForm({ ...EMPTY_FORM }); }
  function openEdit(f: Flight) { setEditId(f.id); setForm({ ...f }); }
  function closeForm() { setForm(null); setEditId(null); }

  function setField(k: keyof FormState, v: string) {
    setForm(prev => prev ? { ...prev, [k]: v } : prev);
  }

  async function saveFlight() {
    if (!form || savingFlight) return;
    setSavingFlight(true);

    const row = {
      trip_id: tripId,
      user_id: userId,
      direction: form.direction,
      airline: form.airline ?? '',
      flight_no: form.flight_no ?? '',
      from_iata: (form.from_iata ?? '').toUpperCase(),
      from_city: form.from_city ?? '',
      to_iata: (form.to_iata ?? '').toUpperCase(),
      to_city: form.to_city ?? '',
      dep_time: form.dep_time ?? '',
      arr_time: form.arr_time ?? '',
      duration: form.duration ?? '',
      flight_date: form.flight_date || null,
      confirmation: form.confirmation ?? '',
      manage_url: form.manage_url ?? '',
    };

    if (editId) {
      const { data } = await supabase.from('flights').update(row).eq('id', editId).select().single();
      if (data) setFlights(prev => prev.map(f => f.id === editId ? data : f));
    } else {
      const position = flights.length;
      const { data } = await supabase.from('flights').insert({ ...row, position }).select().single();
      if (data) setFlights(prev => [...prev, data]);
    }

    setSavingFlight(false);
    closeForm();
  }

  async function deleteFlight(fid: string) {
    await supabase.from('flights').delete().eq('id', fid);
    setFlights(prev => prev.filter(f => f.id !== fid));
  }

  const usingDefault = flights.length === 0;
  const tripDays = (() => {
    const a = new Date(start + 'T00:00:00').getTime();
    const b = new Date(end + 'T00:00:00').getTime();
    const d = Math.round((b - a) / 86400000);
    return d > 0 ? d : 0;
  })();

  return (
    <>
      <div className="large-title">
        <h1>Flights</h1>
        <div className="lt-sub">Your personal travel · only you can see this</div>
      </div>

      {/* Travel dates */}
      <div className="group">
        <div className="group-header">Your travel dates</div>
        <div className="card" style={{ padding: '14px 16px 16px' }}>
          <div className="refuel-grid">
            <div>
              <div className="pm-label" style={{ marginBottom: 6 }}>Arrive</div>
              <div className="field-box">
                <input type="date" value={start}
                  onChange={e => { setStart(e.target.value); setDatesSaved(false); }} />
              </div>
            </div>
            <div>
              <div className="pm-label" style={{ marginBottom: 6 }}>Leave</div>
              <div className="field-box">
                <input type="date" value={end}
                  onChange={e => { setEnd(e.target.value); setDatesSaved(false); }} />
              </div>
            </div>
          </div>
          <button className="btn btn-filled" style={{ marginTop: 12 }}
            onClick={saveDates} disabled={savingDates || datesSaved || !start || !end}>
            {savingDates ? 'Saving…' : datesSaved ? `Saved · ${tripDays} days` : 'Save my dates'}
          </button>
        </div>
        <div className="group-footer">
          These dates power your home countdown. Map, car, notes and lists stay shared with everyone.
        </div>
      </div>

      {/* Flights */}
      <div className="group">
        <div className="group-header">
          {usingDefault ? 'Family itinerary (default)' : 'Your flights'}
        </div>

        {usingDefault
          ? DEFAULT_FLIGHTS.map((f, i) => (
              <div className="pass" key={i}>
                <div className="pass-top">
                  <div className="pass-head">
                    <span className="pass-airline">{f.airline} · {f.flight_no}</span>
                    <span className="pass-dir">{f.direction === 'return' ? 'Return' : 'Outbound'}</span>
                  </div>
                  <div className="pass-route">
                    <div>
                      <div className="pass-iata">{f.from_iata}</div>
                      <div className="pass-city">{f.from_city}</div>
                      <div className="pass-time">{f.dep_time}</div>
                    </div>
                    <div className="pass-arc">
                      <div className="pass-arc-line"><span className="dot" /><span className="dash" /></div>
                      <i className="ti ti-plane" />
                      <div className="pass-arc-line"><span className="dash" /><span className="dot" /></div>
                      <div className="pass-arc-dur tnum">{f.duration}</div>
                    </div>
                    <div className="pass-col-r">
                      <div className="pass-iata">{f.to_iata}</div>
                      <div className="pass-city">{f.to_city}</div>
                      <div className="pass-time">{f.arr_time}</div>
                    </div>
                  </div>
                </div>
                <div className="pass-tear"><div className="tear-line" /></div>
                <div className="pass-meta">
                  <div><div className="pm-label">Date</div><div className="pm-value">{f.date_label}</div></div>
                  <div><div className="pm-label">Confirmation</div><div className="pm-value">{f.confirmation}</div></div>
                </div>
                <FlightStatusBadge
                  flightNo={`${f.airline.replace(/\s+/g, '')}${f.flight_no}`}
                  flightDate={f.direction === 'outbound' ? '2026-07-06' : '2026-07-13'}
                  variant="full"
                />
                <div className="pass-cta">
                  <a className="btn btn-tinted btn-sm" href={f.manage_url} target="_blank" rel="noopener noreferrer">
                    Manage booking
                  </a>
                </div>
              </div>
            ))
          : flights.map(f => (
              <div className="pass" key={f.id}>
                <div className="pass-top">
                  <div className="pass-head">
                    <span className="pass-airline">{f.airline || 'Flight'}{f.flight_no ? ` · ${f.flight_no}` : ''}</span>
                    <span className="pass-dir">{f.direction === 'return' ? 'Return' : 'Outbound'}</span>
                  </div>
                  <div className="pass-route">
                    <div>
                      <div className="pass-iata">{f.from_iata || '—'}</div>
                      <div className="pass-city">{f.from_city}</div>
                      <div className="pass-time">{f.dep_time}</div>
                    </div>
                    <div className="pass-arc">
                      <div className="pass-arc-line"><span className="dot" /><span className="dash" /></div>
                      <i className="ti ti-plane" />
                      <div className="pass-arc-line"><span className="dash" /><span className="dot" /></div>
                      <div className="pass-arc-dur tnum">{f.duration}</div>
                    </div>
                    <div className="pass-col-r">
                      <div className="pass-iata">{f.to_iata || '—'}</div>
                      <div className="pass-city">{f.to_city}</div>
                      <div className="pass-time">{f.arr_time}</div>
                    </div>
                  </div>
                </div>
                <div className="pass-tear"><div className="tear-line" /></div>
                <div className="pass-meta">
                  <div><div className="pm-label">Date</div><div className="pm-value">{fmtDate(f.flight_date)}</div></div>
                  <div><div className="pm-label">Confirmation</div><div className="pm-value">{f.confirmation || '—'}</div></div>
                </div>
                {f.flight_no && (
                  <FlightStatusBadge
                    flightNo={`${(f.airline || '').replace(/\s+/g, '')}${f.flight_no}`}
                    flightDate={f.flight_date ?? null}
                    variant="full"
                  />
                )}
                <div className="pass-cta" style={{ gap: 8, display: 'flex' }}>
                  {f.manage_url && (
                    <a className="btn btn-tinted btn-sm" href={f.manage_url} target="_blank" rel="noopener noreferrer">
                      Manage booking
                    </a>
                  )}
                  <button className="btn btn-gray btn-sm" onClick={() => openEdit(f)}>Edit</button>
                  <button className="btn-link" style={{ color: 'var(--red)' }} onClick={() => deleteFlight(f.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}

        <button className="btn btn-filled" style={{ marginTop: 14 }} onClick={openAdd}>
          <i className="ti ti-plus" /> Add a flight
        </button>
        {usingDefault && (
          <div className="group-footer">
            Showing the default family itinerary. Add your own flight to replace it with yours.
          </div>
        )}
      </div>

      {/* Add / edit form */}
      {form && (
        <div className="group">
          <div className="group-header">{editId ? 'Edit flight' : 'Add a flight'}</div>
          <div className="card" style={{ padding: '14px 16px 16px' }}>
            <div className="seg" role="tablist" style={{ marginBottom: 12 }}>
              <button type="button" className={`seg-opt${form.direction === 'outbound' ? ' seg-on' : ''}`}
                onClick={() => setField('direction', 'outbound')}>Outbound</button>
              <button type="button" className={`seg-opt${form.direction === 'return' ? ' seg-on' : ''}`}
                onClick={() => setField('direction', 'return')}>Return</button>
            </div>

            <div className="refuel-grid">
              <div className="field-box"><input placeholder="Airline (EL AL)" value={form.airline ?? ''} onChange={e => setField('airline', e.target.value)} /></div>
              <div className="field-box"><input placeholder="Flight no (LY357)" value={form.flight_no ?? ''} onChange={e => setField('flight_no', e.target.value)} /></div>
            </div>
            <div className="refuel-grid" style={{ marginTop: 10 }}>
              <div className="field-box"><input placeholder="From IATA (TLV)" maxLength={3} value={form.from_iata ?? ''} onChange={e => setField('from_iata', e.target.value)} /></div>
              <div className="field-box"><input placeholder="From city" value={form.from_city ?? ''} onChange={e => setField('from_city', e.target.value)} /></div>
            </div>
            <div className="refuel-grid" style={{ marginTop: 10 }}>
              <div className="field-box"><input placeholder="To IATA (FRA)" maxLength={3} value={form.to_iata ?? ''} onChange={e => setField('to_iata', e.target.value)} /></div>
              <div className="field-box"><input placeholder="To city" value={form.to_city ?? ''} onChange={e => setField('to_city', e.target.value)} /></div>
            </div>
            <div className="refuel-grid" style={{ marginTop: 10 }}>
              <div className="field-box"><input placeholder="Dep 09:30" value={form.dep_time ?? ''} onChange={e => setField('dep_time', e.target.value)} /></div>
              <div className="field-box"><input placeholder="Arr 13:05" value={form.arr_time ?? ''} onChange={e => setField('arr_time', e.target.value)} /></div>
            </div>
            <div className="refuel-grid" style={{ marginTop: 10 }}>
              <div className="field-box"><input placeholder="Duration 4h 35m" value={form.duration ?? ''} onChange={e => setField('duration', e.target.value)} /></div>
              <div className="field-box"><input type="date" value={form.flight_date ?? ''} onChange={e => setField('flight_date', e.target.value)} /></div>
            </div>
            <div className="field-box" style={{ marginTop: 10 }}><input placeholder="Confirmation code" value={form.confirmation ?? ''} onChange={e => setField('confirmation', e.target.value)} /></div>
            <div className="field-box" style={{ marginTop: 10 }}><input placeholder="Manage booking URL (optional)" value={form.manage_url ?? ''} onChange={e => setField('manage_url', e.target.value)} /></div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-filled" onClick={saveFlight} disabled={savingFlight}>
                {savingFlight ? 'Saving…' : editId ? 'Save changes' : 'Add flight'}
              </button>
              <button className="btn btn-gray" onClick={closeForm} disabled={savingFlight}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
