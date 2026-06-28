'use client';

import { useEffect, useState } from 'react';
import { fetchWeather, weatherCodeInfo } from '@/lib/openmeteo';
import { cacheGet, cacheSet } from '@/lib/localCache';

export default function WeatherQuickTile() {
  const [temp, setTemp] = useState<number | null>(null);
  const [desc, setDesc] = useState('Loading…');
  const [icon, setIcon] = useState('ti-cloud');

  useEffect(() => {
    const cached = cacheGet('weather', null as { temp: number; desc: string; icon: string } | null);
    if (cached) {
      setTemp(cached.temp);
      setDesc(cached.desc);
      setIcon(cached.icon);
    }

    fetchWeather().then(data => {
      const info = weatherCodeInfo(data.current.weatherCode);
      setTemp(data.current.temp);
      setDesc(info.label);
      setIcon(info.icon);
      cacheSet('weather', { temp: data.current.temp, desc: info.label, icon: info.icon });
    }).catch(() => {
      if (!cached) setDesc('Unavailable');
    });
  }, []);

  return (
    <div
      className="widget on-color"
      style={{
        background:
          'radial-gradient(130% 100% at 80% -20%, rgba(255,255,255,0.30), transparent 55%),' +
          'linear-gradient(165deg, #54A4E0 0%, #3D7FC2 62%, #2C5C97 100%)',
      }}
    >
      <div className="wg-head">
        <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
        <span className="wg-label">Titisee</span>
      </div>
      <div className="wg-big tnum">{temp !== null ? `${temp}°` : '—°'}</div>
      <div className="wg-sub">{desc}</div>
    </div>
  );
}
