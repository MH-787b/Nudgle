# Nudgle

Appointment reminder SaaS for small service businesses. Reduces no-shows via email reminders + WhatsApp booking bot.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Auth + DB:** Supabase (email/password auth, Postgres with RLS, custom SMTP via Resend)
- **Email:** Resend (free tier, 100/day + SMTP for auth emails)
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
- Google Calendar integration partially scaffolded (`src/app/api/google/`) but not configured — planned for: read busy times (booking agent), write bookings, future auto-import
- Vercel cron limited to daily (8am) on Hobby plan — reminder windows widened (28h for 24h reminders, 4h for 2h) with `_sent` flag dedup
- Settings page server component must use `select("*")` not specific columns — avoids breakage if columns are missing
- Reminder messages use business timezone via `timeZone` option in `toLocaleString`
- Mobile-first design throughout
- Dashboard shows "Nudgle saved you £X" metric (confirmed appointments × average appointment value from settings)
- Trial users see appointments used (not days left) on both dashboard and billing; paid users see appointment usage bar
- Dashboard calendar days (today + future) are clickable — link to /appointments/new?date=YYYY-MM-DD
- New appointment form has "Remind via" selector (WhatsApp/SMS/Email) with contact field validation
- Trial banner on all authenticated pages (subtle → urgent → expired states)
- Cron reminders enforce plan-level channel restrictions and SMS caps with automatic fallback (SMS cap hit → WhatsApp → email)
- Gumroad webhook maps product IDs via `GUMROAD_STARTER_PRODUCT_ID` and `GUMROAD_BUSINESS_PRODUCT_ID` env vars
- Orange loading bar on page transitions + spinner on logout button
- Onboarding is 3 steps (no card collection) — completion message mentions both reminders and WhatsApp booking
- Settings page has back arrow to dashboard and floating toast on save
- WhatsApp booking CTA on dashboard uses green-only styling (no orange/brand) — positioned as #1 tool
- Booking agent is WhatsApp-only — no SMS/email agents (SMS too expensive for multi-message flows, email wrong medium)
- Gumroad product IDs are base64-encoded strings (not URL slugs) — found via webhook debug logging
- Gumroad seller ID is also base64-encoded — `GUMROAD_SELLER_ID` env var must match exactly including `==` suffix

## Temporarily Disabled

- **Email confirmation on signup** — disabled in Supabase Auth settings. Resend SMTP is configured but sender domain not yet verified. Signup goes straight to onboarding. Re-enable once a custom domain is added and verified in Resend.

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
- Currently using Twilio WhatsApp Sandbox (free) — number `+14155238886` — requires `join <sandbox-name>` every 72h, production needs WhatsApp Business API via Meta verification
