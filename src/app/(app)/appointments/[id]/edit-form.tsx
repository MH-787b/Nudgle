"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Appointment } from "@/lib/types";

export function EditForm({ appointment }: { appointment: Appointment }) {
  const [clientName, setClientName] = useState(appointment.client_name);
  const [clientEmail, setClientEmail] = useState(appointment.client_email || "");
  const [clientPhone, setClientPhone] = useState(appointment.client_phone || "");
  const [date, setDate] = useState(
    new Date(appointment.appointment_time).toLocaleDateString("en-CA")
  );
  const [time, setTime] = useState(
    new Date(appointment.appointment_time).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
  const [duration, setDuration] = useState(String(appointment.duration_minutes));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const appointmentTime = new Date(`${date}T${time}`);
    const appointmentEnd = new Date(appointmentTime.getTime() + parseInt(duration) * 60 * 1000);

    // Check for overlapping appointments (exclude this one)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dayStart = new Date(`${date}T00:00:00`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59`).toISOString();

    const { data: dayAppts } = await supabase
      .from("appointments")
      .select("id, client_name, appointment_time, duration_minutes")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .neq("id", appointment.id)
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

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        client_name: clientName,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        appointment_time: appointmentTime.toISOString(),
        duration_minutes: parseInt(duration),
      })
      .eq("id", appointment.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Update Google Calendar event (fire and forget)
    if (appointment.google_event_id) {
      fetch("/api/google/calendar-event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointment.id }),
      }).catch(() => {});
    }

    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors"
      >
        Edit appointment
      </button>
    );
  }

  const inputClass =
    "w-full px-4 py-3 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition placeholder:text-surface-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="editClientName" className="block text-sm font-medium text-surface-600 mb-1.5">
          Client name *
        </label>
        <input
          id="editClientName"
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className={inputClass}
          required
        />
      </div>

      <div>
        <label htmlFor="editClientEmail" className="block text-sm font-medium text-surface-600 mb-1.5">
          Client email
        </label>
        <input
          id="editClientEmail"
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="editClientPhone" className="block text-sm font-medium text-surface-600 mb-1.5">
          Client phone
        </label>
        <input
          id="editClientPhone"
          type="tel"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          className={inputClass}
          placeholder="+44 7700 900000"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="editDate" className="block text-sm font-medium text-surface-600 mb-1.5">
            Date *
          </label>
          <input
            id="editDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="editTime" className="block text-sm font-medium text-surface-600 mb-1.5">
            Time *
          </label>
          <input
            id="editTime"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="editDuration" className="block text-sm font-medium text-surface-600 mb-1.5">
          Duration
        </label>
        <select
          id="editDuration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className={inputClass}
        >
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-6 py-3 bg-surface-100 text-surface-600 border border-surface-300 rounded-lg font-medium hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
