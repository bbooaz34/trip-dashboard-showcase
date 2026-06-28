'use client';

import { useEffect, useState } from 'react';
import { fetchWeather, weatherCodeInfo, type WeatherData } from '@/lib/openmeteo';
import { recommendAttraction, type TipStop, type TripTip } from '@/lib/tripTips';
import { CATEGORY_EMOJI, CATEGORY_COLOR, CATEGORY_LABEL, googleMapsUrl } from '@/lib/stops';

function TipCard({ tip }: { tip: TripTip }) {
  return (
    <div className="tip-card">
      <div className="tip-emoji" style={{ background: CATEGORY_COLOR[tip.stop.category] }}>
        {CATEGORY_EMOJI[tip.stop.category] ?? '📍'}
      </div>
      <div className="tip-body">
        <div className="tip-head">
          <i className={`ti ${tip.icon}`} /> {tip.headline}
        </div>
        <div className="tip-name">{tip.stop.name}</div>
        <div className="tip-cat" style={{ color: CATEGORY_COLOR[tip.stop.category] }}>
          {CATEGORY_LABEL[tip.stop.category]}
        </div>
        <div className="tip-blurb">{tip.blurb}</div>
        <a
          className="tip-link"
          href={googleMapsUrl(tip.stop.lat, tip.stop.lng)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="ti ti-map-pin" /> Directions
        </a>
      </div>
    </div>
  );
}

export default function WeatherPage() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stops, setStops] = useState<TipStop[]>([]);
  const [showTomorrow, setShowTomorrow] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const w = await fetchWeather();
      setData(w);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Load attractions once for the daily tip
  useEffect(() => {
    fetch('/stops.geojson')
      .then(r => r.json())
      .then(geo => {
        const list: TipStop[] = geo.features.map((f: any) => ({
          id: f.properties.id,
          name: f.properties.name,
          category: f.properties.category,
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        }));
        setStops(list);
      })
      .catch(() => {});
  }, []);

  const cur   = data?.current;
  const daily = data?.daily ?? [];
  const info  = cur ? weatherCodeInfo(cur.weatherCode) : null;

  const tip = cur && stops.length
    ? recommendAttraction(
        { code: cur.weatherCode, temp: cur.temp, rainProb: daily[0]?.rainProbability ?? 0 },
        stops,
      )
    : null;

  // Tomorrow's plan — based on the forecast, picked one day ahead.
  const tmrw = daily[1];
  const tomorrow = new Date(Date.now() + 86_400_000);
  const tomorrowTip = tmrw && stops.length
    ? recommendAttraction(
        { code: tmrw.weatherCode, temp: tmrw.tempMax, rainProb: tmrw.rainProbability ?? 0 },
        stops,
        tomorrow,
      )
    : null;
  const tmrwLabel = tmrw
    ? new Date(tmrw.date).toLocaleDateString('en-GB', { weekday: 'long' })
    : '';
  const tmrwInfo = tmrw ? weatherCodeInfo(tmrw.weatherCode) : null;

  const allTemps = daily.flatMap(d => [d.tempMax, d.tempMin]);
  const minT = allTemps.length ? Math.min(...allTemps) : 0;
  const maxT = allTemps.length ? Math.max(...allTemps) : 1;

  const uvPct = cur ? Math.min(100, Math.round((cur.uvIndex / 11) * 100)) : 0;

  const updatedLabel = data
    ? `Updated ${new Date(data.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : '';

  return (
    <>
      <div className="photo-header">
        <img src="/assets/titisee-lake.png" alt="" />
        <div className="ph-scrim" aria-hidden="true" />
        <div className="ph-title">
          <h1>Weather</h1>
          <div className="lt-sub">Titisee-Neustadt</div>
        </div>
      </div>

      {/* Hero */}
      <div className="wx-hero">
        <div className="wx-loc">Titisee-Neustadt</div>
        <div className="wx-temp tnum">{cur ? `${cur.temp}°` : '—°'}</div>
        <div className="wx-desc">
          <i className={`ti ${loading ? 'ti-loader-2' : (info?.icon ?? 'ti-cloud')}`}
             style={loading ? { animation: 'spin 0.9s linear infinite' } : undefined} />
          {' '}{error ? 'Weather unavailable.' : (loading ? 'Loading…' : info?.label)}
        </div>
        {daily[0] && (
          <div className="wx-hilo tnum">H:{daily[0].tempMax}° L:{daily[0].tempMin}°</div>
        )}
        {updatedLabel && <div className="wx-updated">{updatedLabel}</div>}
      </div>

      {/* Daily trip tip — weather-based attraction pick */}
      {tip && (
        <div className="group">
          <div className="group-header">Today&apos;s trip tip</div>
          <TipCard tip={tip} />
        </div>
      )}

      {/* Plan tomorrow — user-triggered, based on the forecast */}
      {tomorrowTip && (
        <div className="group">
          {!showTomorrow ? (
            <button className="tip-plan-btn" onClick={() => setShowTomorrow(true)}>
              <i className="ti ti-calendar-plus" />
              <span>Plan for tomorrow</span>
              {tmrwInfo && (
                <span className="tip-plan-meta">
                  <i className={`ti ${tmrwInfo.icon}`} /> {tmrw.tempMax}°
                </span>
              )}
            </button>
          ) : (
            <>
              <div className="group-header">
                Tomorrow · {tmrwLabel} · {tmrwInfo?.label} {tmrw.tempMax}°/{tmrw.tempMin}°
              </div>
              <TipCard tip={tomorrowTip} />
            </>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="wx-grid">
        <div className="wx-tile">
          <div className="wx-tile-head"><i className="ti ti-droplet" /> Rain today</div>
          <div className="wx-tile-value tnum">{daily[0]?.rainProbability ?? '—'}<span className="unit">%</span></div>
        </div>
        <div className="wx-tile">
          <div className="wx-tile-head"><i className="ti ti-sun" /> UV index</div>
          <div className="wx-tile-value tnum">{cur?.uvIndex ?? '—'}</div>
          <div className="uv-bar">
            <span className="uv-knob" style={{ left: `${uvPct}%` }} />
          </div>
        </div>
        <div className="wx-tile">
          <div className="wx-tile-head"><i className="ti ti-wind" /> Wind</div>
          <div className="wx-tile-value tnum">{cur ? cur.windKmh : '—'}<span className="unit"> km/h</span></div>
        </div>
        <div className="wx-tile">
          <div className="wx-tile-head"><i className="ti ti-mist" /> Humidity</div>
          <div className="wx-tile-value tnum">{cur ? cur.humidity : '—'}<span className="unit">%</span></div>
        </div>
      </div>

      {/* 5-day forecast */}
      {daily.length > 0 && (
        <div className="group">
          <div className="group-header">5-day forecast</div>
          <div className="card">
            {daily.map((day, i) => {
              const d = new Date(day.date);
              const dayInfo = weatherCodeInfo(day.weatherCode);
              const label = i === 0 ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' });
              const isSun = dayInfo.icon === 'ti-sun' || dayInfo.icon === 'ti-sun-low';
              const isRain = dayInfo.icon.includes('rain') || dayInfo.icon.includes('storm');
              const iconCls = isSun ? ' sun' : isRain ? ' rain' : '';
              const leftPct  = maxT > minT ? ((day.tempMin - minT) / (maxT - minT)) * 100 : 0;
              const widthPct = maxT > minT ? ((day.tempMax - day.tempMin) / (maxT - minT)) * 100 : 50;
              return (
                <div key={day.date} className="fc-row">
                  <span className="fc-day">{label}</span>
                  <span className={`fc-ico${iconCls}`}><i className={`ti ${dayInfo.icon}`} /></span>
                  <span className="fc-lo tnum">{day.tempMin}°</span>
                  <span className="fc-track">
                    <span className="fc-fill" style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
                  </span>
                  <span className="fc-hi tnum">{day.tempMax}°</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        <button className="btn btn-gray" onClick={load} disabled={loading}>
          <i className="ti ti-refresh" /> {loading ? 'Refreshing…' : 'Refresh forecast'}
        </button>
      </div>
    </>
  );
}
