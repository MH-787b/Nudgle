import { createClient } from "@supabase/supabase-js";
import { Clock, Calendar } from "lucide-react";
import type { Metadata } from "next";
import { isTrialExpired } from "@/lib/types";
import type { BusinessHour } from "@/lib/types";
import { BookingForm } from "./booking-form";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const supabase = getSupabase();
  const { data: business } = await supabase
    .from("profiles")
    .select("business_name")
    .eq("booking_code", code.toUpperCase())
    .eq("booking_enabled", true)
    .single();

  const name = business?.business_name || "Book an Appointment";

  return {
    title: `Book with ${name} — Nudgle`,
    description: `Book an appointment with ${name} online. Pick a time, confirm, done.`,
  };
}

export default async function BookingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = getSupabase();

  const { data: business } = await supabase
    .from("profiles")
    .select("id, business_name, default_duration, booking_code, timezone, plan, trial_ends_at")
    .eq("booking_code", code.toUpperCase())
    .eq("booking_enabled", true)
    .single();

  if (!business) {
    return (
      <div className="min-h-[100dvh] bg-surface-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Booking not found</h1>
          <p className="text-surface-600">This booking link isn&apos;t valid or has been disabled.</p>
        </div>
      </div>
    );
  }

  if (isTrialExpired(business.plan, business.trial_ends_at)) {
    return (
      <div className="min-h-[100dvh] bg-surface-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Booking unavailable</h1>
          <p className="text-surface-600">Online booking for this business is temporarily unavailable. Please contact them directly.</p>
        </div>
      </div>
    );
  }

  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("user_id", business.id)
    .order("day_of_week");

  const DEFAULT_HOURS: BusinessHour[] = [
    { id: "", user_id: "", day_of_week: 0, open_time: "09:00", close_time: "17:00", is_closed: false },
    { id: "", user_id: "", day_of_week: 1, open_time: "09:00", close_time: "17:00", is_closed: false },
    { id: "", user_id: "", day_of_week: 2, open_time: "09:00", close_time: "17:00", is_closed: false },
    { id: "", user_id: "", day_of_week: 3, open_time: "09:00", close_time: "17:00", is_closed: false },
    { id: "", user_id: "", day_of_week: 4, open_time: "09:00", close_time: "17:00", is_closed: false },
    { id: "", user_id: "", day_of_week: 5, open_time: "09:00", close_time: "17:00", is_closed: true },
    { id: "", user_id: "", day_of_week: 6, open_time: "09:00", close_time: "17:00", is_closed: true },
  ];
  const businessHours = (hours && hours.length > 0 ? hours : DEFAULT_HOURS) as BusinessHour[];
  const businessName = business.business_name || "this business";

  return (
    <div className="min-h-[100dvh] bg-surface-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Business card */}
        <div className="bg-surface-100 rounded-2xl border border-surface-300 overflow-hidden">
          {/* Header */}
          <div className="bg-brand-600 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{businessName}</h1>
            <p className="text-white/80 text-sm">Book your appointment in seconds</p>
          </div>

          {/* Info */}
          <div className="px-6 py-5 space-y-4">
            {/* Duration */}
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-surface-500 shrink-0" strokeWidth={2} />
              <span className="text-sm text-surface-600">{business.default_duration} minute appointment</span>
            </div>

            {/* Business hours (collapsed) */}
            <details className="group">
              <summary className="text-xs font-medium text-surface-500 uppercase tracking-wider cursor-pointer hover:text-surface-400 transition-colors list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform text-surface-500">&#9654;</span>
                Business hours
              </summary>
              <div className="space-y-1 mt-2">
                {businessHours.map((h) => (
                  <div key={h.day_of_week} className="flex justify-between text-sm">
                    <span className={h.is_closed ? "text-surface-500" : "text-surface-600"}>
                      {DAY_NAMES[h.day_of_week]}
                    </span>
                    <span className={h.is_closed ? "text-surface-500" : "text-white font-medium"}>
                      {h.is_closed ? "Closed" : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* Booking form */}
          <div className="px-6 pb-6">
            <BookingForm
              code={business.booking_code!}
              businessName={businessName}
              duration={business.default_duration}
            />
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-surface-500 mt-6">
          Powered by <a href="https://nudgle.co.uk" className="text-brand-500 hover:text-brand-400 transition-colors font-medium">Nudgle</a>
          <span className="text-surface-500"> — online booking &amp; reminders for your business</span>
        </p>
      </div>
    </div>
  );
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${displayH} ${period}` : `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}
