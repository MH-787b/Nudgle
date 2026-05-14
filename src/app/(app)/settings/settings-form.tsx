"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Calendar, Check, Copy, Link2, Globe, Mail, MessageSquare, Phone, Plus, Trash2, Palmtree } from "lucide-react";
import type { BusinessHour, Holiday } from "@/lib/types";
import { QrCode } from "@/components/qr-code";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const COMMON_TIMEZONES = [
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Dublin", label: "Dublin (GMT/IST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Madrid", label: "Madrid (CET)" },
  { value: "Europe/Rome", label: "Rome (CET)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Europe/Brussels", label: "Brussels (CET)" },
  { value: "Europe/Lisbon", label: "Lisbon (WET)" },
  { value: "Europe/Athens", label: "Athens (EET)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Chicago", label: "Chicago (CST)" },
  { value: "America/Denver", label: "Denver (MST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "America/Toronto", label: "Toronto (EST)" },
  { value: "America/Vancouver", label: "Vancouver (PST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
];

const DEFAULT_HOURS: Omit<BusinessHour, "id" | "user_id">[] = [
  { day_of_week: 0, open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 1, open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 2, open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 3, open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 4, open_time: "09:00", close_time: "17:00", is_closed: false },
  { day_of_week: 5, open_time: "09:00", close_time: "17:00", is_closed: true },
  { day_of_week: 6, open_time: "09:00", close_time: "17:00", is_closed: true },
];

function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface Props {
  profile: {
    id: string;
    business_name: string | null;
    default_duration: number;
    booking_enabled: boolean;
    booking_code: string | null;
    timezone: string;
    average_appointment_value: number | null;
    google_calendar_connected: boolean;
    google_calendar_blocks_slots: boolean;
    reminder_method: 'email' | 'sms' | 'whatsapp';
  } | null;
  businessHours: BusinessHour[];
  holidays: Holiday[];
}

export function SettingsForm({ profile, businessHours, holidays: initialHolidays }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [bookingEnabled, setBookingEnabled] = useState(profile?.booking_enabled ?? false);
  const [calendarBlocksSlots, setCalendarBlocksSlots] = useState(profile?.google_calendar_blocks_slots ?? true);
  const [timezone, setTimezone] = useState(profile?.timezone ?? "Europe/London");
  const [duration, setDuration] = useState(String(profile?.default_duration ?? 30));
  const [hours, setHours] = useState(() => {
    if (businessHours.length === 7) {
      return businessHours.map((h) => ({
        day_of_week: h.day_of_week,
        open_time: h.open_time.slice(0, 5),
        close_time: h.close_time.slice(0, 5),
        is_closed: h.is_closed,
      }));
    }
    return DEFAULT_HOURS.map((h) => ({ ...h }));
  });
  const [reminderMethod, setReminderMethod] = useState<'email' | 'sms' | 'whatsapp'>(profile?.reminder_method ?? "email");
  const [appointmentValue, setAppointmentValue] = useState(String(profile?.average_appointment_value ?? ""));
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [newHolidayStart, setNewHolidayStart] = useState("");
  const [newHolidayEnd, setNewHolidayEnd] = useState("");
  const [newHolidayLabel, setNewHolidayLabel] = useState("");
  const [holidayAdding, setHolidayAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const bookingCode = profile?.booking_code;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nudgle.vercel.app";
  const bookingPageUrl = bookingCode ? `${appUrl}/book/${bookingCode}` : null;

  function updateHour(day: number, field: "open_time" | "close_time" | "is_closed", value: string | boolean) {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h))
    );
  }

  /** Adds a holiday date range to the database. */
  async function addHoliday() {
    if (!newHolidayStart || !newHolidayEnd) {
      setError("Please select both a start and end date for the holiday.");
      return;
    }
    if (newHolidayEnd < newHolidayStart) {
      setError("End date must be on or after the start date.");
      return;
    }
    setHolidayAdding(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHolidayAdding(false); return; }

    const { data, error: insertErr } = await supabase
      .from("holidays")
      .insert({
        user_id: user.id,
        start_date: newHolidayStart,
        end_date: newHolidayEnd,
        label: newHolidayLabel.trim() || null,
      })
      .select()
      .single();

    if (insertErr) {
      setError(`Failed to add holiday: ${insertErr.message}`);
    } else if (data) {
      setHolidays((prev) => [...prev, data as Holiday].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      setNewHolidayStart("");
      setNewHolidayEnd("");
      setNewHolidayLabel("");
    }
    setHolidayAdding(false);
  }

  /** Removes a holiday from the database. */
  async function deleteHoliday(id: string) {
    const { error: delErr } = await supabase.from("holidays").delete().eq("id", id);
    if (delErr) {
      setError(`Failed to delete holiday: ${delErr.message}`);
    } else {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    }
  }

  async function handleSave() {
    if (!profile) {
      setError("Profile not loaded. Please refresh the page.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Session expired — please refresh the page and log in again.");
        setSaving(false);
        return;
      }

      // Generate booking code if enabling for first time
      let code = profile.booking_code;
      if (bookingEnabled && !code) {
        code = generateBookingCode();
      }

      // Update profile
      const parsedValue = parseInt(appointmentValue);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          booking_enabled: bookingEnabled,
          default_duration: parseInt(duration),
          booking_code: code,
          timezone,
          average_appointment_value: isNaN(parsedValue) ? null : parsedValue,
          google_calendar_blocks_slots: calendarBlocksSlots,
          reminder_method: reminderMethod,
        })
        .eq("id", user.id);

      if (profileError) {
        setError(`Failed to save: ${profileError.message}`);
        setSaving(false);
        return;
      }

      // Upsert business hours
      for (const h of hours) {
        const { error: hoursError } = await supabase.from("business_hours").upsert(
          {
            user_id: user.id,
            day_of_week: h.day_of_week,
            open_time: h.open_time,
            close_time: h.close_time,
            is_closed: h.is_closed,
          },
          { onConflict: "user_id,day_of_week" }
        );

        if (hoursError) {
          setError(`Failed to save business hours: ${hoursError.message}`);
          setSaving(false);
          return;
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error("Settings save error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!bookingPageUrl) return;
    await navigator.clipboard.writeText(bookingPageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputClass =
    "px-3 py-2 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition text-sm";

  return (
    <div className="space-y-8">
      {/* Booking toggle */}
      <div className="bg-surface-100 rounded-xl border border-surface-300 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-500" strokeWidth={2} />
            <div>
              <p className="font-semibold text-white">Online Booking</p>
              <p className="text-sm text-surface-600">Let clients book online via your booking page</p>
            </div>
          </div>
          <button
            onClick={() => setBookingEnabled(!bookingEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              bookingEnabled ? "bg-brand-500" : "bg-surface-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                bookingEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Reminder method */}
      <div>
        <label className="block text-sm font-medium text-surface-600 mb-1.5">
          Remind clients via
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "email" as const, label: "Email", icon: Mail, comingSoon: false },
            { value: "sms" as const, label: "SMS", icon: Phone, comingSoon: false },
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
              {comingSoon && (
                <span className="absolute -top-2 -right-1 text-[10px] font-semibold text-brand-400 bg-surface-900 px-1 rounded">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-surface-500 mt-1.5">
          Clients without a phone number will always receive email reminders
        </p>
      </div>

      {bookingEnabled && (
        <>
          {/* Default duration */}
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1.5">
              Default appointment length
            </label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className={`w-full ${inputClass}`}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1.5">
              <Globe className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" strokeWidth={2} />
              Your timezone
            </label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={`w-full ${inputClass}`}>
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-surface-500 mt-1">
              Ensures booking times match your local hours
            </p>
          </div>

          {/* Business hours */}
          <div>
            <h2 className="text-sm font-medium text-surface-600 mb-1">Business hours</h2>
            <p className="text-xs text-surface-500 mb-3">Clients can book during these hours. Mark days you don&apos;t work as closed.</p>
            <div className="space-y-2">
              {hours.map((h) => (
                <div
                  key={h.day_of_week}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                    h.is_closed
                      ? "bg-surface-100/50 border-surface-300/50"
                      : "bg-surface-100 border-surface-300"
                  }`}
                >
                  <span
                    className={`w-16 text-sm font-medium shrink-0 ${
                      h.is_closed ? "text-surface-500" : "text-white"
                    }`}
                  >
                    {DAY_NAMES[h.day_of_week].slice(0, 3)}
                  </span>

                  {h.is_closed ? (
                    <span className="flex-1 text-sm text-surface-500">Closed</span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="time"
                        value={h.open_time}
                        onChange={(e) => updateHour(h.day_of_week, "open_time", e.target.value)}
                        className={`${inputClass} w-[110px]`}
                      />
                      <span className="text-surface-500 text-xs">to</span>
                      <input
                        type="time"
                        value={h.close_time}
                        onChange={(e) => updateHour(h.day_of_week, "close_time", e.target.value)}
                        className={`${inputClass} w-[110px]`}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => updateHour(h.day_of_week, "is_closed", !h.is_closed)}
                    className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                      h.is_closed
                        ? "text-brand-500 hover:text-brand-400"
                        : "text-surface-500 hover:text-surface-400"
                    }`}
                  >
                    {h.is_closed ? "Open" : "Close"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Holidays */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Palmtree className="w-4 h-4 text-brand-500" strokeWidth={2} />
              <h2 className="text-sm font-medium text-surface-600">Holidays</h2>
            </div>
            <p className="text-xs text-surface-500 mb-3">Block out dates when you&apos;re away. Clients won&apos;t be able to book during these periods.</p>

            {/* Existing holidays */}
            {holidays.length > 0 && (
              <div className="space-y-2 mb-3">
                {holidays.map((h) => {
                  const fmt = (d: string) => {
                    const [y, m, day] = d.split("-").map(Number);
                    return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                  };
                  const isSingleDay = h.start_date === h.end_date;
                  return (
                    <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-300 bg-surface-100">
                      <div>
                        <p className="text-sm text-white font-medium">
                          {h.label || "Holiday"}
                        </p>
                        <p className="text-xs text-surface-500">
                          {isSingleDay ? fmt(h.start_date) : `${fmt(h.start_date)} – ${fmt(h.end_date)}`}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteHoliday(h.id)}
                        className="text-surface-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add holiday form */}
            <div className="p-3 rounded-lg border border-surface-300/50 bg-surface-100/50 space-y-2">
              <input
                type="text"
                placeholder="Label (e.g. Summer holiday)"
                value={newHolidayLabel}
                onChange={(e) => setNewHolidayLabel(e.target.value)}
                className={`w-full ${inputClass}`}
              />
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-surface-500 mb-0.5">Start</label>
                  <input
                    type="date"
                    value={newHolidayStart}
                    onChange={(e) => {
                      setNewHolidayStart(e.target.value);
                      if (!newHolidayEnd || e.target.value > newHolidayEnd) setNewHolidayEnd(e.target.value);
                    }}
                    className={`w-full ${inputClass}`}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-surface-500 mb-0.5">End</label>
                  <input
                    type="date"
                    value={newHolidayEnd}
                    min={newHolidayStart || undefined}
                    onChange={(e) => setNewHolidayEnd(e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
              </div>
              <button
                onClick={addHoliday}
                disabled={holidayAdding || !newHolidayStart || !newHolidayEnd}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-surface-300 text-white rounded-lg text-sm font-medium hover:bg-surface-400 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                {holidayAdding ? "Adding..." : "Add holiday"}
              </button>
            </div>
          </div>

          {/* Booking link */}
          {bookingCode && (
            <div className="bg-surface-100 rounded-xl border border-brand-500/30 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-brand-500" strokeWidth={2} />
                <p className="text-sm font-medium text-white">Your booking page</p>
              </div>
              <p className="text-xs text-surface-600 mb-2">
                Share this link with clients to have them book themselves in &mdash; put it on social media, your website, or business cards
              </p>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-surface-900 rounded-lg text-xs text-brand-400 overflow-x-auto font-mono">
                  {bookingPageUrl}
                </code>
                <button
                  onClick={copyLink}
                  className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 active:scale-[0.98] transition-all shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" strokeWidth={2} /> : <Copy className="w-4 h-4" strokeWidth={2} />}
                </button>
              </div>
              <details className="mt-4 group">
                <summary className="text-xs font-medium text-surface-500 cursor-pointer hover:text-surface-400 transition-colors list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">&#9654;</span>
                  QR code
                </summary>
                <div className="mt-3">
                  {bookingPageUrl && <QrCode url={bookingPageUrl} businessName={profile?.business_name || undefined} />}
                </div>
              </details>
            </div>
          )}

          {!bookingCode && (
            <p className="text-xs text-surface-500">
              Save settings to generate your booking link.
            </p>
          )}
        </>
      )}

      {/* Google Calendar */}
      <div className="bg-surface-100 rounded-xl border border-surface-300 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-500" strokeWidth={2} />
            <div>
              <p className="font-semibold text-white">Google Calendar</p>
              <p className="text-sm text-surface-600">
                {profile?.google_calendar_connected
                  ? "Connected — bookings sync automatically"
                  : "Connect to prevent double-bookings — you may see a warning from Google, click Advanced → Go to Nudgle"}
              </p>
            </div>
          </div>
          {profile?.google_calendar_connected ? (
            <button
              onClick={async () => {
                if (!confirm("Disconnect Google Calendar? Existing events won't be removed.")) return;
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await supabase.from("profiles").update({
                  google_calendar_connected: false,
                  google_refresh_token: null,
                }).eq("id", user.id);
                router.refresh();
              }}
              className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => {
                const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
                const redirectUri = `${window.location.origin}/api/google/callback`;
                const scope = "https://www.googleapis.com/auth/calendar";
                const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=settings`;
                window.location.href = url;
              }}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              Connect
            </button>
          )}
        </div>
        {profile?.google_calendar_connected && (
          <div className="mt-4 pt-4 border-t border-surface-300/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Require approval for busy times</p>
                <p className="text-xs text-surface-500 mt-1">
                  {calendarBlocksSlots
                    ? "Calendar events flag booking slots — clients can still request busy times, but you'll need to approve via email. Best if you work solo."
                    : "Clients can book any open slot regardless of your calendar. Best if you have staff who can cover."}
                </p>
              </div>
              <button
                onClick={() => setCalendarBlocksSlots(!calendarBlocksSlots)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5 ${
                  calendarBlocksSlots ? "bg-brand-500" : "bg-surface-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    calendarBlocksSlots ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Average appointment value */}
      <div>
        <label className="block text-sm font-medium text-surface-600 mb-1.5">
          Average appointment value (&pound;)
        </label>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 25"
          value={appointmentValue}
          onChange={(e) => setAppointmentValue(e.target.value)}
          className={`w-full ${inputClass}`}
        />
        <p className="text-xs text-surface-500 mt-1">
          Used to show how much Nudgle saves you each month
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>

      {/* Save confirmation */}
      {saved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/15 border border-green-500/30 rounded-lg">
            <Check className="w-4 h-4 text-green-400" strokeWidth={2} />
            <p className="text-sm font-medium text-green-400">Settings saved</p>
          </div>
        </div>
      )}
    </div>
  );
}
