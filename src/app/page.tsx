import { CheckCircle, Clock, Bell, Mail, MessageSquare, Phone, Calendar, Zap } from "lucide-react";
import Link from "next/link";
import BranchHero from "@/components/branch-hero";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-surface-900">
      {/* Hero — full viewport, search-bar with branch animation */}
      <BranchHero />

      {/* How it works */}
      <section className="px-4 sm:px-8 py-24 sm:py-32 max-w-[1400px] mx-auto border-t border-surface-300">
        <p className="text-sm font-mono font-medium text-brand-500 tracking-wider uppercase mb-4 animate-in">
          How it works
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-16 animate-in delay-1">
          Three steps. No tech skills.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 — Add appointments */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6 animate-in delay-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono font-medium text-brand-500 bg-brand-500/10 px-2.5 py-1 rounded">01</span>
              <Clock className="w-5 h-5 text-brand-500" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Add your appointments</h3>
            <p className="text-sm text-surface-600 leading-relaxed mb-5">
              Type in client details or connect Google Calendar. Takes seconds.
            </p>
            {/* Mini UI preview — new appointment form */}
            <div className="bg-surface-900 rounded-lg p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="text-[11px] text-surface-500 font-mono">Client name</div>
                <div className="bg-surface-100 border border-surface-300 rounded-md px-3 py-1.5 text-sm text-white">Sarah Johnson</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] text-surface-500 font-mono">Email</div>
                <div className="bg-surface-100 border border-surface-300 rounded-md px-3 py-1.5 text-sm text-surface-600">sarah@email.com</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-surface-500 font-mono">Date</div>
                  <div className="bg-surface-100 border border-surface-300 rounded-md px-3 py-1.5 text-sm text-white flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-surface-500" strokeWidth={2} />
                    Fri, 18 Apr
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-surface-500 font-mono">Time</div>
                  <div className="bg-surface-100 border border-surface-300 rounded-md px-3 py-1.5 text-sm text-white">10:30 AM</div>
                </div>
              </div>
              <div className="bg-brand-500 text-white text-center text-sm font-semibold py-2 rounded-md">
                Add appointment
              </div>
            </div>
          </div>

          {/* Step 2 — Reminders go out */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6 animate-in delay-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono font-medium text-brand-500 bg-brand-500/10 px-2.5 py-1 rounded">02</span>
              <Zap className="w-5 h-5 text-brand-500" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Nudgle sends reminders</h3>
            <p className="text-sm text-surface-600 leading-relaxed mb-5">
              24 hours before each appointment, your client gets an email reminder automatically.
            </p>
            {/* Mini UI preview — email reminder */}
            <div className="bg-surface-900 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-surface-500 pb-2 border-b border-surface-300">
                <Bell className="w-3.5 h-3.5 text-brand-500" strokeWidth={2} />
                <span className="font-mono">Reminder from Nudgle</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white leading-relaxed">
                  Hi Sarah, just a reminder you have an appointment tomorrow at <span className="font-semibold text-brand-400">10:30 AM</span>.
                </p>
                <p className="text-sm text-surface-600">
                  Reply <span className="font-mono font-semibold text-brand-400">YES</span> to confirm.
                </p>
              </div>
              <div className="border-t border-surface-300 pt-3 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-500" strokeWidth={2} />
                <span className="text-xs text-surface-500">Sent via email</span>
                <span className="ml-auto text-xs font-mono text-green-400">Delivered</span>
              </div>
            </div>
          </div>

          {/* Step 3 — Track confirmations */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6 animate-in delay-3">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono font-medium text-brand-500 bg-brand-500/10 px-2.5 py-1 rounded">03</span>
              <CheckCircle className="w-5 h-5 text-brand-500" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">See who&apos;s coming</h3>
            <p className="text-sm text-surface-600 leading-relaxed mb-5">
              Your dashboard shows confirmations at a glance. No more guessing.
            </p>
            {/* Mini UI preview — dashboard appointments list */}
            <div className="bg-surface-900 rounded-lg p-4 space-y-2.5">
              <div className="text-[11px] text-surface-500 font-mono uppercase tracking-wider mb-1">Today&apos;s appointments</div>
              {[
                { name: 'Sarah Johnson', time: '10:30 AM', status: 'Confirmed', color: 'text-green-400' },
                { name: 'Marcus Taylor', time: '12:00 PM', status: 'Confirmed', color: 'text-green-400' },
                { name: 'Priya Kumar', time: '2:30 PM', status: 'Pending', color: 'text-amber-400' },
                { name: 'Ollie Roberts', time: '4:00 PM', status: 'Confirmed', color: 'text-green-400' },
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in delay-1">
          {/* Starter */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6">
            <h3 className="font-bold text-white mb-1">Starter</h3>
            <p className="text-sm text-surface-600 mb-4">For solo operators</p>
            <div className="mb-6">
              <span className="text-3xl font-bold font-mono text-white">£29</span>
              <span className="text-surface-600">/mo</span>
            </div>
            <div className="space-y-2.5 mb-6">
              {[
                "1,000 reminders/month",
                "Email reminders",
                "Confirmation tracking",
                "Google Calendar sync",
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
              Get started
            </Link>
          </div>

          {/* Growth */}
          <div className="bg-surface-100 border-2 border-brand-500 rounded-xl p-6 relative">
            <span className="absolute -top-3 left-6 text-xs font-mono font-medium text-surface-900 bg-brand-500 px-2.5 py-0.5 rounded">Popular</span>
            <h3 className="font-bold text-white mb-1">Growth</h3>
            <p className="text-sm text-surface-600 mb-4">For busy businesses</p>
            <div className="mb-6">
              <span className="text-3xl font-bold font-mono text-surface-500">Coming soon</span>
            </div>
            <div className="space-y-2.5 mb-6">
              {[
                "5,000 reminders/month",
                "Email, SMS & WhatsApp",
                "Confirmation tracking",
                "Google Calendar sync",
                "Priority support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-surface-600">
                  <CheckCircle className="w-4 h-4 text-brand-500 shrink-0" strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
            <div className="block text-center w-full px-6 py-3 bg-surface-300 text-surface-500 rounded-lg font-semibold cursor-not-allowed">
              Coming soon
            </div>
          </div>

          {/* Team */}
          <div className="bg-surface-100 border border-surface-300 rounded-xl p-6">
            <h3 className="font-bold text-white mb-1">Team</h3>
            <p className="text-sm text-surface-600 mb-4">For multi-staff operations</p>
            <div className="mb-6">
              <span className="text-3xl font-bold font-mono text-surface-500">Coming soon</span>
            </div>
            <div className="space-y-2.5 mb-6">
              {[
                "Unlimited reminders",
                "Email, SMS & WhatsApp",
                "Multiple staff members",
                "Team dashboard",
                "Dedicated support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-surface-600">
                  <CheckCircle className="w-4 h-4 text-surface-500 shrink-0" strokeWidth={2} />
                  {item}
                </div>
              ))}
            </div>
            <div className="block text-center w-full px-6 py-3 bg-surface-300 text-surface-500 rounded-lg font-semibold cursor-not-allowed">
              Coming soon
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-8 py-8 text-sm text-surface-500 border-t border-surface-300 max-w-[1400px] mx-auto">
        <span className="font-mono">&copy; 2026 Nudgle</span>
      </footer>
    </div>
  );
}
