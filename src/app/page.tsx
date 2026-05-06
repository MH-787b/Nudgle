import { CheckCircle, Clock, Bell, Mail, MessageSquare, Phone, Calendar, Zap, Link2, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";
import BranchHero from "@/components/branch-hero";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-surface-900">
      {/* Hero — full viewport, search-bar with branch animation */}
      <BranchHero />

      {/* Feature 1: WhatsApp Booking Bot */}
      <section className="px-4 sm:px-8 py-24 sm:py-32 max-w-[1400px] mx-auto border-t border-surface-300">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-in">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-mono font-medium text-green-400 bg-green-500/10 px-2.5 py-1 rounded">New</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Your clients book themselves via WhatsApp
            </h2>
            <p className="text-surface-600 leading-relaxed mb-6 max-w-[48ch]">
              Share a link on your Instagram, website, or business card. Clients tap it, pick a time, and they&apos;re booked &mdash; no calls, no DMs, no back-and-forth.
            </p>
            <div className="space-y-3">
              {[
                "Works 24/7 while you're busy with clients",
                "No app to download — it's just WhatsApp",
                "Appointments appear on your dashboard instantly",
                "Zero extra cost — no AI fees, no per-message charges",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-sm text-surface-600">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Mock WhatsApp conversation */}
          <div className="animate-in delay-1">
            <div className="bg-[#0b141a] rounded-2xl overflow-hidden border border-surface-300 max-w-sm mx-auto lg:ml-auto shadow-2xl">
              {/* WhatsApp header */}
              <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand-400">FC</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Fresh Cuts Barber</p>
                  <p className="text-[11px] text-[#8696a0]">online</p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="px-3 py-4 space-y-2" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
                {/* Client message */}
                <div className="flex justify-end">
                  <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-1.5 max-w-[75%]">
                    <p className="text-[13px] text-[#e9edef]">BOOK A3X9K2</p>
                    <p className="text-[10px] text-[#ffffff99] text-right mt-0.5">10:42 AM</p>
                  </div>
                </div>

                {/* Bot reply — greeting */}
                <div className="flex justify-start">
                  <div className="bg-[#1f2c34] rounded-lg rounded-tl-none px-3 py-1.5 max-w-[85%]">
                    <p className="text-[13px] text-[#e9edef]">Hi Sarah! Welcome to Fresh Cuts Barber.</p>
                    <p className="text-[13px] text-[#e9edef] mt-1.5">What day works for you?</p>
                    <p className="text-[13px] text-[#e9edef] mt-1">1. Mon 21 Apr</p>
                    <p className="text-[13px] text-[#e9edef]">2. Tue 22 Apr</p>
                    <p className="text-[13px] text-[#e9edef]">3. Wed 23 Apr</p>
                    <p className="text-[10px] text-[#ffffff99] text-right mt-0.5">10:42 AM</p>
                  </div>
                </div>

                {/* Client picks day */}
                <div className="flex justify-end">
                  <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-1.5">
                    <p className="text-[13px] text-[#e9edef]">2</p>
                    <p className="text-[10px] text-[#ffffff99] text-right mt-0.5">10:42 AM</p>
                  </div>
                </div>

                {/* Bot — time slots */}
                <div className="flex justify-start">
                  <div className="bg-[#1f2c34] rounded-lg rounded-tl-none px-3 py-1.5 max-w-[85%]">
                    <p className="text-[13px] text-[#e9edef]">Times on Tue 22 Apr:</p>
                    <p className="text-[13px] text-[#e9edef] mt-1">1. 9:00 AM</p>
                    <p className="text-[13px] text-[#e9edef]">2. 10:30 AM</p>
                    <p className="text-[13px] text-[#e9edef]">3. 2:00 PM</p>
                    <p className="text-[10px] text-[#ffffff99] text-right mt-0.5">10:42 AM</p>
                  </div>
                </div>

                {/* Client picks time */}
                <div className="flex justify-end">
                  <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-1.5">
                    <p className="text-[13px] text-[#e9edef]">2</p>
                    <p className="text-[10px] text-[#ffffff99] text-right mt-0.5">10:43 AM</p>
                  </div>
                </div>

                {/* Bot — confirmation */}
                <div className="flex justify-start">
                  <div className="bg-[#1f2c34] rounded-lg rounded-tl-none px-3 py-1.5 max-w-[85%]">
                    <p className="text-[13px] text-[#e9edef]">Your booking:</p>
                    <p className="text-[13px] text-[#e9edef] mt-1">Tue 22 Apr at 10:30 AM</p>
                    <p className="text-[13px] text-[#e9edef]">30 min at Fresh Cuts Barber</p>
                    <p className="text-[13px] text-[#e9edef] mt-1.5">Reply YES to confirm or NO to start over.</p>
                    <p className="text-[10px] text-[#ffffff99] text-right mt-0.5">10:43 AM</p>
                  </div>
                </div>

                {/* Client confirms */}
                <div className="flex justify-end">
                  <div className="bg-[#005c4b] rounded-lg rounded-tr-none px-3 py-1.5">
                    <p className="text-[13px] text-[#e9edef] font-medium">YES</p>
                    <p className="text-[10px] text-[#ffffff99] text-right mt-0.5">10:43 AM</p>
                  </div>
                </div>

                {/* Bot — booked */}
                <div className="flex justify-start">
                  <div className="bg-[#1f2c34] rounded-lg rounded-tl-none px-3 py-1.5 max-w-[85%]">
                    <p className="text-[13px] text-[#e9edef]">Booked! Fresh Cuts Barber will see you on Tue 22 Apr at 10:30 AM.</p>
                    <p className="text-[13px] text-[#e9edef] mt-1.5">You&apos;ll get a reminder before your appointment.</p>
                    <p className="text-[10px] text-[#ffffff99] text-right mt-0.5">10:43 AM</p>
                  </div>
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
                "Email & WhatsApp reminders included on every plan",
                "SMS & WhatsApp reminders available",
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
              Put your WhatsApp booking link on Instagram, your website, or your business card. Clients tap to book.
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
            <span className="absolute -top-3 left-6 text-xs font-mono font-medium text-surface-900 bg-brand-500 px-2.5 py-0.5 rounded">14 days free</span>
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
                "WhatsApp booking bot",
                "24h + 2h day-of reminders",
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
              Start 14-day free trial
            </Link>
            <p className="text-xs text-surface-500 text-center mt-2">No charge until trial ends</p>
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
