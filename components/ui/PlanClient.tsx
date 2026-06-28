'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY_EMOJI, CATEGORY_LABEL, CATEGORY_COLOR, haversineKm } from '@/lib/stops';
import type { StopCategory } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────
interface PlanItem {
  id: string; trip_id: string; date: string; time: string | null;
  title: string; notes: string; category: string; done: boolean; position: number;
}
interface TripStop { id: string; name: string; category: string; lat: number; lng: number; }
interface WxDay { code: number | null; rain: number | null; hi: number | null; lo: number | null; }
interface StopWithDist extends TripStop { km: number; weather: string; }

interface PlanClientProps {
  tripId: string; initialItems: PlanItem[]; startDate: string; endDate: string;
  stopsCount: number; stops: TripStop[]; baseCampLat: number; baseCampLng: number;
}

// ── Date helpers ──────────────────────────────────────────────────────────
const WD  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MO  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function localStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isoRange(s: string, e: string) {
  const out: string[] = [];
  const cur = new Date(s + 'T00:00:00'), last = new Date(e + 'T00:00:00');
  while (cur <= last) { out.push(localStr(cur)); cur.setDate(cur.getDate()+1); }
  return out;
}
function parts(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return { wd: WD[d.getDay()], day: d.getDate(), mo: MO[d.getMonth()] };
}
const today = () => localStr(new Date());

// ── Anchors (fixed locked items) ─────────────────────────────────────────
interface Anchor { id: string; text: string; emoji: string; }
function getAnchors(iso: string, startIso: string): Anchor[] {
  const off = Math.round(
    (new Date(iso+'T00:00:00').getTime() - new Date(startIso+'T00:00:00').getTime()) / 86_400_000
  );
  if (off === 0) return [
    { id:'a1', text:'Land Frankfurt · LY357 13:05', emoji:'✈️' },
    { id:'a2', text:'Drive to base camp · ~2 h',    emoji:'🚗' },
  ];
  if (off === 6) return [
    { id:'a3', text:'Check out of base camp', emoji:'🧳' },
    { id:'a4', text:'Drive to Frankfurt · ~4 h', emoji:'🚗' },
  ];
  if (off === 7) return [
    { id:'a5', text:'Drive to airport',      emoji:'🚗' },
    { id:'a6', text:'Fly home · LY358 14:40', emoji:'✈️' },
  ];
  return [];
}
function dayTag(off: number, total: number) {
  if (off === 0)         return 'Arrival';
  if (off === total - 1) return 'Fly home';
  if (off === total - 2) return 'To Frankfurt';
  if (off === total - 3) return 'Last full day';
  return 'Full day';
}

// ── Weather helpers ───────────────────────────────────────────────────────
function isWet(c: number) { return (c>=51&&c<=67)||(c>=80&&c<=99); }
function wxEmoji(wx?: WxDay|null) {
  if (!wx||wx.code==null) return '🗓️';
  const c = wx.code;
  if (c<=1) return '☀️'; if (c===2) return '⛅'; if (c===3) return '☁️';
  if (c>=45&&c<=48) return '🌫️';
  return isWet(c) ? (c>=95?'⛈️':'🌧️') : '☁️';
}
function wxMood(wx?: WxDay|null) {
  if (!wx) return { key:'unknown', promote:['sun','any'], blurb:'Forecast not in yet — showing fair-weather picks' };
  const rain = wx.rain??0;
  if (rain>=60||(wx.code!=null&&isWet(wx.code)))
    return { key:'indoor',  promote:['rain'],      blurb:'Wet day — go indoors' };
  if (rain>=30)
    return { key:'mixed',   promote:['any','rain'], blurb:'Mixed — keep options open' };
  return   { key:'outdoor', promote:['sun'],        blurb:'Fine day — get outside' };
}
function stopWeather(cat: string) {
  if (['waterfall','lake','mountain','nature'].includes(cat)) return 'sun';
  if (['museum','church'].includes(cat)) return 'rain';
  return 'any';
}
async function fetchWx(lat: number, lng: number, start: string, end: string): Promise<Record<string,WxDay>> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
    + `&daily=weather_code,precipitation_probability_max,temperature_2m_max,temperature_2m_min`
    + `&timezone=Europe%2FBerlin&start_date=${start}&end_date=${end}`;
  const r = await fetch(url); if (!r.ok) throw new Error('wx '+r.status);
  const j = await r.json(); const d = j.daily||{};
  const out: Record<string,WxDay> = {};
  (d.time||[]).forEach((iso: string, i: number) => {
    out[iso] = {
      code: d.weather_code?.[i]??null, rain: d.precipitation_probability_max?.[i]??null,
      hi: d.temperature_2m_max?.[i]!=null ? Math.round(d.temperature_2m_max[i]) : null,
      lo: d.temperature_2m_min?.[i]!=null ? Math.round(d.temperature_2m_min[i]) : null,
    };
  });
  return out;
}

