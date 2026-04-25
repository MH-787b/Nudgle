import { createClient } from "@/lib/supabase/server";
import type { BusinessHour } from "@/lib/types";
import { SettingsForm } from "./settings-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("user_id", user!.id)
    .order("day_of_week");

  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-surface-600 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Back
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-white mb-6">Settings</h1>
      <SettingsForm
        profile={profile}
        businessHours={(hours || []) as BusinessHour[]}
        whatsappNumber={whatsappNumber}
      />
    </div>
  );
}
