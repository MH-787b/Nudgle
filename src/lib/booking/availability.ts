import type { Appointment, BusinessHour, Holiday } from "@/lib/types";
import type { BusyPeriod } from "@/lib/google-calendar";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Default Mon–Fri 9–5, Sat–Sun closed — used when no business_hours rows exist yet. */
const DEFAULT_HOURS: BusinessHour[] = [
  { id: "", user_id: "", day_of_week: 0, open_time: "09:00", close_time: "17:00", is_closed: false },
  { id: "", user_id: "", day_of_week: 1, open_time: "09:00", close_time: "17:00", is_closed: false },
  { id: "", user_id: "", day_of_week: 2, open_time: "09:00", close_time: "17:00", is_closed: false },
  { id: "", user_id: "", day_of_week: 3, open_time: "09:00", close_time: "17:00", is_closed: false },
  { id: "", user_id: "", day_of_week: 4, open_time: "09:00", close_time: "17:00", is_closed: false },
  { id: "", user_id: "", day_of_week: 5, open_time: "09:00", close_time: "17:00", is_closed: true },
  { id: "", user_id: "", day_of_week: 6, open_time: "09:00", close_time: "17:00", is_closed: true },
];

/** Returns true if a YYYY-MM-DD date string falls within any holiday range. */
function isHoliday(dateStr: string, holidays: Holiday[]): boolean {
  return holidays.some((h) => dateStr >= h.start_date && dateStr <= h.end_date);
}

/** Convert JS getDay() (0=Sun) to our DB day (0=Mon) */
function jsToDbDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/** Get current date/time in a specific timezone */
function nowInTz(tz: string): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: tz });
  return new Date(str);
}

/** Create a Date representing a specific date/time in a timezone, returned as UTC */
export function dateInTz(year: number, month: number, day: number, hours: number, minutes: number, tz: string): Date {
  // Build an ISO-ish string and use the timezone to interpret it
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
  // Get the UTC offset for this specific datetime in this timezone
  const tempDate = new Date(dateStr + "Z"); // treat as UTC first
  const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = tempDate.toLocaleString("en-US", { timeZone: tz });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offsetMs = utcDate.getTime() - tzDate.getTime();
  // The actual UTC time = local time + offset
  return new Date(tempDate.getTime() + offsetMs);
}

/** Get the next N calendar days that the business is open */
export function getAvailableDays(
  businessHours: BusinessHour[],
  timezone: string = "Europe/London",
  daysAhead: number = 7,
  holidays: Holiday[] = []
): { date: string; label: string }[] {
  const hours = businessHours.length > 0 ? businessHours : DEFAULT_HOURS;
  const result: { date: string; label: string }[] = [];
  const now = nowInTz(timezone);

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    const dbDay = jsToDbDay(date.getDay());
    const dayHours = hours.find((h) => h.day_of_week === dbDay);
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

    if (dayHours && !dayHours.is_closed && !isHoliday(dateStr, holidays)) {
      const dayName = DAY_LABELS[dbDay];
      const day = date.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      result.push({ date: dateStr, label: `${dayName} ${day} ${month}` });
    }
  }

  return result;
}

/** Get available time slots for a specific date, marking Google Calendar conflicts */
export function getAvailableSlots(
  dateStr: string,
  businessHours: BusinessHour[],
  appointments: Appointment[],
  durationMinutes: number,
  timezone: string = "Europe/London",
  busyPeriods: BusyPeriod[] = [],
  holidays: Holiday[] = []
): { time: string; label: string; conflicted: boolean }[] {
  if (isHoliday(dateStr, holidays)) return [];

  const effectiveHours = businessHours.length > 0 ? businessHours : DEFAULT_HOURS;
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dbDay = jsToDbDay(dateObj.getDay());
  const hours = effectiveHours.find((h) => h.day_of_week === dbDay);

  if (!hours || hours.is_closed) return [];

  const [openH, openM] = hours.open_time.split(":").map(Number);
  const [closeH, closeM] = hours.close_time.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const nowUtc = new Date();

  const slots: { time: string; label: string; conflicted: boolean }[] = [];

  for (let mins = openMinutes; mins + durationMinutes <= closeMinutes; mins += 30) {
    const slotH = Math.floor(mins / 60);
    const slotM = mins % 60;

    // Convert this slot's time to UTC for comparison
    const slotUtc = dateInTz(year, month - 1, day, slotH, slotM, timezone);

    // Skip slots in the past
    if (slotUtc <= nowUtc) continue;

    // Check for conflicts with existing Nudgle appointments (hard block — can't double-book)
    const slotEndUtc = new Date(slotUtc.getTime() + durationMinutes * 60 * 1000);
    const hasConflict = appointments.some((apt) => {
      if (apt.status === "cancelled") return false;
      const aptStart = new Date(apt.appointment_time);
      const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60 * 1000);
      return slotUtc < aptEnd && slotEndUtc > aptStart;
    });

    // Hard conflicts with existing appointments are still filtered out
    if (hasConflict) continue;

    // Google Calendar conflicts are flagged but slot is still shown
    // 30-min buffer on each side — slots near a calendar event also need approval
    const BUFFER_MS = 30 * 60 * 1000;
    const hasBusyConflict = busyPeriods.some((busy) => {
      const busyStart = new Date(new Date(busy.start).getTime() - BUFFER_MS);
      const busyEnd = new Date(new Date(busy.end).getTime() + BUFFER_MS);
      return slotUtc < busyEnd && slotEndUtc > busyStart;
    });

    const period = slotH >= 12 ? "PM" : "AM";
    const displayH = slotH === 0 ? 12 : slotH > 12 ? slotH - 12 : slotH;
    const displayM = slotM.toString().padStart(2, "0");

    slots.push({
      time: `${slotH.toString().padStart(2, "0")}:${displayM}`,
      label: `${displayH}:${displayM} ${period}`,
      conflicted: hasBusyConflict,
    });
  }

  return slots;
}
