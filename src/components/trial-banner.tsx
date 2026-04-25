import Link from "next/link";
import { Clock, AlertTriangle } from "lucide-react";

interface TrialBannerProps {
  trialEndsAt: string | null;
  plan: string;
}

export function TrialBanner({ trialEndsAt, plan }: TrialBannerProps) {
  if (plan !== "trial") return null;

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const expired = daysLeft <= 0;
  const urgent = daysLeft <= 3;

  if (expired) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span>Your free trial has ended. Pick a plan to keep all your features.</span>
          </div>
          <Link
            href="/billing"
            className="shrink-0 px-3 py-1 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors"
          >
            Choose plan
          </Link>
        </div>
      </div>
    );
  }

  if (urgent) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <Clock className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span>{daysLeft} day{daysLeft !== 1 ? "s" : ""} left on your free trial</span>
          </div>
          <Link
            href="/billing"
            className="shrink-0 px-3 py-1 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors"
          >
            Choose plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-500/5 border-b border-brand-500/10 px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-surface-600">
          <span className="font-mono text-brand-400">{daysLeft} days</span> left on your free trial
        </p>
        <Link
          href="/billing"
          className="text-sm font-medium text-brand-500 hover:text-brand-400 transition-colors"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
