# MIS — Lead Provider Portal (Frontend)

Next.js 14 frontend for the MIS portal. External **lead providers** sign in to see how
the leads they supplied perform across two CRMs (**FundMyCampus** `fmc` + **Admitverse** `av`),
and an **internal admin** area manages providers, maps CRM sources and sets targets.

It talks **only** to the MIS FastAPI backend, through a same-origin BFF proxy. The backend reads
the CRMs **live** on every request (no sync), so data is always current and mapping a CRM source
to a partner takes effect immediately.

## Architecture

```
Browser (Axios → /api/*)  ─┐
                           ├─►  Next.js route handlers  ─►  FastAPI backend
httpOnly cookie mis_token ─┘     (read cookie, add        (Bearer JWT auth,
                                  Authorization: Bearer)    provider-scoped)
```

- The JWT lives in an **httpOnly, Secure, SameSite=Lax** cookie (`mis_token`) — never in
  `localStorage`, never readable from JS. A non-sensitive `mis_role` cookie powers middleware/UI.
- All client calls hit the same-origin proxy at `/api/*`; the proxy injects the Bearer and
  streams responses back (including CSV downloads). On a backend `401` it clears cookies so the
  client bounces to `/login`.
- The client **never** sends `provider_id` — the backend derives scope from the JWT. The UI only
  sends filters (brand, date range, stage, search, paging).
- `middleware.ts` gatekeeps routes by cookie + role; the proxy and backend remain the real authority.
- No hard-coded thresholds: targets/grades/bands come from the backend; the UI only formats them.
- **Live data:** requests take ~1–2 s, so every panel has a skeleton and nothing auto-refetches more
  often than every ~45 s. A `503` means a CRM is briefly unreachable: the panel shows "Data source
  temporarily unavailable" with Retry, and a failed refresh keeps the last data on screen
  (`lib/use-last-good.ts`, `components/query-error.tsx`). Only `401` sends the user to `/login`.
- **Admins are company-scoped.** Login/`me` return a `brand`: `null` = super-admin (sees both
  companies + the `/admin/admins` management screen + a FMC/AV/Both switcher), `"fmc"`/`"av"` =
  company admin locked to one company. A readable `mis_brand` cookie powers middleware/UI scoping;
  the frontend never sends `brand` to scope data — the token does. Providers belong to one company too.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui-style primitives ·
TanStack Query · Axios · Recharts · lucide-react · date-fns · react-hook-form + zod · sonner.

## Getting started

```bash
cp .env.example .env.local       # set API_URL to your backend
npm install
npm run dev                      # http://localhost:3000
```

### Environment

| Var       | Scope        | Purpose                                                        |
|-----------|--------------|----------------------------------------------------------------|
| `API_URL` | server-only  | FastAPI backend origin. **Not** `NEXT_PUBLIC` — stays private. |

On Vercel set `API_URL` to the deployed backend URL. Cookies are marked `Secure` automatically
in production (`NODE_ENV=production`).

## Project layout

- `app/(portal)/` — provider area: `dashboard`, `leads`, `payout` (FMC partner earnings).
- `app/(admin)/admin/` — `providers`, `providers/[id]` (Details + Payouts tabs), `leaderboard`,
  `targets`, `admins` (super-admin only). `/admin/sync` just redirects (nothing to sync).
- `app/api/` — BFF: `auth/login`, `auth/logout`, `[...path]` catch-all proxy (server-only).
- `lib/` — `types.ts` (mirrors backend 1:1), `api.ts`, `queries.ts`, `filters.ts`, `format.ts`,
  `tokens.ts` (stage/grade colors).
- `components/` — `ui/` primitives, `shell/`, `charts/`, plus KPI/badge/table/scorecard pieces.

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
