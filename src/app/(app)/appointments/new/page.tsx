"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";
import { PhoneInput } from "@/components/phone-input";
import { isTrialExpired } from "@/lib/types";

export default function NewAppointmentPage() {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [reminderMethod, setReminderMethod] = useState<"email" | "sms" | "whatsapp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [calendarWarning, setCalendarWarning] = useState<{ summary: string; start: string; end: string }[] | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("plan, trial_ends_at").eq("id", user.id).single().then(({ data }) => {
        if (data && isTrialExpired(data.plan, data.trial_ends_at)) setExpired(true);
      });
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (reminderMethod === "email" && !clientEmail) {
      setError("Client email is required for email reminders");
      setLoading(false);
      return;
    }
    if ((reminderMethod === "sms" || reminderMethod === "whatsapp") && !clientPhone) {
      setError(`Client phone is required for ${reminderMethod === "sms" ? "SMS" : "WhatsApp"} reminders`);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const appointmentTime = new Date(`${date}T${time}`);
    const appointmentEnd = new Date(appointmentTime.getTime() + parseInt(duration) * 60 * 1000);

    // Check for overlapping appointments
    const dayStart = new Date(`${date}T00:00:00`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59`).toISOString();

    const { data: dayAppts } = await supabase
      .from("appointments")
      .select("id, client_name, appointment_time, duration_minutes")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .gte("appointment_time", dayStart)
      .lte("appointment_time", dayEnd);

    const newStart = appointmentTime.getTime();
    const newEnd = appointmentEnd.getTime();

    const conflict = (dayAppts || []).find((apt) => {
      const existStart = new Date(apt.appointment_time).getTime();
      const existEnd = existStart + apt.duration_minutes * 60 * 1000;
      return existStart < newEnd && newStart < existEnd;
    });

    if (conflict) {
      setError(`This time overlaps with ${conflict.client_name}'s appointment`);
      setLoading(false);
      return;
    }

    // Check Google Calendar conflicts (skip if user already dismissed warning)
    if (!calendarWarning) {
      try {
        const res = await fetch(
          `/api/google/check-conflicts?start=${appointmentTime.toISOString()}&end=${appointmentEnd.toISOString()}`
        );
        const { conflicts } = await res.json();
        if (conflicts && conflicts.length > 0) {
          setCalendarWarning(conflicts);
          setLoading(false);
          return;
        }
      } catch {
        // Silently continue if check fails
      }
    }

    const { data: newApt, error: insertError } = await supabase.from("appointments").insert({
      user_id: user.id,
      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      appointment_time: appointmentTime.toISOString(),
      duration_minutes: parseInt(duration),
    }).select("id").single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Sync to Google Calendar (fire and forget)
    if (newApt) {
      fetch("/api/google/calendar-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: newApt.id }),
      }).catch(() => {});
    }

    router.push("/appointments");
    router.refresh();
  }

  const inputClass = "w-full px-4 py-3 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition placeholder:text-surface-500";

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto px-4 pt-8">
      <Link
        href="/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-surface-600 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Back
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-white mb-6">New appointment</h1>

      {expired && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center space-y-4">
          <Lock className="w-8 h-8 text-red-400 mx-auto" strokeWidth={1.5} />
          <div>
            <p className="text-white font-semibold mb-1">Your free trial has ended</p>
            <p className="text-sm text-surface-600">Pick a plan to keep adding appointments and sending reminders.</p>
          </div>
          <Link
            href="/billing"
            className="inline-block px-6 py-2.5 bg-brand-500 text-white rounded-lg font-semibold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
          >
            Choose a plan
          </Link>
        </div>
      )}

      {!expired && <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-surface-600 mb-1.5">
            Client name *
          </label>
          <input id="clientName" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} placeholder="John Smith" required />
        </div>

        <div>
          <label htmlFor="clientEmail" className="block text-sm font-medium text-surface-600 mb-1.5">
            Client email{reminderMethod === "email" ? " *" : ""}
          </label>
          <input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputClass} placeholder="john@example.com" />
        </div>

        <div>
          <label htmlFor="clientPhone" className="block text-sm font-medium text-surface-600 mb-1.5">
            Client phone{reminderMethod !== "email" ? " *" : ""}
          </label>
          <PhoneInput id="clientPhone" onChange={(val) => setClientPhone(val)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-surface-600 mb-1.5">
              Date *
            </label>
            <input id="date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setCalendarWarning(null); }} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-surface-600 mb-1.5">
              Time *
            </label>
            <input id="time" type="time" value={time} onChange={(e) => { setTime(e.target.value); setCalendarWarning(null); }} className={inputClass} required />
          </div>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-surface-600 mb-1.5">
            Duration
          </label>
          <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-600 mb-1.5">
            Remind via
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare },
              { value: "sms" as const, label: "SMS", icon: Phone },
              { value: "email" as const, label: "Email", icon: Mail },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setReminderMethod(value)}
                className={`relative flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  reminderMethod === value
                    ? "border-brand-500 bg-brand-500/10 text-white"
                    : "border-surface-300 bg-surface-100 text-surface-500 hover:border-surface-400"
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={2} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Google Calendar conflict warning */}
        {calendarWarning && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
            <p className="text-sm font-medium text-amber-400">
              This overlaps with your Google Calendar:
            </p>
            {calendarWarning.map((evt, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-white font-medium">{evt.summary}</span>
                <span className="text-surface-500 font-mono text-xs">
                  {new Date(evt.start).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}
                  {" – "}
                  {new Date(evt.end).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add anyway"}
              </button>
              <button
                type="button"
                onClick={() => { setCalendarWarning(null); }}
                className="px-4 py-2.5 bg-surface-100 text-surface-600 border border-surface-300 rounded-lg text-sm font-medium hover:text-white transition-colors"
              >
                Change time
              </button>
            </div>
          </div>
        )}

        {!calendarWarning && (
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add appointment"}
          </button>
        )}
      </form>}
    </div>
  );
}
