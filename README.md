# SYNFX AI Upscaler — Frontend

React + Vite single-page app for the SYNFX AI image upscaler. Auth, credit-based
upscaling (Clarity Upscaler / Real-ESRGAN), job history, and Stripe credit packs.
The backend (Supabase Edge Functions + Postgres + Stripe) is already deployed.

## Stack

- React 18 + Vite 5
- `@supabase/supabase-js` for auth and DB queries
- No CSS framework — hand-rolled dark theme in `src/index.css`

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Configuration

Supabase connection values live in `.env` (see `.env.example`). These are the
**publishable** anon key and project URL — both are safe to expose in the browser.
If `.env` is absent, the values are also baked in as defaults in
`src/lib/supabase.js`, so the app builds and runs without any env setup.

```
VITE_SUPABASE_URL=https://pwzdwiccwcobojexlcnj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

## Deployment

Either platform works; the repo includes config for both.

### Vercel
- Import the repo, framework preset **Vite** (auto-detected via `vercel.json`).
- Build command `npm run build`, output dir `dist`.
- Env vars are optional (defaults are baked in) but you can set the two `VITE_`
  vars above under Project → Settings → Environment Variables.

### Netlify
- `netlify.toml` sets build command, publish dir, and the SPA redirect.
- Import the repo or drag-and-drop the `dist/` folder onto Netlify.

## App structure

```
src/
  lib/supabase.js         Supabase client, functions URL, Stripe price IDs
  components/
    Auth.jsx              Email/password login + signup (3 free credits)
    Upscaler.jsx          Upload, engine/scale, upscale call, before/after
    History.jsx           Past jobs from upscale_jobs + signed download links
    BuyCredits.jsx        Starter/Pro/Studio packs → Stripe Checkout
    Account.jsx           Email, plan, balance, sign out
    BrandMark.jsx         Logo mark
  App.jsx                 Session, credit state, tab routing, checkout return
```

## Business logic notes

- New users automatically receive 3 free credits (Postgres trigger on signup).
- Accounts with `role = 'owner'` upscale for free; everyone else spends 1 credit
  per upscale. Set your own account to owner in Supabase → Table editor →
  `profiles` → set `role` to `owner`.
- The `upscale` edge function is synchronous: it uploads, calls Replicate, polls
  to completion, and returns `{ job_id, status, download_url, engine, scale }`.
  A single request can take 30–120s; the UI shows a live progress state.

## Known backend caveat (not fixed here — frontend-only task)

`create-checkout` sets Stripe's `success_url`/`cancel_url` to
`.../functions/v1/payment-success` and `.../payment-cancel`, but those two edge
functions are **not deployed** (only `upscale`, `create-checkout`,
`stripe-webhook`, `check-setup` exist). So after paying, the user lands on a
Supabase 404. Credits are still granted correctly by the `stripe-webhook`
function, and the balance updates when the user returns to the app. To give a
clean post-payment landing, deploy small `payment-success`/`payment-cancel`
functions (or repoint those URLs back to this app with `?checkout=success`,
which `App.jsx` already handles).
```
