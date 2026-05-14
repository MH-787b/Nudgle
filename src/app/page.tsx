import { CheckCircle, Clock, Bell, Mail, MessageSquare, Phone, Calendar, Zap, Link2, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";
import BranchHero from "@/components/branch-hero";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-surface-900">
      {/* Hero — full viewport, search-bar with branch animation */}
      <BranchHero />

      {/* Feature 1: Online Booking */}
      <section className="px-4 sm:px-8 py-24 sm:py-32 max-w-[1400px] mx-auto border-t border-surface-300">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-in">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono font-medium text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded">New</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Your clients book themselves online
            </h2>
            <p className="text-surface-600 leading-relaxed mb-6 max-w-[48ch]">
              Share a link on your Instagram, website, or business card. Clients tap it, pick a time, and they&apos;re booked &mdash; no calls, no DMs, no back-and-forth.
            </p>
            <div className="space-y-3">
              {[
                "Works 24/7 while you're busy with clients",
                "No app to download — just a link",
                "Appointments appear on your dashboard instantly",
                "Zero extra cost — no AI fees, no per-message charges",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-surface-600">
                  <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Mock booking form */}
          <div className="animate-in delay-1">
            <div className="bg-surface-100 rounded-2xl overflow-hidden border border-surface-300 max-w-sm mx-auto lg:ml-auto shadow-2xl">
              {/* Header */}
              <div className="bg-brand-600 px-5 py-5 text-center">
                <p className="text-sm font-semibold text-white">Fresh Cuts Barber</p>
                <p className="text-xs text-white/70">Book your appointment in seconds</p>
              </div>

              {/* Mock form steps */}
              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-surface-500 uppercase tracking-wider mb-2">Pick a day</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["Mon 12 May", "Tue 13 May", "Wed 14 May", "Thu 15 May"].map((d, i) => (
                      <div
                        key={d}
                        className={`px-3 py-2 rounded-lg text-xs font-medium text-center ${
                          i === 1
                            ? "bg-brand-500/15 border border-brand-500 text-white"
                            : "bg-surface-200 border border-surface-300 text-surface-500"
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-surface-500 uppercase tracking-wider mb-2">Pick a time</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["9:00 AM", "10:30 AM", "2:00 PM"].map((t, i) => (
                      <div
                        key={t}
                        className={`px-2 py-2 rounded-lg text-xs font-medium text-center ${
                          i === 1
                            ? "bg-brand-500/15 border border-brand-500 text-white"
                            : "bg-surface-200 border border-surface-300 text-surface-500"
                        }`}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-1">
                  <div className="bg-brand-500 text-white text-center py-2.5 rounded-xl text-sm font-semibold">
                    Confirm booking
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" strokeWidth={2} />
                  <span className="text-xs text-green-400 font-medium">You&apos;re booked! See you Tue 13 May at 10:30 AM.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Automated Reminders */}
      <section className="px-4 sm:px-8 py-24 sm:py-32 max-w-[1400px] mx-auto border-t border-surface-300">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Reminder preview — left on desktop */}
          <div className="animate-in order-2 lg:order-1">
            <div className="max-w-sm mx-auto lg:mr-auto space-y-4">
              {/* Email reminder card */}
              <div className="bg-surface-100 rounded-xl border border-surface-300 p-5 shadow-2xl">
                <div className="flex items-center gap-2 text-xs text-surface-500 pb-3 border-b border-surface-300">
                  <Bell className="w-3.5 h-3.5 text-brand-500" strokeWidth={2} />
                  <span className="font-mono">Reminder from Fresh Cuts Barber</span>
                </div>
                <div className="pt-3 space-y-2">
                  <p className="text-sm text-white leading-relaxed">
                    Hi Sarah, just a reminder you have an appointment tomorrow at <span className="font-semibold text-brand-400">10:30 AM</span>.
                  </p>
                  <p className="text-sm text-surface-600">
                    Reply <span className="font-mono font-semibold text-brand-400">YES</span> to confirm.
                  </p>
                </div>
                <div className="border-t border-surface-300 pt-3 mt-3 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-brand-500" strokeWidth={2} />
                  <span className="text-xs text-surface-500">Sent via email</span>
                  <span className="ml-auto text-xs font-mono text-green-400">Delivered</span>
                </div>
              </div>

              {/* Dashboard preview card */}
              <div className="bg-surface-100 rounded-xl border border-surface-300 p-5 shadow-2xl">
                <div className="text-[11px] text-surface-500 font-mono uppercase tracking-wider mb-3">Today&apos;s appointments</div>
                {[
                  { name: "Sarah Johnson", time: "10:30 AM", status: "Confirmed", color: "text-green-400" },
                  { name: "Marcus Taylor", time: "12:00 PM", status: "Confirmed", color: "text-green-400" },
                  { name: "Priya Kumar", time: "2:30 PM", status: "Pending", color: "text-amber-400" },
                  { name: "Ollie Roberts", time: "4:00 PM", status: "Confirmed", color: "text-green-400" },
                ].map((apt) => (
                  <div key={apt.name} className="flex items-center justify-between py-1.5 border-b border-surface-300 last:border-0">
                    <div>
                      <span className="text-sm text-white">{apt.name}</span>
                      <span className="text-xs text-surface-500 ml-2 font-mono">{apt.time}</span>
                    </div>
                    <span className={`text-xs font-mono ${apt.color}`}>{apt.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Description — right on desktop */}
          <div className="animate-in delay-1 order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Automatic reminders. Fewer no-shows.
            </h2>
            <p className="text-surface-600 leading-relaxed mb-6 max-w-[48ch]">
              24 hours before each appointment, Nudgle sends your client a reminder. They reply YES to confirm &mdash; you see it on your dashboard. No chasing, no phone tag.
            </p>
            <div className="space-y-3">
              {[
                "Email reminders included on every plan",
                "SMS & WhatsApp reminders included free",
                "Clients confirm with a simple YES reply",
                "See all confirmations at a glance on your dashboard",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-surface-600">
                  <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-8 py-24 sm:py-32 max-w-[1400px] mx-auto border-t border-surface-300">
        <p className="text-sm font-mono font-medium text-brand-500 tracking-wider uppercase mb-4 animate-in">
          How it works
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-16 animate-in delay-1">
          Set up in 60 seconds
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6 animate-in delay-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono font-medium text-brand-500 bg-brand-500/10 px-2.5 py-1 rounded">01</span>
              <Settings className="w-5 h-5 text-brand-500" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Set your hours</h3>
            <p className="text-sm text-surface-600 leading-relaxed">
              Tell Nudgle when you&apos;re open and how long appointments last. Mon&ndash;Fri, 9&ndash;5? Done.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6 animate-in delay-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono font-medium text-brand-500 bg-brand-500/10 px-2.5 py-1 rounded">02</span>
              <Link2 className="w-5 h-5 text-brand-500" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Share your link</h3>
            <p className="text-sm text-surface-600 leading-relaxed">
              Put your booking link on Instagram, your website, or your business card. Clients tap to book.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6 animate-in delay-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono font-medium text-brand-500 bg-brand-500/10 px-2.5 py-1 rounded">03</span>
              <Calendar className="w-5 h-5 text-brand-500" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Watch bookings come in</h3>
            <p className="text-sm text-surface-600 leading-relaxed">
              Appointments appear on your dashboard. Nudgle sends reminders automatically. You just show up.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 sm:px-8 py-24 sm:py-32 max-w-[1400px] mx-auto border-t border-surface-300" id="pricing">
        <div className="animate-in mb-16">
          <p className="text-sm font-mono font-medium text-brand-500 tracking-wider uppercase mb-4">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Pick your plan
          </h2>
          <p className="text-surface-600 leading-relaxed max-w-[45ch]">
            No contracts, no hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto animate-in delay-1">
          {/* Starter — highlighted, free trial CTA */}
          <div className="bg-surface-100 border-2 border-brand-500 rounded-xl p-6 relative">
            <span className="absolute -top-3 left-6 text-xs font-mono font-medium text-surface-900 bg-brand-500 px-2.5 py-0.5 rounded">7 days free</span>
            <h3 className="font-bold text-white mb-1">Starter</h3>
            <p className="text-sm text-surface-600 mb-4">For solo &amp; small businesses</p>
            <div className="mb-6">
              <span className="text-3xl font-bold font-mono text-white">&pound;29</span>
              <span className="text-surface-600">/mo</span>
            </div>
            <div className="space-y-2.5 mb-6">
              {[
                "500 appointments/month",
                "Email, WhatsApp & SMS reminders",
                "Online booking page",
                "24h reminder before each appointment",
                "Google Calendar sync",
                "Custom branded booking page",
                "No-show analytics",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-surface-600">
                  <CheckCircle className="w-4 h-4 text-brand-500 shrink-0" strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="block text-center w-full px-6 py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              Start 7-day free trial
            </Link>
            <p className="text-xs text-surface-500 text-center mt-2">Cancel anytime &mdash; no charge during trial</p>
          </div>

          {/* Business */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6">
            <h3 className="font-bold text-white mb-1">Business</h3>
            <p className="text-sm text-surface-600 mb-4">For multi-staff operations</p>
            <div className="mb-6">
              <span className="text-3xl font-bold font-mono text-white">&pound;79</span>
              <span className="text-surface-600">/mo</span>
            </div>
            <div className="space-y-2.5 mb-6">
              {[
                "1,500 appointments/month",
                "Everything in Starter",
                "Up to 5 staff members",
                "Team dashboard",
                "Waitlist & cancellation backfill",
                "Priority support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-surface-600">
                  <CheckCircle className="w-4 h-4 text-brand-500 shrink-0" strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="block text-center w-full px-6 py-3 bg-surface-200 text-white rounded-lg font-semibold hover:bg-surface-300 active:scale-[0.98] transition-all"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-8 py-8 text-sm text-surface-500 border-t border-surface-300 max-w-[1400px] mx-auto flex items-center justify-between">
        <span className="font-mono">&copy; 2026 Max Hulme trading as Nudgle</span>
        <Link href="/privacy" className="text-surface-500 hover:text-white transition-colors font-mono">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
