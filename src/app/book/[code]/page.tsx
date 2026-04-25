import { createClient } from "@supabase/supabase-js";
import { MessageSquare, Clock, Calendar } from "lucide-react";
import type { Metadata } from "next";
import type { BusinessHour } from "@/lib/types";

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
    description: `Book an appointment with ${name} via WhatsApp. Pick a time, confirm, done.`,
  };
}

export default async function BookingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = getSupabase();

  const { data: business } = await supabase
    .from("profiles")
    .select("id, business_name, default_duration, booking_code, timezone")
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

  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("user_id", business.id)
    .order("day_of_week");

  const businessHours = (hours || []) as BusinessHour[];
  const whatsappNumber = (process.env.TWILIO_WHATSAPP_NUMBER || "").replace(/[^0-9]/g, "");
  const bookingLink = `https://wa.me/${whatsappNumber}?text=BOOK%20${business.booking_code}`;
  const businessName = business.business_name || "this business";

  return (
    <div className="min-h-[100dvh] bg-surface-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Business card */}
        <div className="bg-surface-100 rounded-2xl border border-surface-300 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8 text-center">
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

            {/* Business hours */}
            <div>
              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">Hours</p>
              <div className="space-y-1">
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
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pb-6">
            <a
              href={bookingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-base hover:bg-[#20bd5a] active:scale-[0.98] transition-all"
            >
              <MessageSquare className="w-5 h-5" strokeWidth={2} />
              Book on WhatsApp
            </a>
            <p className="text-center text-xs text-surface-500 mt-3">
              Opens WhatsApp — pick a day and time, confirm, done
            </p>
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-surface-500 mt-6">
          Powered by <a href="https://nudgle.vercel.app" className="text-brand-500 hover:text-brand-400 transition-colors">Nudgle</a>
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
