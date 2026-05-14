"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Calendar, CreditCard, Mail, MessageSquare, Phone } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingFlow />
    </Suspense>
  );
}

function OnboardingFlow() {
  const searchParams = useSearchParams();
  const calendarConnected = searchParams.get("calendar") === "connected";
  const [step, setStep] = useState<Step>(calendarConnected ? 2 : 1);
  const [reminderMethod, setReminderMethod] = useState<"email" | "sms" | "whatsapp">("email");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function connectGoogleCalendar() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/google/callback`;
    const scope = "https://www.googleapis.com/auth/calendar";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=onboarding`;
    window.location.href = url;
  }

  /** Saves preferences and opens Gumroad checkout to collect card details. */
  async function startTrial() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Business name is in user metadata from signup — ensure it's saved to profile
    const businessName = user.user_metadata?.business_name;

    // Save preferences but DON'T activate reminders — that happens when Gumroad webhook fires
    await supabase.from("profiles").update({
      reminder_method: reminderMethod,
      phone: (reminderMethod === "sms" || reminderMethod === "whatsapp") ? phone : null,
      onboarding_completed: true,
      ...(businessName && { business_name: businessName }),
    }).eq("id", user.id);

    // Open Gumroad Starter checkout with email prefilled
    const gumroadUrl = process.env.NEXT_PUBLIC_GUMROAD_STARTER_URL;
    if (gumroadUrl) {
      window.open(`${gumroadUrl}?email=${encodeURIComponent(user.email || "")}`, "_blank");
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-surface-900">
      <div className="w-full max-w-md animate-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-500" strokeWidth={2} />
            <span className="text-xl font-bold tracking-tight text-white">nudgle</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-brand-500" : "bg-surface-300"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Calendar */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Connect your calendar</h2>
              <p className="mt-2 text-surface-600">
                We&apos;ll automatically find your upcoming appointments
              </p>
            </div>

            <button
              onClick={connectGoogleCalendar}
              className="w-full py-4 bg-surface-100 border border-surface-300 rounded-lg font-medium text-white hover:border-brand-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Calendar className="w-5 h-5 text-brand-500" strokeWidth={2} />
              Connect Google Calendar
            </button>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 text-surface-600 font-medium hover:text-white transition-colors"
            >
              Skip &mdash; I&apos;ll add appointments manually
            </button>
          </div>
        )}

        {/* Step 2: Reminder method */}
        {step === 2 && (
          <div className="space-y-6">
            {calendarConnected && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Calendar className="w-4 h-4 text-green-400" strokeWidth={2} />
                <p className="text-sm text-green-400 font-medium">Google Calendar connected</p>
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">How should we remind customers?</h2>
              <p className="mt-2 text-surface-600">All channels included free &mdash; you can change this anytime</p>
            </div>

            <div className="space-y-3">
              <div
                className="w-full p-4 rounded-lg border border-surface-300 bg-surface-100 text-left flex items-center gap-4 opacity-50 cursor-not-allowed relative"
              >
                <MessageSquare className="w-5 h-5 text-surface-500" strokeWidth={2} />
                <div>
                  <p className="font-semibold text-white">WhatsApp</p>
                  <p className="text-sm text-surface-600">98% open rate &mdash; included free</p>
                </div>
                <span className="absolute top-2 right-3 text-[10px] font-semibold text-brand-400 bg-surface-900 px-1.5 py-0.5 rounded">
                  Coming Soon
                </span>
              </div>

              <button
                onClick={() => setReminderMethod("sms")}
                className={`w-full p-4 rounded-lg border transition-all text-left flex items-center gap-4 active:scale-[0.98] ${
                  reminderMethod === "sms"
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-surface-300 bg-surface-100 hover:border-surface-400"
                }`}
              >
                <Phone className={`w-5 h-5 ${reminderMethod === "sms" ? "text-brand-500" : "text-surface-500"}`} strokeWidth={2} />
                <div>
                  <p className="font-semibold text-white">SMS</p>
                  <p className="text-sm text-surface-600">45% open rate &mdash; included free</p>
                </div>
              </button>

              <button
                onClick={() => setReminderMethod("email")}
                className={`w-full p-4 rounded-lg border transition-all text-left flex items-center gap-4 active:scale-[0.98] ${
                  reminderMethod === "email"
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-surface-300 bg-surface-100 hover:border-surface-400"
                }`}
              >
                <Mail className={`w-5 h-5 ${reminderMethod === "email" ? "text-brand-500" : "text-surface-500"}`} strokeWidth={2} />
                <div>
                  <p className="font-semibold text-white">Email</p>
                  <p className="text-sm text-surface-600">20% open rate &mdash; included free</p>
                </div>
              </button>
            </div>

            {(reminderMethod === "sms" || reminderMethod === "whatsapp") && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-surface-600 mb-1.5">
                  Your business phone (for sender ID)
                </label>
                <PhoneInput id="phone" onChange={(val) => setPhone(val)} />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 text-surface-600 font-medium hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Start trial (card required) */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-brand-500/15 rounded-xl flex items-center justify-center mx-auto">
              <CreditCard className="w-8 h-8 text-brand-500" strokeWidth={2} />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Start your free trial</h2>
              <p className="mt-2 text-surface-600">
                Add your card to start 7 days free. You won&apos;t be charged until the trial ends &mdash; cancel anytime.
              </p>
            </div>

            <div className="bg-surface-100 border border-surface-300 p-4 rounded-lg text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Plan</span>
                <span className="font-medium font-mono text-white">Starter &mdash; &pound;29/mo</span>
              </div>
              <div className="border-t border-surface-300" />
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Trial</span>
                <span className="font-medium font-mono text-green-400">7 days free</span>
              </div>
              <div className="border-t border-surface-300" />
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Reminders</span>
                <span className="font-medium font-mono text-white">
                  {reminderMethod === "sms" ? "SMS" : reminderMethod === "whatsapp" ? "WhatsApp" : "Email"} &mdash; 24h before
                </span>
              </div>
              <div className="border-t border-surface-300" />
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Online booking</span>
                <span className="font-medium font-mono text-white">Included</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 text-surface-600 font-medium hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={startTrial}
                disabled={loading}
                className="flex-1 py-4 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Setting up..." : "Start 7-day free trial"}
              </button>
            </div>

            <p className="text-xs text-surface-500">
              You&apos;ll be taken to our payment partner to add your card
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
