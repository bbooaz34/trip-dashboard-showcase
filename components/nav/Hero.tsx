'use client';

import { useEffect, useState } from 'react';

const TRIP_START = '2026-07-06';
const TRIP_END   = '2026-07-13';

function daysUntil(dateStr: string): number {
  const now    = new Date();
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function tripDayLabel(): string {
  const days = daysUntil(TRIP_START);
  if (days > 0) return `${days} days to go`;
  const elapsed = Math.abs(daysUntil(TRIP_START));
  const total   = Math.abs(daysUntil(TRIP_END) - daysUntil(TRIP_START)); // ≈8
  if (elapsed <= total) return `Day ${elapsed + 1} of 8`;
  return 'Trip ended';
}

function countdownNumber(): number | string {
  const days = daysUntil(TRIP_START);
  return Math.abs(days);
}

function countdownLabel(): string {
  const days = daysUntil(TRIP_START);
  if (days > 0) return 'days to go';
  if (days === 0) return 'today!';
  const tripDone = daysUntil(TRIP_END);
  if (tripDone >= 0) return 'on trip';
  return 'days ago';
}

export default function Hero() {
  const [, forceRender] = useState(0);

  // Re-render every minute to keep countdown fresh
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-label">Family road trip</div>
        <h1>Black Forest</h1>
        <div className="hero-dates">Mon 6 Jul → Mon 13 Jul · 8 days</div>
      </div>
      <div className="hero-cd">
        <div className="hero-cd-num">{countdownNumber()}</div>
        <div className="hero-cd-lbl">{countdownLabel()}</div>
      </div>
    </section>
  );
}