// ── Badges ────────────────────────────────────────────────────────────────
interface BadgeDef {
  key: string; emoji: string; name: string; desc: string;
  test: (names: Set<string>, cats: Set<string>, ctx: { fullDays: number; everyDayPlanned: boolean }) => boolean;
}
const BADGES: BadgeDef[] = [
  { key:'waterfallHunter', emoji:'💧', name:'Waterfall Hunter', desc:'Visit two or more waterfalls',
    test:(_,cats)=>Array.from(cats).filter(c=>c==='waterfall').length>=2 },
  { key:'peakBagger',  emoji:'⛰️', name:'Peak Bagger',   desc:'Ride the Feldberg',
    test:(n)=>Array.from(n).some(x=>x.includes('feldberg')) },
  { key:'lakeDay',     emoji:'🏞️', name:'Lake Day',      desc:'Visit a lake',
    test:(_,cats)=>cats.has('lake') },
  { key:'rainyHero',   emoji:'🌧️', name:'Rainy-Day Hero', desc:'Visit a museum or church',
    test:(_,cats)=>cats.has('museum')||cats.has('church') },
  { key:'kidApproved', emoji:'🎡', name:'Kid Approved',  desc:'A kids attraction',
    test:(_,cats)=>cats.has('kids') },
  { key:'forestFoodie',emoji:'🍽️', name:'Forest Foodie', desc:'Eat at a forest food stop',
    test:(_,cats)=>cats.has('food') },
  { key:'cityStroller', emoji:'🥨', name:'City Stroller', desc:'Wander a Black Forest town',
    test:(_,cats)=>cats.has('city') },
  { key:'masterPlanner',emoji:'🗺️', name:'Master Planner', desc:'Every day has a plan',
    test:(_,__,ctx)=>ctx.everyDayPlanned },
  { key:'cuckooClock',  emoji:'🐦', name:"Cuckoo's Clock", desc:"Tick off a whole day's plan",
    test:(_,__,ctx)=>ctx.fullDays>0 },
];

// ── uid ───────────────────────────────────────────────────────────────────
const uid = () => 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

