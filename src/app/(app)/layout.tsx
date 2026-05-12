import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { TrialBanner } from "@/components/trial-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Auto-grant business plan to owner (skip payments for testing/admin)
  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  if (ownerEmail && profile && user.email?.toLowerCase() === ownerEmail.toLowerCase() && profile.plan !== 'business') {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await admin
      .from("profiles")
      .update({ plan: "business", reminders_limit: 1500, trial_ends_at: null })
      .eq("id", user.id);
    profile.plan = "business";
    profile.trial_ends_at = null;
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <AppNav />
      <TrialBanner trialEndsAt={profile?.trial_ends_at} plan={profile?.plan} />
      <main className="pb-20 sm:pb-8">
        {children}
      </main>
    </div>
  );
}
