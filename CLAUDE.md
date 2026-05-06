# Nudgle

Appointment reminder SaaS for small service businesses. Reduces no-shows via email reminders + WhatsApp booking bot.

## Code Rules

- When creating a new function, always include a one-sentence explanation of what it does.
- When creating a new function successfully, type "operation complete" in the CLI.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Auth + DB:** Supabase (email/password auth, Postgres with RLS, custom SMTP via Resend)
- **Email:** Resend (verified domain `nudgle.co.uk`, sends from `reminders@nudgle.co.uk`, free tier 100/day + SMTP for auth emails)
- **SMS + WhatsApp:** Twilio (WhatsApp booking bot active, SMS reminders ready)
- **Payments:** Gumroad (2 subscription tiers, webhook at `/api/webhooks/gumroad`)
- **Hosting:** Vercel Hobby (https://nudgle.vercel.app)
- **Onboarding:** 3 steps (calendar → reminder method → activate) — no card collection, Gumroad handles payment externally

## Pricing Tiers

| | Starter | Business |
|---|---|---|
| **Price** | £39/mo | £79/mo |
| **Appointments** | 500/mo | 1,500/mo |
| **Channels** | Email + WhatsApp + SMS | Email + WhatsApp + SMS |
| **SMS cap** | 200/mo | 500/mo |
| **2h reminder** | Yes | Yes |
| **Google Calendar** | Yes | Yes |
| **Custom branding** | Yes | Yes |
| **Analytics** | Yes | Yes |
| **Rebook prompts** | Yes | Yes |
| **Staff members** | 1 | 5 |

- New users get a **14-day free trial** of Starter (no card upfront — Gumroad checkout only when upgrading)
- All reminder channels (email, WhatsApp, SMS) included free — no per-message charges
- `OWNER_EMAIL` env var auto-grants Business plan (skip payments for admin/testing)
- `PlanType`: `trial | starter | business` — defined in `src/lib/types.ts`

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes (dashboard, appointments, billing, settings)
│   ├── api/
│   │   ├── confirm/[id]/   # Email confirmation endpoint — Yes/No buttons update appointment status
│   │   ├── cron/reminders/ # Cron endpoint — sends 24h and 2h reminders (daily at 8am)
│   │   ├── google/         # Calendar OAuth callback + sync (not yet configured)
│   │   └── webhooks/       # Gumroad (payments) + Twilio (SMS replies + WhatsApp booking)
│   ├── auth/callback/      # Supabase auth callback
│   ├── book/[code]/        # Public booking page — shows business hours + "Book on WhatsApp" CTA
│   ├── login/
│   ├── signup/
│   └── onboarding/         # 3-step setup flow (calendar → reminder method → activate)
├── components/             # Shared components (app-nav, phone-input, trial-banner, loading-bar, pixel-octopus)
└── lib/
    ├── booking/            # WhatsApp booking bot (availability + conversation engine)
    ├── messaging/          # Email (Resend), SMS + WhatsApp (Twilio) send functions
    ├── supabase/           # Browser + server Supabase clients
    └── types.ts            # TypeScript types + PlanConfig + PLAN_LIMITS
```

## Key Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npx vercel --prod` — deploy to production (no git remote, direct CLI deploy)
- DB migrations: `supabase/migrations/001_initial_schema.sql` through `006_apply_missing.sql`
- **Always run new migrations in Supabase SQL Editor immediately after creating them** — 002-005 were missed, causing settings to break

## Important Notes

- External service clients (Twilio, Resend) are lazily initialised to avoid build-time errors when env vars are placeholders
- All API routes that use Supabase service role create the client inside the handler, not at module level
- `TWILIO_WHATSAPP_NUMBER` env var may include `whatsapp:` prefix — messaging code normalises it automatically
- Business name is saved to profiles on signup (trigger only creates basic profile; signup page updates business_name)
- Middleware allows unauthenticated access to: `/`, `/login`, `/signup`, `/book/*`, `/auth/callback`, `/onboarding`, `/api/*`
- Brand colors use custom Tailwind theme: `brand-50` through `brand-900` (orange/amber)
- Google Calendar integration built (`src/lib/google-calendar.ts`): reads busy times (FreeBusy API), writes/updates/deletes events on appointment changes. Needs Google Cloud project + OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) to activate. OAuth scope is `calendar` (full read/write access to all calendars). Settings page has connect/disconnect UI. Callback supports redirect to `/settings` or `/onboarding` via `state` param.
- Vercel cron limited to daily (8am) on Hobby plan — reminder windows widened (28h for 24h reminders, 4h for 2h) with `_sent` flag dedup
- Settings page server component must use `select("*")` not specific columns — avoids breakage if columns are missing
- **All server-rendered times must use business timezone** — use `toLocaleString("en-GB", { timeZone: tz })` not date-fns `format()` (which defaults to UTC on Vercel, causing times to be 1h off for BST users)
- Mobile-first design throughout
- Dashboard shows "Nudgle saved you £X" metric (confirmed appointments × average appointment value from settings)
- Trial is time-based only (14 days, no appointment cap) — dashboard + billing show "X days left" with progress bar; cron skips appointment limit for trial users
- Dashboard has two-column layout on desktop (lg+): week calendar left half (sticky), everything else right. Mobile unchanged.
- Week calendar is a time-grid layout (like Google Calendar) — hours 7AM–10PM on left axis, 7 day columns, events as positioned blocks sized by duration. Navigable via `?week=YYYY-MM-DD`, fullscreen toggle, current time indicator (orange line)
- Week calendar shows Nudgle appointments (green=confirmed, orange=pending, red=cancelled) + Google Calendar events (blue, if connected). Events synced to Nudgle (via `google_event_id`) are deduplicated. All-day Google events excluded. Nudgle events are clickable (link to detail), Google events are not.
- Week calendar handles overlapping events with side-by-side column layout (like Google Calendar) — 2 overlaps = 50% width each, 3 = 33%, etc.
- Week calendar event interaction: Desktop — hover shows opaque popout card with full details, click navigates to appointment. Mobile — first tap expands popout, second tap navigates. Tap outside to dismiss. Google Calendar events show "Google Calendar" label, Nudgle events show status.
- Google Calendar fetches events from ALL user calendars (not just primary) — uses calendarList API to discover calendars, then fetches events from each in parallel
- New appointment form checks for Google Calendar conflicts before creating — shows amber warning with conflicting event names/times, user can "Add anyway" or "Change time". Check endpoint at `/api/google/check-conflicts`
- `google_calendar_blocks_slots` profile column (migration 007) — toggle in settings controls whether Google Calendar busy times block WhatsApp booking slots. Default true (blocks). Turn off if business has staff who can cover.
- Dashboard calendar days (today + future) are clickable — link to /appointments/new?date=YYYY-MM-DD
- New appointment form has "Remind via" selector — WhatsApp/SMS marked "Coming soon", email is default until Twilio WhatsApp Business API approved
- Appointment detail page has inline edit form (expand/collapse) for updating client details, date/time, duration
- Trial banner on all authenticated pages (subtle → urgent → expired states)
- Cron reminders enforce plan-level channel restrictions and SMS caps with automatic fallback (SMS cap hit → WhatsApp → email; no phone number → email)
- Reminder emails include Yes/No confirmation buttons (stacked, full-width) linking to `/api/confirm/[id]?response=yes|no` — Yes sets status to "confirmed", No sets status to "cancelled" + creates confirmations record
- Appointments list page shows status badges: Confirmed (green), Cancelled (red), No response (red), Pending (amber)
- Cron endpoint returns `debug` array with per-appointment trace (profile state, channel resolution, send result) for troubleshooting
- Gumroad webhook maps product IDs via `GUMROAD_STARTER_PRODUCT_ID` and `GUMROAD_BUSINESS_PRODUCT_ID` env vars
- Orange loading bar on page transitions + spinner on logout button
- Onboarding is 3 steps (no card collection) — completion message mentions both reminders and WhatsApp booking
- Settings page has back arrow to dashboard and floating toast on save
- WhatsApp booking CTA on dashboard uses green-only styling (no orange/brand) — positioned as #1 tool
- Booking agent is WhatsApp-only — no SMS/email agents (SMS too expensive for multi-message flows, email wrong medium)
- Gumroad product IDs are base64-encoded strings (not URL slugs) — found via webhook debug logging
- Gumroad seller ID is also base64-encoded — `GUMROAD_SELLER_ID` env var must match exactly including `==` suffix