// ══════════════════════════════════════════════════════════════════════════
// CuckooStage
// ══════════════════════════════════════════════════════════════════════════
const CONF_COLS = ['#E8B84B','#5BA56A','#4C8FD6','#E07A5F','#B07FD0','#EFC75E'];
function CuckooStage({ burst }: { burst: { id: string; emoji: string; text: string } | null }) {
  if (!burst) return null;
  const bits = Array.from({ length: 22 }, (_, i) => {
    const ang = (Math.PI * (0.15 + 0.7 * (i / 21))) + (Math.random() - 0.5) * 0.3;
    const dist = 120 + Math.random() * 120;
    return {
      left: 30 + Math.random() * 40,
      cx: Math.cos(ang) * dist * (Math.random() < 0.5 ? -1 : 1) + 'px',
      cy: Math.sin(ang) * dist + 60 + 'px',
      cr: (Math.random() * 720 - 360) + 'deg',
      bg: CONF_COLS[i % CONF_COLS.length],
      delay: Math.random() * 0.12,
    };
  });
  return (
    <div className="cuckoo-stage" key={burst.id}>
      <div className="cuckoo-toast go"><span className="em">{burst.emoji}</span>{burst.text}</div>
      <div className="cuckoo-bird go">🐦</div>
      {bits.map((b, i) => (
        <span key={i} className="confetti go" style={{
          left: b.left + '%', background: b.bg,
          '--cx': b.cx, '--cy': b.cy, '--cr': b.cr,
          animationDelay: b.delay + 's',
          borderRadius: i % 3 === 0 ? '50%' : '2px',
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// AddDrawer
// ══════════════════════════════════════════════════════════════════════════
interface DrawerProps {
  date: string; idx: number; tag: string;
  wx: WxDay | null;
  stops: StopWithDist[];
  dayItems: PlanItem[];
  onAdd: (date: string, title: string, category: string) => Promise<void>;
  onClose: () => void;
}

function AddDrawer({ date, idx, tag, wx, stops, dayItems, onAdd, onClose }: DrawerProps) {
  const [up,   setUp]   = useState(false);
  const [tab,  setTab]  = useState<'attractions'|'free'>('attractions');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // stop id being added
  const inputRef = useRef<HTMLInputElement>(null);

  // slide-up on mount
  useEffect(() => { const t = setTimeout(() => setUp(true), 20); return () => clearTimeout(t); }, []);

  // focus free input when switching tab
  useEffect(() => {
    if (tab === 'free') setTimeout(() => inputRef.current?.focus(), 60);
  }, [tab]);

  const close = useCallback(() => { setUp(false); setTimeout(onClose, 320); }, [onClose]);

  // drag-to-close on grabber
  const dragY   = useRef(0);
  const dragRef = useRef({ y: 0, active: false });
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const onGrabDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { y: e.clientY, active: true };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);
  const onGrabMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    setDragOffset(Math.max(0, e.clientY - dragRef.current.y));
  }, []);
  const onGrabUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragging(false);
    setDragOffset(prev => { if (prev > 110) { setUp(false); setTimeout(onClose, 320); } return 0; });
  }, [onClose]);

  const { wd, day, mo } = parts(date);
  const m = wxMood(wx);
  const wxCls = wx ? (m.key === 'indoor' ? 'wx-rain' : m.key === 'outdoor' ? 'wx-sun' : '') : '';

  const inDay = new Set(dayItems.map(i => i.title));
  const promoted: StopWithDist[] = [], rest: StopWithDist[] = [];
  stops.forEach(s => (m.promote.includes(s.weather) ? promoted : rest).push(s));

  async function addStop(stop: StopWithDist) {
    if (busy) return;
    setBusy(stop.id);
    await onAdd(date, stop.name, stop.category);
    setBusy(null);
  }

  async function addFree() {
    const t = text.trim(); if (!t) return;
    await onAdd(date, t, 'nature');
    setText('');
  }

  const AttrRow = (stop: StopWithDist) => {
    const cat   = stop.category as StopCategory;
    const color = CATEGORY_COLOR[cat] ?? '#888';
    const emoji = CATEGORY_EMOJI[cat] ?? '📍';
    const added = inDay.has(stop.name);
    return (
      <button key={stop.id} className="attr-row" onClick={() => addStop(stop)}>
        <span className="attr-chip" style={{ background: color }}>{emoji}</span>
        <span className="attr-body">
          <span className={`attr-name${added ? ' visited' : ''}`}>{stop.name}</span>
          <span className="attr-meta">{CATEGORY_LABEL[cat] ?? cat} · {stop.km} km from base</span>
        </span>
        <span className={`attr-add${added ? ' added' : ''}`}>
          <i className={`ti ${added ? 'ti-check' : busy === stop.id ? 'ti-loader-2' : 'ti-plus'}`}
            style={busy === stop.id ? { animation: 'spin 0.8s linear infinite' } : undefined} />
        </span>
      </button>
    );
  };

  return (
    <div className={`plan-drawer-overlay${up ? ' up' : ''}`} onClick={close}>
      <div
        ref={sheetRef}
        className={`sheet drawer lg${up ? ' up' : ''}`}
        style={{
          transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
          transition: dragging ? 'none' : undefined,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Grabber */}
        <div className="sheet-grab-zone"
          onPointerDown={onGrabDown} onPointerMove={onGrabMove}
          onPointerUp={onGrabUp} onPointerCancel={onGrabUp}>
          <div className="sheet-grabber" />
        </div>

        {/* Header */}
        <div className="drawer-head">
          <div className="drawer-title">
            Add to {wd} {day} {mo}
            <small>Day {idx + 1} · {tag}</small>
          </div>
          <button className="drawer-close" onClick={close} aria-label="Close">
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Segmented control */}
        <div className="drawer-seg">
          <button className={tab === 'attractions' ? 'on' : ''} onClick={() => setTab('attractions')}>
            Attractions
          </button>
          <button className={tab === 'free' ? 'on' : ''} onClick={() => setTab('free')}>
            Your own
          </button>
        </div>

        {/* Scrollable body */}
        <div className="drawer-scroll">
          {tab === 'attractions' ? (
            <>
              {/* Weather banner */}
              <div className={`wx-banner${wxCls ? ' '+wxCls : ''}`}>
                <span className="em">{wxEmoji(wx)}</span>
                <span>
                  {wx
                    ? <><b>{wx.hi}°</b> · {wx.rain == null ? '—' : wx.rain+'% rain'} — {m.blurb}</>
                    : <><b>Forecast not in yet</b> — showing fair-weather picks</>
                  }
                </span>
              </div>

              {/* Good for weather */}
              {promoted.length > 0 && (
                <>
                  <div className="attr-section good">
                    <i className="ti ti-sparkles" />Good for {wd}&apos;s weather
                  </div>
                  {promoted.map(AttrRow)}
                </>
              )}

              {/* More options */}
              {rest.length > 0 && (
                <>
                  <div className="attr-section">More options</div>
                  {rest.map(AttrRow)}
                </>
              )}

              {stops.length === 0 && (
                <div style={{ padding: '24px 20px', color: 'var(--label-3)', fontSize: 14, textAlign: 'center' }}>
                  No stops added to this trip yet.
                </div>
              )}
              <div style={{ height: 8 }} />
            </>
          ) : (
            <div className="drawer-free">
              <div className="field-box">
                <input
                  ref={inputRef}
                  placeholder="Lunch by the lake, nap time, laundry…"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && text.trim()) addFree(); }}
                />
                {text.trim() && (
                  <button className="btn-link" style={{ fontWeight: 600 }} onClick={addFree}>Add</button>
                )}
              </div>
              <div className="drawer-free-hint">
                Anything that&apos;s not on the map — meals, downtime, errands. It gets its own checkbox on the day.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PlanClient (main)
// ══════════════════════════════════════════════════════════════════════════
export default function PlanClient({
  tripId, initialItems, startDate, endDate,
  stopsCount, stops, baseCampLat, baseCampLng,
}: PlanClientProps) {
  const [items,     setItems]     = useState<PlanItem[]>(initialItems);
  const [wx,        setWx]        = useState<Record<string,WxDay>|null>(null);
  const [drawer,    setDrawer]    = useState<{ date:string; idx:number; tag:string }|null>(null);
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>(() => {
    const t = today();
    const active = (t >= startDate && t <= endDate) ? t : startDate;
    return Object.fromEntries(isoRange(startDate, endDate).map(d => [d, d !== active]));
  });
  const [burst,     setBurst]     = useState<{ id:string; emoji:string; text:string }|null>(null);
  const [selBadge,  setSelBadge]  = useState<string|null>(null);
  const prevEarned = useRef<Set<string>|null>(null);
  const supabase = createClient();

  // weather
  useEffect(() => {
    fetchWx(baseCampLat, baseCampLng, startDate, endDate).then(setWx).catch(() => {});
  }, [baseCampLat, baseCampLng, startDate, endDate]);

  // real-time
  useEffect(() => {
    const ch = supabase.channel(`plan:${tripId}`)
      .on('postgres_changes', { event:'*', schema:'public', table:'plan_items',
        filter:`trip_id=eq.${tripId}` }, () => {
        supabase.from('plan_items').select('*').eq('trip_id', tripId).order('position')
          .then(({ data }) => { if (data) setItems(data as PlanItem[]); });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tripId]);

  const dates = isoRange(startDate, endDate);

  // badge inputs
  const doneItems = items.filter(i => i.done);
  const doneNames = new Set(doneItems.map(i => i.title.toLowerCase()));
  const doneCats  = new Set(doneItems.map(i => i.category));
  let fullDays = 0, plannedDays = 0;
  dates.forEach(d => {
    const di = items.filter(i => i.date === d);
    if (di.length > 0) plannedDays++;
    if (di.length > 0 && di.every(i => i.done)) fullDays++;
  });
  const everyDayPlanned = dates.every(d =>
    items.some(i => i.date === d) || getAnchors(d, startDate).length > 0
  );
  const ctx = { fullDays, everyDayPlanned };
  const earned = new Set(BADGES.filter(b => b.test(doneNames, doneCats, ctx)).map(b => b.key));

  // celebrate new badges
  useEffect(() => {
    if (prevEarned.current == null) { prevEarned.current = earned; return; }
    const earnedArr = Array.from(earned);
    const fresh = earnedArr.filter(k => !prevEarned.current!.has(k));
    prevEarned.current = earned;
    if (fresh.length) {
      const b = BADGES.find(x => x.key === fresh[0])!;
      fire(b.emoji, 'Badge unlocked: ' + b.name);
    }
  }, [Array.from(earned).join(',')]);  // eslint-disable-line react-hooks/exhaustive-deps

  function fire(emoji: string, text: string) {
    setBurst({ id: uid(), emoji, text });
    setTimeout(() => setBurst(null), 1700);
  }

  async function toggleDone(item: PlanItem) {
    const done = !item.done;
    const nextItems = items.map(it => it.id === item.id ? { ...it, done } : it);
    setItems(nextItems);
    await supabase.from('plan_items').update({ done }).eq('id', item.id);
    // celebrate full day
    const dayItems = nextItems.filter(i => i.date === item.date);
    if (done && dayItems.length > 0 && dayItems.every(i => i.done)) {
      setTimeout(() => fire('🐦', "That's a wrap on this day!"), 60);
    }
  }

  async function delItem(item: PlanItem) {
    setItems(p => p.filter(i => i.id !== item.id));
    await supabase.from('plan_items').delete().eq('id', item.id);
  }

  async function addItem(date: string, title: string, category: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const maxPos = Math.max(0, ...items.filter(i => i.date === date).map(i => i.position));
    const row = {
      trip_id: tripId, date, time: null,
      title, notes: '', category, done: false,
      position: maxPos + 1, created_by: user?.id ?? null,
    };
    const { data, error } = await supabase.from('plan_items').insert(row).select().single();
    if (!error && data) setItems(p => [...p, data as PlanItem]);
  }

  // stops sorted by distance
  const stopsWithDist: StopWithDist[] = stops.map(s => ({
    ...s,
    km: Math.round(haversineKm(baseCampLat, baseCampLng, Number(s.lat), Number(s.lng))),
    weather: stopWeather(s.category),
  })).sort((a, b) => a.km - b.km);

  const explored = doneItems.length;
  const R = 42, C = 2 * Math.PI * R;
  const pct = stopsCount ? explored / stopsCount : 0;

  return (
    <>
      <div className="large-title">
        <h1>Plan</h1>
        <div className="lt-sub">Day-by-day · Black Forest</div>
      </div>

      {/* ── Hero ── */}
      <div className="plan-hero">
        <div className="cuckoo-house" aria-hidden="true">
          <span className="roof" /><span className="door" />
        </div>
        <div className="plan-hero-row">
          <div className="pring">
            <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
              <circle className="pring-track" cx="48" cy="48" r={R} fill="none" strokeWidth="8" />
              <circle className="pring-val"   cx="48" cy="48" r={R} fill="none" strokeWidth="8"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
            </svg>
            <div className="pring-label">
              <div className="pring-num tnum">{explored}<span className="of">/{stopsCount}</span></div>
              <div className="pring-cap">explored</div>
            </div>
          </div>
          <div className="plan-hero-info">
            <div className="plan-hero-eyebrow">Daily planner</div>
            <div className="plan-hero-title">What&apos;s the plan?</div>
            <div className="plan-hero-sub">
              {explored === 0
                ? 'Pick tomorrow\'s adventure below.'
                : explored >= stopsCount
                  ? 'Every spot explored — legends.'
                  : `${stopsCount - explored} spots still to discover.`}
            </div>
            <div className="streak-chip">
              <span className="fl">🔥</span>
              {plannedDays} {plannedDays === 1 ? 'day' : 'days'} planned
            </div>
          </div>
        </div>
      </div>

      {/* ── Badges ── */}
      <div className="badge-wrap">
        <div className="badge-strip">
          {BADGES.map(b => {
            const on = earned.has(b.key);
            return (
              <button key={b.key} className={`badge${on ? ' earned' : ''}`}
                onClick={() => setSelBadge(selBadge === b.key ? null : b.key)}>
                <span className="badge-coin">
                  {b.emoji}
                  {!on && <span className="badge-lock"><i className="ti ti-lock" /></span>}
                </span>
                <span className="badge-name">{b.name}</span>
              </button>
            );
          })}
        </div>
        {selBadge && (() => {
          const b = BADGES.find(x => x.key === selBadge)!;
          return (
            <div className="badge-caption">
              <span className="em">{b.emoji}</span>
              <span><b>{b.name}</b> — {b.desc}. {earned.has(b.key) ? 'Unlocked!' : 'Locked.'}</span>
            </div>
          );
        })()}
      </div>

      {/* ── Day cards ── */}
      <div style={{ paddingBottom: 8 }}>
        {dates.map((date, i) => {
          const isOpen    = !collapsed[date];
          const anchors   = getAnchors(date, startDate);
          const tag       = dayTag(i, dates.length);
          const p         = parts(date);
          const dayItems  = items.filter(it => it.date === date).sort((a,b)=>a.position-b.position);
          const doneCount = dayItems.filter(i => i.done).length;
          const dayDone   = dayItems.length > 0 && doneCount === dayItems.length;
          const dayWx     = wx?.[date];
          const m         = wxMood(dayWx);
          const wxCls     = dayWx ? (m.key==='indoor'?'wx-rain':m.key==='outdoor'?'wx-sun':'') : '';

          return (
            <div key={date} className={`card day-card${collapsed[date] ? ' collapsed' : ''}`}>
              <button className="day-head"
                onClick={() => setCollapsed(c => ({ ...c, [date]: !c[date] }))}>
                <div className={`day-datebox${dayDone ? ' done' : ''}`}>
                  <div className="day-dow">{p.wd}</div>
                  <div className="day-dnum tnum">{p.day}</div>
                </div>
                <div className="day-headmid">
                  <div className="day-title">Day {i+1} · {tag}</div>
                  <div className="day-meta">
                    {dayItems.length === 0
                      ? (anchors.length ? 'Fixed plan' : 'Nothing planned yet')
                      : `${doneCount} of ${dayItems.length} done`}
                  </div>
                </div>
                <span className={`day-wx${wxCls ? ' '+wxCls : ''}`}>
                  <span className="em">{wxEmoji(dayWx)}</span>
                  {dayWx?.hi != null ? `${dayWx.hi}°` : 'soon'}
                </span>
                <span className="day-chev"><i className="ti ti-chevron-right" /></span>
              </button>

              {isOpen && (
                <div className="day-body">
                  <div className="day-sep" />
                  {anchors.map(a => (
                    <div key={a.id} className="anchor">
                      <span className="anchor-em">{a.emoji}</span>
                      <span className="anchor-body">
                        <span className="anchor-text">{a.text}</span>
                        <span className="anchor-sub"><i className="ti ti-lock" />Fixed</span>
                      </span>
                    </div>
                  ))}
                  {dayItems.map(item => {
                    const cat   = item.category as StopCategory;
                    const color = CATEGORY_COLOR[cat] ?? '#888';
                    const emoji = CATEGORY_EMOJI[cat] ?? '📍';
                    return (
                      <div key={item.id} className={`pitem${item.done ? ' done' : ''}`}>
                        <button className={`pitem-check${item.done ? ' done' : ''}`}
                          onClick={() => toggleDone(item)} aria-label="Toggle done">
                          <i className={`ti ${item.done ? 'ti-circle-check-filled' : 'ti-circle'}`} />
                        </button>
                        <span className="pitem-em" style={{ background: color }}>{emoji}</span>
                        <span className="pitem-body">
                          <span className="pitem-text">{item.title}</span>
                          <span className="pitem-meta">{CATEGORY_LABEL[cat] ?? cat}</span>
                        </span>
                        <button className="pitem-del" onClick={() => delItem(item)} aria-label="Remove">
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    );
                  })}
                  {dayItems.length === 0 && anchors.length === 0 && (
                    <div className="day-empty">Open this day and add your first plan.</div>
                  )}
                  <button className="day-add" onClick={() => setDrawer({ date, idx: i, tag })}>
                    <i className="ti ti-plus" />Add to this day
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Drawer ── */}
      {drawer && (
        <AddDrawer
          date={drawer.date} idx={drawer.idx} tag={drawer.tag}
          wx={wx?.[drawer.date] ?? null}
          stops={stopsWithDist}
          dayItems={items.filter(i => i.date === drawer.date)}
          onAdd={addItem}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* ── Confetti ── */}
      <CuckooStage burst={burst} />
    </>
  );
}
