import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/types";
import type { Profile, PlanType } from "@/lib/types";
import { CheckCircle, Clock } from "lucide-react";
import { UpgradeButton } from "./upgrade-button";

function getTrialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getEffectivePlan(profile: Profile): PlanType {
  if (profile.plan === 'trial') {
    const days = getTrialDaysLeft(profile.trial_ends_at);
    if (days !== null && days <= 0) return 'starter';
  }
  return profile.plan;
}

const tiers: { key: 'starter' | 'business'; features: string[] }[] = [
  {
    key: 'starter',
    features: [
      '500 appointments/month',
      'Email, WhatsApp & SMS reminders',
      '24h + 2h day-of reminders',
      'Online booking page',
      'Google Calendar sync',
      'No-show analytics',
    ],
  },
  {
    key: 'business',
    features: [
      '1,500 appointments/month',
      'Everything in Starter',
      'Up to 5 staff members',
      'Team dashboard',
      'Waitlist & backfill',
      'Priority support',
    ],
  },
];

const tierOrder: PlanType[] = ['starter', 'business'];

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const profile = data as Profile;
  const trialDays = getTrialDaysLeft(profile.trial_ends_at);
  const effectivePlan = getEffectivePlan(profile);
  const currentConfig = PLAN_LIMITS[effectivePlan];
  const isOnTrial = profile.plan === 'trial' && trialDays !== null && trialDays > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-24">
      <h1 className="text-2xl font-bold tracking-tight text-white mb-6">Billing</h1>

      {/* Current plan + trial banner */}
      <div className="bg-surface-100 p-6 rounded-xl border border-surface-300 mb-8">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-surface-600">Current plan</p>
          {isOnTrial && trialDays !== null && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded">
              {trialDays} day{trialDays !== 1 ? 's' : ''} left
            </div>
          )}
        </div>
        <p className="text-2xl font-bold tracking-tight text-white">
          {isOnTrial ? 'Free Trial' : currentConfig.name}
          {!isOnTrial && effectivePlan !== 'trial' && (
            <span className="text-base font-normal text-surface-600 ml-2">
              &pound;{currentConfig.price}/mo
            </span>
          )}
        </p>

        {/* Usage bar — days for trial, appointments for paid */}
        <div className="mt-4">
          {isOnTrial ? (
            <>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-surface-600">Trial period</span>
                <span className="font-medium font-mono text-white">
                  {trialDays} of 14 days
                </span>
              </div>
              <div className="h-1 bg-surface-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{ width: `${Math.min(100, ((14 - (trialDays ?? 0)) / 14) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-surface-500">
                All features unlocked &mdash; no limits during trial
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-surface-600">Appointments used</span>
                <span className="font-medium font-mono text-white">
                  {profile.reminders_used_this_month}/{currentConfig.appointments}
                </span>
              </div>
              <div className="h-1 bg-surface-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      (profile.reminders_used_this_month / currentConfig.appointments) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </>
          )}
        </div>

        {profile.sms_used_this_month > 0 && currentConfig.smsCap > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-surface-600">SMS used</span>
              <span className="font-medium font-mono text-white">
                {profile.sms_used_this_month}/{currentConfig.smsCap}
              </span>
            </div>
            <div className="h-1 bg-surface-300 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${Math.min(
                    (profile.sms_used_this_month / currentConfig.smsCap) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Plans */}
      <h2 className="text-lg font-bold tracking-tight text-white mb-4">Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiers.map((tier) => {
          const config = PLAN_LIMITS[tier.key];
          const isCurrent = effectivePlan === tier.key || (isOnTrial && tier.key === 'starter');
          const isUpgrade = tierOrder.indexOf(tier.key) > tierOrder.indexOf(effectivePlan);

          return (
            <div
              key={tier.key}
              className={`p-6 rounded-xl border-2 ${
                isCurrent
                  ? 'border-brand-500 bg-brand-500/5'
                  : 'border-surface-300 bg-surface-100'
              }`}
            >
              <h3 className="font-bold text-white">{config.name}</h3>
              <p className="text-3xl font-bold font-mono mt-2 text-white">
                &pound;{config.price}
                <span className="text-base font-normal text-surface-600 font-sans">/mo</span>
              </p>
              <ul className="mt-4 space-y-2.5">
                {tier.features.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-surface-600">
                    <CheckCircle className="w-4 h-4 text-brand-500 shrink-0" strokeWidth={2} />
                    {item}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <p className="mt-4 text-center text-sm font-medium font-mono text-brand-500">
                  {isOnTrial ? 'Trial active' : 'Current plan'}
                </p>
              ) : isUpgrade ? (
                <UpgradeButton plan={tier.key} price={config.price} />
              ) : (
                <p className="mt-4 text-center text-sm font-mono text-surface-500">
                  Included in your plan
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