## Temporarily Disabled

- **Email confirmation on signup** — disabled in Supabase Auth settings. Resend SMTP configured, `nudgle.co.uk` domain verified. Re-enable when ready.

## WhatsApp Booking Bot

- Clients book via a wa.me link shared by the business (pre-fills "BOOK {code}")
- Public booking page at `/book/[code]` — shows business name, hours, and "Book on WhatsApp" button
- Menu-driven flow: pick day → pick time → confirm → booked (no LLM needed, zero API cost)
- Conversation state tracked in `conversations` table, expires after 1 hour of inactivity
- Availability calculated from `business_hours` table + existing appointments, timezone-aware
- All time calculations use the business's `timezone` field (stored in profiles, default `Europe/London`)
- Business configures hours + duration + timezone + booking toggle in /settings
- Settings shows two shareable links: public booking page URL + direct WhatsApp link
- Each business gets a unique 6-char booking code (stored in `profiles.booking_code`)
- Twilio webhook (`/api/webhooks/twilio`) handles both SMS confirmations and WhatsApp booking
- WhatsApp detected via `whatsapp:` prefix in Twilio's `From` field
- Appointments created via bot are auto-confirmed (status: "confirmed")
- Currently using Twilio WhatsApp Sandbox (free) — number `+14155238886` — requires `join <sandbox-name>` every 72h
- WhatsApp Business API setup in progress (Twilio paid upgrade + Meta Business verification via dad's ID) — once approved, update `TWILIO_WHATSAPP_NUMBER` env var
- Appointment overlap prevention on both create and edit forms — checks existing non-cancelled appointments for time conflicts
- Reminder emails include "Please do not reply" footer (Resend doesn't receive inbound email)
