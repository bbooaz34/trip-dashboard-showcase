# Black Forest Dashboard v4 — Setup Guide

Get from zero to deployed in about 2 hours across 5 phases.

---

## Phase A — Supabase project (~20 min)

1. Go to https://supabase.com/dashboard → **New project**
   - Name: `black-forest`
   - Region: Frankfurt (`eu-central-1`) — closest to your trip
   - Save your database password somewhere safe

2. In the project, go to **SQL Editor** → paste the contents of `supabase/migrations/001_initial.sql` → **Run**

3. In **Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**keep secret**)

4. In **Authentication → Providers → Email**, make sure **Enable email confirmations** is ON and **Passwordless / Magic Link** is enabled.

---

## Phase B — MapTiler key (~5 min)

1. Create a free account at https://cloud.maptiler.com/
2. **Keys → New key** — name it "Black Forest App"
3. Add your Vercel domain as an allowed origin (fill in after Phase D)
4. Copy the key → `NEXT_PUBLIC_MAPTILER_KEY`

---

## Phase C — Local setup & seed (~20 min)

```bash
cd trip-dashboard
npm install
```

Copy `.env.local.example` to `.env.local` and fill in your 4 keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_MAPTILER_KEY=abc123...
```

**Sign yourself up first:**
```bash
npm run dev
```
Open http://localhost:3000, enter your email → click the magic link → you're authenticated.

**Get your user ID** — in the Supabase dashboard → Authentication → Users → copy your UUID.

**Edit `supabase/seed.sql`** — replace `<YOUR_USER_ID>` with your UUID.

**Run the seed** — paste the contents into the Supabase SQL editor → Run.

Reload http://localhost:3000 — it should redirect you to `/trip/<id>`.

---

## Phase D — Deploy to Vercel (~10 min)

```bash
git init
git add -A
git commit -m "v4 initial"
```

Push to a new GitHub repo (or GitLab / Bitbucket). Then:

1. Go to https://vercel.com → **New Project** → import your repo
2. **Environment Variables** — add all 4 keys from your `.env.local`
   - Also add `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app`
3. Click **Deploy**

Once deployed, copy the URL (e.g. `https://black-forest-abc123.vercel.app`) and:
- Add it as an allowed origin in MapTiler (Phase B step 3)
- Add it as a redirect URL in Supabase: **Authentication → URL Configuration → Redirect URLs** → add `https://your-app.vercel.app/**`

---

## Phase E — Invite your wife (~5 min)

1. Open the app on your phone → Settings tab → **Invite to trip**
2. Enter her email → **Send magic link**
3. She taps the link on her phone → she's in

**Install as PWA on both phones:**
- iOS: Tap Share → "Add to Home Screen"
- Android: Tap menu → "Add to home screen"

---

## Smoke test checklist (do this a week before the trip)

- [ ] Both phones can sign in and see the same trip
- [ ] Add a grocery item on phone A → appears on phone B within 1 second
- [ ] Map tab shows all 21 stops
- [ ] Tap a stop → bottom sheet with Google Maps + Waze buttons
- [ ] "Locate me" button shows blue dot (allow location when prompted)
- [ ] Flights, car, weather, notes all work
- [ ] Settings → Export downloads a JSON file
- [ ] Both phones have the PWA installed to home screen

---

## Troubleshooting

**Map shows blank / "no key":** Check `NEXT_PUBLIC_MAPTILER_KEY` is set in Vercel → redeploy.

**Magic link redirects to wrong URL:** Check `NEXT_PUBLIC_SITE_URL` in Vercel env and Supabase redirect URLs.

**Realtime not working:** In Supabase → Database → Replication → make sure `groceries`, `notes`, `frankfurt_items`, `car_state`, `refuels` are enabled. (The migration does this automatically, but verify.)

**"Not a trip member" error after invite:** Have your wife tap the magic link → she'll be automatically added. If still failing, check the seed.sql ran and the trip_members row exists for her.
