# Black Forest · Trip Dashboard

A full-stack, multi-user, installable trip-planning app for a family road trip to the Black Forest, Germany — built end-to-end **by someone with no prior coding or DevOps experience**, using Claude (including **Claude Design** connected to this repo, and the **Supabase MCP** in the development loop).

It pulls everything a trip needs into one phone-native app: flights with **live status**, the rental car with a fuel/consumption tracker, weather with a weather-aware daily suggestion, shared shopping lists, a day planner, and an interactive map of 21 attractions.

> This is a **public showcase** copy. All personal trip data (booking references, the rental voucher link, the exact base-camp address, and personal account identifiers) has been removed or replaced with placeholders. To run it yourself, follow `SETUP.md` with your own keys.

---

## Highlights

- **Zero-to-production with no engineering background** — a real Next.js + Supabase app, live on Vercel, installable to the home screen.
- **Code ↔ design in one loop** — the repo was connected to **Claude Design**; the UI was mirrored into a canvas from the code, an **iOS 26 "UIKit" design system** was attached, and applied straight back onto the product.
- **iOS 26 "Liquid Glass" interface** — authentic Apple system colors, typography, radii, and a frosted-glass material, all defined as design tokens.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Hosting | Vercel (auto-deploy on push; build SHA baked into the bundle) |
| Database / Auth / Realtime | Supabase (Postgres + RLS + passwordless magic-link auth) |
| Maps | MapLibre GL JS + MapTiler tiles + OpenStreetMap (Nominatim) POIs |
| Weather | Open-Meteo (no API key), server-side proxy with edge caching |
| Live flight status | Israel Airports Authority open data (data.gov.il) |
| PWA | Web App Manifest + Apple touch icons (standalone home-screen app) |
| Dev tooling | Supabase MCP wired via `.mcp.json` |

## Features

- **Home** — bento-grid dashboard: weather, fuel %, next flight, list counts, days-to-go countdown.
- **Flights** — boarding-pass cards with a **live status badge** (on-time / boarding / delayed / departed / landed), estimated time, terminal, and check-in desk — activated when a flight is within a day of departure.
- **Car** — circular fuel gauge, range estimate, and a refuel logger that computes real L/100km from odometer history.
- **Weather** — current + 5-day forecast, plus a rule-based daily attraction suggestion driven by conditions.
- **Plan** — day-by-day itinerary over the trip skeleton.
- **Map** — all 21 attractions categorized with colors/emoji/icons, live OSM POI overlays, distance-from-base, custom GeoJSON import layers, and one-tap Google Maps / Waze navigation.

## Architecture notes

- Every table has **Row Level Security**; a user only sees data for trips they belong to.
- List/state tables use Supabase **Realtime**, so a change on one phone appears on another in ~1s.
- API routes proxy external services so keys stay server-side and responses are cached at the edge.

## Run it yourself

See **`SETUP.md`** — about two hours from zero to deployed (Supabase project, MapTiler key, local seed, Vercel deploy, invite a second user). You'll need your own Supabase and MapTiler keys in `.env.local` (template in `.env.local.example`).

## A debugging story

**`LESSONS.md`** documents a deployment-blocking TypeScript error (every Supabase query resolving to `never`) that turned out to be a **version skew between two coupled packages**, not a bug in the app code — and the fix and the lesson learned.

---

*Built with Claude.*
