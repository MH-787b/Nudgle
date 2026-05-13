# Nudgle

Appointment reminder SaaS for small service businesses. Reduces no-shows via email reminders + online booking page.

## Code Rules

- When creating a new function, always include a one-sentence explanation of what it does.
- When creating a new function successfully, type "operation complete" in the CLI.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Auth + DB:** Supabase (email/password auth, Postgres with RLS, custom SMTP via Resend)
- **Email:** Resend (verified domain `nudgle.co.uk`, sends from `reminders@nudgle.co.uk`, free tier 100/day + SMTP for auth emails)
- **SMS + WhatsApp:** Twilio (WhatsApp/SMS reminders "Coming Soon" — pending Meta Business verification)
- **Payments:** Gumroad (2 subscription tiers, webhook at `/api/webhooks/gumroad`)
- **Hosting:** Vercel Hobby (https://nudgle.vercel.app)
- **Onboarding:** 3 steps (calendar → reminder method → activate) — no card collection, Gumroad handles payment externally

## Pricing Tiers

| | Starter | Business |
|---|---|---|
| **Price** | £29/mo | £79/mo |
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
- `OWNER_EMAIL` env var auto-grants Business plan (skip payments for admin/testing) — uses `.trim()` + case-insensitive comparison to handle env var quirks
- `PlanType`: `trial | starter | business` — defined in `src/lib/types.ts`

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes (dashboard, appointments, billing, settings)
│   ├── api/
│   │   ├── approve/[id]/   # Owner approval endpoint — Approve/Reject buttons for conflicted slot requests
│   │   ├── confirm/[id]/   # Client confirmation endpoint — Yes/No buttons update appointment status
│   │   ├── cron/reminders/ # Cron endpoint — sends 24h and 2h reminders (daily at 8am), auto-rejects expired pending_approval
│   │   ├── book/           # Public booking API — GET returns available days/slots (with conflict flags), POST creates booking
│   │   ├── google/         # Calendar OAuth callback + sync
│   │   └── webhooks/       # Gumroad (payments) + Twilio (SMS replies + WhatsApp booking)
│   ├── auth/callback/      # Supabase auth callback
│   ├── book/[code]/        # Public booking page — interactive multi-step booking form
│   ├── login/
│   ├── signup/
│   └── onboarding/         # 3-step setup flow (calendar → reminder method → activate)
├── components/             # Shared components (app-nav, phone-input, trial-banner, loading-bar, pixel-octopus)
└── lib/
    ├── booking/            # Booking availability logic + WhatsApp conversation engine (Coming Soon)
    ├── messaging/          # Email (Resend), SMS + WhatsApp (Twilio) send functions
    ├── supabase/           # Browser + server Supabase clients
    └── types.ts            # TypeScript types + PlanConfig + PLAN_LIMITS
```

## Key Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npx vercel --prod` — deploy to production (no git remote, direct CLI deploy)
- DB migrations: `supabase/migrations/001_initial_schema.sql` through `009_pending_approval_status.sql`
- **Always run new migrations in Supabase SQL Editor immediately after creating them** — 002-005 were missed, causing settings to break

## Important Notes

- External service clients (Twilio, Resend) are lazily initialised to avoid build-time errors when env vars are placeholders
- All API routes that use Supabase service role create the client inside the handler, not at module level
- `TWILIO_WHATSAPP_NUMBER` env var may include `whatsapp:` prefix — messaging code normalises it automatically
- Business name is saved to profiles on signup (trigger only creates basic profile; signup page updates business_name)
- Middleware allows unauthenticated access to: `/`, `/login`, `/signup`, `/book/*`, `/auth/callback`, `/onboarding`, `/api/*`
- Brand colors use custom Tailwind theme: `brand-50` through `brand-900` (orange/amber)
- Google Calendar integration built (`src/lib/google-calendar.ts`): reads busy times (FreeBusy API from ALL calendars via calendarList), writes/updates/deletes events on appointment changes. Google Cloud project set up, credentials on Vercel production (local `.env.local` has placeholders — use `npx vercel env pull` or copy from Vercel dashboard). OAuth scope is `calendar` (full read/write access to all calendars). Settings page has connect/disconnect UI. Callback supports redirect to `/settings` or `/onboarding` via `state` param.
- Vercel cron limited to daily (8am) on Hobby plan — reminder windows widened (28h for 24h reminders, 4h for 2h) with `_sent` flag dedup
- Settings page server component must use `select("*")` not specific columns — avoids breakage if columns are missing
- **All server-rendered times must use business timezone** — use `toLocaleString("en-GB", { timeZone: tz })` not date-fns `format()` (which defaults to UTC on Vercel, causing times to be 1h off for BST users)
- Mobile-first design throughout
- Dashboard shows "Nudgle saved you £X" metric (confirmed appointments × average appointment value from settings)
- Trial is time-based only (14 days, no appointment cap) — dashboard + billing show "X days left" with progress bar; cron skips appointment limit for trial users
- **Expired trial gating**: blocks new appointment creation (manual form + public booking page), stops cron reminders, public booking page shows "unavailable". Dashboard/settings/data remain accessible. All blocked pages direct to /billing to upgrade.
- `isTrialExpired(plan, trialEndsAt)` helper in `src/lib/types.ts` — used across cron, booking API, dashboard, appointments, and booking page
- Dashboard has two-column layout on desktop (lg+): week calendar left half (sticky), everything else right. Mobile unchanged.
- Week calendar is a time-grid layout (like Google Calendar) — hours 7AM–10PM on left axis, 7 day columns, events as positioned blocks sized by duration. Navigable via `?week=YYYY-MM-DD`, fullscreen toggle, current time indicator (orange line)
- Week calendar shows Nudgle appointments (green=confirmed, orange=pending, red=cancelled) + Google Calendar events (blue, if connected). Events synced to Nudgle (via `google_event_id`) are deduplicated. All-day Google events excluded. Nudgle events are clickable (link to detail), Google events are not.
- Week calendar handles overlapping events with side-by-side column layout (like Google Calendar) — 2 overlaps = 50% width each, 3 = 33%, etc.
- Week calendar event interaction: Desktop — hover shows opaque popout card with full details, click navigates to appointment. Mobile — first tap expands popout, second tap navigates. Tap outside to dismiss. Google Calendar events show "Google Calendar" label, Nudgle events show status.
- Google Calendar fetches events from ALL user calendars (not just primary) — uses calendarList API to discover calendars, then fetches events from each in parallel
- New appointment form checks for Google Calendar conflicts before creating — shows amber warning with conflicting event names/times, user can "Add anyway" or "Change time". Check endpoint at `/api/google/check-conflicts`
- `google_calendar_blocks_slots` profile column (migration 007) — toggle in settings ("Require approval for busy times") controls whether Google Calendar events flag booking slots for owner approval. Default true. Turn off if business has staff who can cover.
- Dashboard calendar days (today + future) are clickable — link to /appointments/new?date=YYYY-MM-DD
- New appointment form has "Remind via" selector — WhatsApp/SMS marked "Coming soon", email is default until Twilio WhatsApp Business API approved
- Appointment detail page has inline edit form (expand/collapse) for updating client details, date/time, duration
- Trial banner on all authenticated pages (subtle → urgent → expired states)
- Cron reminders enforce plan-level channel restrictions and SMS caps with automatic fallback (SMS cap hit → WhatsApp → email; no phone number → email)
- Reminder emails include Yes/No confirmation buttons (stacked, full-width) linking to `/api/confirm/[id]?response=yes|no` — Yes sets status to "confirmed", No sets status to "cancelled" + creates confirmations record
- Appointments list page shows status badges: Confirmed (green), Cancelled (red), No response (red), Pending (amber), Needs approval (amber with warning icon)
- `AppointmentStatus`: `'pending' | 'confirmed' | 'no_response' | 'cancelled' | 'pending_approval'` — defined in `src/lib/types.ts`, DB constraint updated in migration 009
- Cron endpoint returns `debug` array with per-appointment trace (profile state, channel resolution, send result) for troubleshooting
- Gumroad webhook maps product IDs via `GUMROAD_STARTER_PRODUCT_ID` and `GUMROAD_BUSINESS_PRODUCT_ID` env vars
- Orange loading bar on page transitions + spinner on logout button
- Onboarding is 3 steps (no card collection) — completion message mentions both reminders and online booking
- Settings page has back arrow to dashboard and floating toast on save
- Online booking card on dashboard shows booking page URL with "Manage" link to settings (hidden when trial expired)
- Booking agent is web-form primary, WhatsApp secondary (Coming Soon) — no SMS/email agents
- Gumroad product IDs are base64-encoded strings (not URL slugs) — found via webhook debug logging
- Gumroad seller ID is also base64-encoded — `GUMROAD_SELLER_ID` env var must match exactly including `==` suffix

## Temporarily Disabled

- **Email confirmation on signup** — disabled in Supabase Auth settings. Resend SMTP configured, `nudgle.co.uk` domain verified. Re-enable when ready.

## Online Booking (Primary)

- Public booking page at `/book/[code]` — interactive multi-step form: pick day → pick time → enter details → confirm
- Booking form is a client component (`booking-form.tsx`) that calls `/api/book` API
- **Email is required** on the booking form (name + email mandatory, phone optional)
- `/api/book` GET returns available days (14 days ahead) or time slots for a specific date — each slot includes `{ time, label, conflicted }` flag
- `/api/book` POST validates slot availability (race-condition safe), creates booking. For conflicted slots → `pending_approval` status + owner approval email. For free slots → `confirmed` status + client confirmation email + Google Calendar sync
- Availability logic reuses `getAvailableDays()` and `getAvailableSlots()` from `src/lib/booking/availability.ts`
- **Calendar conflict approval flow**: when `google_calendar_blocks_slots` is true, slots overlapping Google Calendar events (+ 30-min buffer each side) are shown in amber on the booking page. Client can still request them → owner gets email with Approve/Reject buttons → `/api/approve/[id]?response=approve|reject`. Default (no response) = auto-reject when appointment time passes (handled by cron). On approve: status → confirmed, client emailed, synced to Google Calendar. On reject: status → cancelled, client emailed.
- Frontend sends `requestedConflict` flag in POST body as fallback — if Google API fails during POST but succeeded during GET, the conflict is still detected
- `getBusyTimes()` queries ALL calendars (not just primary) via calendarList API — matches `getCalendarEvents()` behavior
- `dateInTz()` exported from availability.ts — converts local date/time to UTC for a given timezone
- Confirmation email includes Yes/No buttons (same as reminder emails)
- Settings shows booking page URL with copy button — no WhatsApp link shown
- Settings toggle labelled "Require approval for busy times" — controls whether Google Calendar events flag booking slots
- Landing page features mock booking form (was mock WhatsApp conversation)
- Each business gets a unique 6-char booking code (stored in `profiles.booking_code`)
- Appointment overlap prevention on both create and edit forms — checks existing non-cancelled appointments for time conflicts
- Reminder emails include "Please do not reply" footer (Resend doesn't receive inbound email)
- Cron skips `pending_approval` appointments from both 24h and 2h reminders
- Test script at `scripts/test-approval-flow.mjs` — unit tests + integration tests for the full approval workflow. Run with `BOOKING_CODE=W3W2WY node scripts/test-approval-flow.mjs`

## WhatsApp Booking Bot (Coming Soon)

- All WhatsApp booking references blurred to "Coming Soon" across site as of 2026-05-12
- Code still exists in `src/lib/booking/conversation.ts` and `/api/webhooks/twilio`
- Blocked on Meta WhatsApp Business verification (resubmitted 2026-05-01, still in review)
- Currently using Twilio WhatsApp Sandbox (free) — number `+14155238886` — requires `join <sandbox-name>` every 72h
- Once Meta approves: finish Twilio sender setup, update `TWILIO_WHATSAPP_NUMBER` env var, re-enable as secondary booking channel alongside web form
- Menu-driven flow: pick day → pick time → confirm → booked (no LLM, zero API cost)
- Conversation state tracked in `conversations` table, expires after 1 hour of inactivity
