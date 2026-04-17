# Nudgle

Appointment reminder SaaS for small service businesses. Reduces no-shows via email reminders (SMS + WhatsApp ready but not yet active).

## Tech Stack

- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Auth + DB:** Supabase (email/password auth, Postgres with RLS)
- **Email:** Resend (free tier, 100/day)
- **SMS + WhatsApp:** Twilio (wired up but not active — needs paid phone number)
- **Payments:** Gumroad (single plan £29/mo, webhook at `/api/webhooks/gumroad`)
- **Hosting:** Vercel Hobby (https://nudgle.vercel.app)

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes (dashboard, appointments, billing)
│   ├── api/
│   │   ├── cron/reminders/ # Cron endpoint — sends 24h and 2h reminders (daily at 8am)
│   │   ├── google/         # Calendar OAuth callback + sync (not yet configured)
│   │   └── webhooks/       # Gumroad (payments) + Twilio (SMS replies)
│   ├── auth/callback/      # Supabase auth callback
│   ├── login/
│   ├── signup/
│   └── onboarding/         # 3-step setup flow
├── components/             # Shared components (app-nav)
└── lib/
    ├── messaging/          # Email (Resend), SMS + WhatsApp (Twilio) send functions
    ├── supabase/           # Browser + server Supabase clients
    └── types.ts            # TypeScript types + plan config
```

## Key Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `vercel --prod` — deploy to production
- DB migration: `supabase/migrations/001_initial_schema.sql`

## Important Notes

- External service clients (Twilio, Resend) are lazily initialised to avoid build-time errors when env vars are placeholders
- All API routes that use Supabase service role create the client inside the handler, not at module level
- Brand colors use custom Tailwind theme: `brand-50` through `brand-900` (orange/amber)
- Single pricing plan: £29/mo via Gumroad (no Stripe — age restriction)
- SMS/WhatsApp show as "coming soon" in onboarding until Twilio is activated
- Google Calendar integration built but not configured — users add appointments manually
- Vercel cron limited to daily (8am) on Hobby plan
- Mobile-first design throughout
