"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewAppointmentPage() {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const appointmentTime = new Date(`${date}T${time}`).toISOString();

    const { error: insertError } = await supabase.from("appointments").insert({
      user_id: user.id,
      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      appointment_time: appointmentTime,
      duration_minutes: parseInt(duration),
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/appointments");
    router.refresh();
  }

  const inputClass = "w-full px-4 py-3 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition placeholder:text-surface-500";

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <Link
        href="/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-surface-600 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Back
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-white mb-6">New appointment</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            Client email
          </label>
          <input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputClass} placeholder="john@example.com" />
        </div>

        <div>
          <label htmlFor="clientPhone" className="block text-sm font-medium text-surface-600 mb-1.5">
            Client phone
          </label>
          <input id="clientPhone" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass} placeholder="+44 7700 900000" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-surface-600 mb-1.5">
              Date *
            </label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-surface-600 mb-1.5">
              Time *
            </label>
            <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} required />
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add appointment"}
        </button>
      </form>
    </div>
  );
}
