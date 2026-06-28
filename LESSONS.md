# LESSONS — the `never`-type build failure (resolved)

## What actually caused it

Two independent bugs were stacked, and the loud one masked the real one.

1. **Dead import path (real, but not the `never` cause).**
   `lib/supabase/server.ts` and `lib/supabase/client.ts` imported the `Database`
   type from `@/lib/database.types` — a file that does **not exist**. The generated
   types live at `lib/supabase/types.ts`. Earlier fix cycles moved the file but never
   updated these two imports. Fixed by pointing both at `@/lib/supabase/types`.

2. **Supabase dependency version skew (the actual `never` cause).**
   `package.json` had `@supabase/supabase-js: ^2.45.4`, so `npm install` floated it
   up to **2.106.2**, while `@supabase/ssr` stayed pinned at **0.5.2**.

   supabase-js **2.106** added a new generic type parameter to `SupabaseClient`
   (`SchemaNameOrClientOptions`, for `PostgrestVersion`). `@supabase/ssr@0.5.2` still
   instantiates `SupabaseClient<Database, SchemaName, Schema>` with the **old 3-arg
   arity**, so the schema object lands in the `SchemaName` (string) slot and the real
   `Schema` generic collapses to **`never`**. Result: every
   `supabase.from(...).select(...)` row resolved to `never` — across `app/page.tsx`,
   `trip/[id]/page.tsx`, `notes/page.tsx`, `ListClient`, `NotesClient`, `CarClient`,
   and the `middleware.ts` cookie options.

   None of the five hypotheses in DEBUG_SPEC.md caught this, because they all assumed
   the bug was in *our* files or the generated types. It was in the gap between two
   third-party package versions.

## The fix that was applied

- Corrected the dead import path in both client factories.
- In `lib/supabase/server.ts` / `client.ts`: call the `@supabase/ssr` factories
  **without** the `<Database>` generic (so ssr's malformed instantiation defaults to
  `any` instead of `never`), and re-bind precise typing via an explicit
  `SupabaseClient<Database>` **return-type annotation**. No `as any` / `as unknown as`
  casts — the public surface is the real generated `Database` type.
- `middleware.ts`: typed the degraded `setAll(cookiesToSet)` param explicitly.
- `ListClient.tsx`: removed the `from(table as never)` hacks; narrowed inserts on the
  literal table name (only `groceries` has a `market` column, `frankfurt_items` does not).
- Derived `CarState` / `Refuel` aliases in `lib/types.ts` from the generated `Database`
  type and repointed `CarClient.tsx` (they were never exported from the generated file).
- **Pinned `@supabase/ssr` and `@supabase/supabase-js` to exact versions** in
  `package.json` so they can never drift apart again.

## The permanent fix (do this when you have a moment)

Upgrade `@supabase/ssr` to a version built against supabase-js 2.106+, then you can
delete the workaround and restore the `<Database>` generic on the ssr calls:

```bash
npm install @supabase/ssr@latest
# restore createServerClient<Database>(...) / createBrowserClient<Database>(...)
npm run build   # confirm green
```

## Process lessons

- When the same error hits 4+ files, the cause is upstream — and "upstream" can mean a
  **third-party version mismatch**, not just your own type graph. Check installed
  versions (`npm ls @supabase/ssr @supabase/supabase-js`), not just your source.
- Caret (`^`) ranges on tightly-coupled packages (a library and its peer) let one float
  while the other stays put. Pin coupled packages together.
- A failing import path produces a *different* symptom (`Cannot find module` / silent
  `any`) than a generic-arity skew (`never`). They looked similar; they weren't.
- `tsc --noEmit` reproduces Next's "checking validity of types" gate in ~10s — use it
  instead of waiting on full `next build` cycles.
