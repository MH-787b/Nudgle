import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { CheckCircle } from "lucide-react";
import { UpgradeButton } from "./upgrade-button";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const profile = data as Profile;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8">
      <h1 className="text-2xl font-bold tracking-tight text-white mb-6">Billing</h1>

      {/* Current plan */}
      <div className="bg-surface-100 p-6 rounded-xl border border-surface-300 mb-8">
        <p className="text-sm text-surface-600 mb-1">Current plan</p>
        <p className="text-2xl font-bold tracking-tight text-white capitalize">{profile.plan}</p>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-surface-600">Reminders used</span>
            <span className="font-medium font-mono text-white">
              {profile.reminders_used_this_month}/{profile.reminders_limit}
            </span>
          </div>
          <div className="h-1 bg-surface-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full"
              style={{
                width: `${Math.min(
                  (profile.reminders_used_this_month / profile.reminders_limit) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Plans */}
      <h2 className="text-lg font-bold tracking-tight text-white mb-4">Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nudgle */}
        <div className={`p-6 rounded-xl border-2 ${
          profile.plan === "paid" ? "border-brand-500 bg-brand-500/10" : "border-brand-500 bg-surface-100"
        }`}>
          <h3 className="font-bold text-white">Nudgle</h3>
          <p className="text-3xl font-bold font-mono mt-2 text-white">
            £{PLAN_LIMITS.paid.price}<span className="text-base font-normal text-surface-600 font-sans">/mo</span>
          </p>
          <ul className="mt-4 space-y-2.5">
            {["1,000 reminders/month", "SMS, Email & WhatsApp", "Confirmation tracking", "Google Calendar sync"].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-surface-600">
                <CheckCircle className="w-4 h-4 text-brand-500 shrink-0" strokeWidth={2} />
                {item}
              </li>
            ))}
          </ul>
          {profile.plan === "paid" ? (
            <p className="mt-4 text-center text-sm font-medium font-mono text-brand-500">Current plan</p>
          ) : (
            <UpgradeButton />
          )}
        </div>

        {/* Team */}
        <div className="p-6 rounded-xl border border-surface-300 bg-surface-100 opacity-50">
          <h3 className="font-bold text-white">Team</h3>
          <p className="text-3xl font-bold font-mono mt-2 text-surface-500">
            TBD<span className="text-base font-normal text-surface-500 font-sans">/mo</span>
          </p>
          <ul className="mt-4 space-y-2.5">
            {["Everything in Nudgle", "Multiple staff members", "Unlimited reminders"].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-surface-500">
                <CheckCircle className="w-4 h-4 text-surface-400 shrink-0" strokeWidth={2} />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-sm font-medium font-mono text-surface-500">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
