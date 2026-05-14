"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Bell, Mail } from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const [businessName, setBusinessName] = useState(searchParams.get("business") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          business_name: businessName.trim(),
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, user is already signed in — go to onboarding
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Save business name to profile (trigger only creates id/email/plan)
      await supabase
        .from("profiles")
        .update({ business_name: businessName.trim() })
        .eq("id", session.user.id);

      router.push("/onboarding");
      router.refresh();
      return;
    }

    // Otherwise show check-your-inbox screen
    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-surface-900">
        <div className="w-full max-w-sm animate-in text-center">
          <div className="w-16 h-16 bg-brand-500/15 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-brand-500" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-3">Check your inbox</h2>
          <p className="text-surface-600 leading-relaxed mb-2">
            We&apos;ve sent a confirmation link to
          </p>
          <p className="text-white font-medium font-mono text-sm mb-6">{email}</p>
          <p className="text-sm text-surface-500">
            Click the link in the email to activate your account, then you&apos;ll be taken straight to setup.
          </p>
          <div className="mt-8 pt-6 border-t border-surface-300">
            <p className="text-xs text-surface-500">
              Didn&apos;t get it? Check your spam folder or{" "}
              <button
                onClick={() => setSubmitted(false)}
                className="text-brand-500 hover:text-brand-400 transition-colors"
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-surface-900">
      <div className="w-full max-w-sm animate-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-500" strokeWidth={2} />
            <span className="text-xl font-bold tracking-tight text-white">nudgle</span>
          </Link>
          <p className="mt-3 text-surface-600">Start reducing no-shows in 60 seconds</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-surface-600 mb-1.5">
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              autoComplete="off"
              className="w-full px-4 py-3 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition placeholder:text-surface-500"
              placeholder="e.g. Sarah's Hair Studio"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-surface-600 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              className="w-full px-4 py-3 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition placeholder:text-surface-500"
              placeholder="you@business.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-surface-600 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition placeholder:text-surface-500"
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create free account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-surface-600">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-500 font-medium hover:text-brand-400 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
