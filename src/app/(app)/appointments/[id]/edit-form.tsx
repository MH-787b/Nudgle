"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Phone } from "lucide-react";
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
  const [reminderMethod, setReminderMethod] = useState<"email" | "sms" | "whatsapp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const router = useRouter();
  const supabase = createClient();

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

    const appointmentTime = new Date(`${date}T${time}`).toISOString();

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        client_name: clientName,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        appointment_time: appointmentTime,
        duration_minutes: parseInt(duration),
      })
      .eq("id", appointment.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
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
          Client email{reminderMethod === "email" ? " *" : ""}
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
          Client phone{reminderMethod !== "email" ? " *" : ""}
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

      <div>
        <label className="block text-sm font-medium text-surface-600 mb-1.5">
          Remind via
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: "whatsapp" as const, label: "WhatsApp", icon: MessageSquare, comingSoon: true },
            { value: "sms" as const, label: "SMS", icon: Phone, comingSoon: true },
            { value: "email" as const, label: "Email", icon: Mail, comingSoon: false },
          ]).map(({ value, label, icon: Icon, comingSoon }) => (
            <button
              key={value}
              type="button"
              onClick={() => !comingSoon && setReminderMethod(value)}
              disabled={comingSoon}
              className={`relative flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                comingSoon
                  ? "border-surface-300 bg-surface-100 text-surface-500 opacity-50 cursor-not-allowed"
                  : reminderMethod === value
                    ? "border-brand-500 bg-brand-500/10 text-white"
                    : "border-surface-300 bg-surface-100 text-surface-500 hover:border-surface-400"
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={2} />
              {label}
              {comingSoon && <span className="text-[9px] font-mono text-surface-500">Soon</span>}
            </button>
          ))}
        </div>
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
