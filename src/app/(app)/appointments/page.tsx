import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Calendar, CheckCircle, Clock, Link2, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { isTrialExpired } from "@/lib/types";
import type { Appointment } from "@/lib/types";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user!.id)
      .gte("appointment_time", new Date().toISOString())
      .order("appointment_time", { ascending: true })
      .limit(50),
    supabase
      .from("profiles")
      .select("timezone, plan, trial_ends_at, booking_enabled, booking_code")
      .eq("id", user!.id)
      .single(),
  ]);

  const tz = profile?.timezone || "Europe/London";
  const appointments = (data || []) as Appointment[];
  const expired = isTrialExpired(profile?.plan || "trial", profile?.trial_ends_at || null);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nudgle.vercel.app";
  const bookingUrl = profile?.booking_enabled && profile?.booking_code
    ? `${appUrl}/book/${profile.booking_code}`
    : null;

  return (
    <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Appointments</h1>
        {expired ? (
          <Link
            href="/billing"
            className="flex items-center gap-2 px-4 py-2 bg-surface-300 text-surface-500 rounded-lg font-medium text-sm"
          >
            <Lock className="w-4 h-4" strokeWidth={2} />
            Trial ended
          </Link>
        ) : (
          <Link
            href="/appointments/new"
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add new
          </Link>
        )}
      </div>

      {bookingUrl && !expired && (
        <div className="bg-surface-100 p-3 rounded-xl border border-brand-500/20 mb-6 flex items-center gap-3">
          <Link2 className="w-4 h-4 text-brand-500 shrink-0" strokeWidth={2} />
          <code className="flex-1 text-xs text-brand-400 font-mono truncate">{bookingUrl}</code>
          <Link
            href="/settings"
            className="text-xs font-medium text-surface-500 hover:text-white transition-colors shrink-0"
          >
            Manage
          </Link>
        </div>
      )}

      {expired && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Lock className="w-5 h-5 text-red-400 shrink-0" strokeWidth={2} />
          <div>
            <p className="text-sm font-medium text-white">Your free trial has ended</p>
            <p className="text-xs text-surface-600">Pick a plan to keep adding appointments and sending reminders.</p>
          </div>
          <Link
            href="/billing"
            className="shrink-0 px-3 py-1.5 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="bg-surface-100 p-12 rounded-xl border border-surface-300 text-center">
          <Calendar className="w-10 h-10 text-surface-500 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-surface-600 mb-4">No upcoming appointments</p>
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add your first appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((apt) => (
            <Link
              key={apt.id}
              href={`/appointments/${apt.id}`}
              className="block bg-surface-100 p-4 rounded-xl border border-surface-300 hover:border-brand-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">{apt.client_name}</p>
                  <p className="text-sm text-surface-600 font-mono">
                    {new Date(apt.appointment_time).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })}
                  </p>
                  {apt.client_email && (
                    <p className="text-xs text-surface-500 mt-1">{apt.client_email}</p>
                  )}
                </div>
                {apt.status === "confirmed" ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium font-mono text-green-400 bg-green-500/10 px-2.5 py-1 rounded">
                    <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} />
                    Confirmed
                  </span>
                ) : apt.status === "cancelled" ? (
                  <span className="text-xs font-medium font-mono text-red-400 bg-red-500/10 px-2.5 py-1 rounded">
                    Cancelled
                  </span>
                ) : apt.status === "no_response" ? (
                  <span className="text-xs font-medium font-mono text-red-400 bg-red-500/10 px-2.5 py-1 rounded">
                    No response
                  </span>
                ) : apt.status === "pending_approval" ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded">
                    <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                    Needs approval
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded">
                    <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                    Pending
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
