'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  href: string;
  icon: string;
  label: string;
  match: string;
}

interface BottomTabBarProps {
  tripId: string;
}

export default function BottomTabBar({ tripId }: BottomTabBarProps) {
  const pathname = usePathname();
  const base = `/trip/${tripId}`;

  const tabs: Tab[] = [
    { href: base,                icon: 'ti-home',       label: 'Home',    match: `${base}` },
    { href: `${base}/flights`,   icon: 'ti-plane',      label: 'Flights', match: '/flights' },
    { href: `${base}/car`,       icon: 'ti-car',        label: 'Car',     match: '/car' },
    { href: `${base}/weather`,   icon: 'ti-cloud',      label: 'Weather', match: '/weather' },
    { href: `${base}/plan`,      icon: 'ti-calendar',   label: 'Plan',    match: '/plan' },
    { href: `${base}/map`,       icon: 'ti-map',        label: 'Map',     match: '/map' },
  ];

  function isActive(tab: Tab) {
    if (tab.match === base) return pathname === base;
    return pathname.includes(tab.match);
  }

  return (
    <div className="tabbar">
      <div className="tabbar-caps lg">
        {tabs.map(tab => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`tab${active ? ' active' : ''}`}
              aria-label={tab.label}
            >
              {active && <span className="tab-sel" />}
              <i className={`ti ${tab.icon}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
