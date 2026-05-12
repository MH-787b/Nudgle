import type { Appointment, BusinessHour } from "@/lib/types";
import type { BusyPeriod } from "@/lib/google-calendar";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  daysAhead: number = 7
): { date: string; label: string }[] {
  const result: { date: string; label: string }[] = [];
  const now = nowInTz(timezone);

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    const dbDay = jsToDbDay(date.getDay());
    const hours = businessHours.find((h) => h.day_of_week === dbDay);

    if (hours && !hours.is_closed) {
      const dayName = DAY_LABELS[dbDay];
      const day = date.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
      result.push({ date: dateStr, label: `${dayName} ${day} ${month}` });
    }
  }

  return result;
}

/** Get available time slots for a specific date */
export function getAvailableSlots(
  dateStr: string,
  businessHours: BusinessHour[],
  appointments: Appointment[],
  durationMinutes: number,
  timezone: string = "Europe/London",
  busyPeriods: BusyPeriod[] = []
): { time: string; label: string }[] {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dbDay = jsToDbDay(dateObj.getDay());
  const hours = businessHours.find((h) => h.day_of_week === dbDay);

  if (!hours || hours.is_closed) return [];

  const [openH, openM] = hours.open_time.split(":").map(Number);
  const [closeH, closeM] = hours.close_time.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const nowUtc = new Date();

  const slots: { time: string; label: string }[] = [];

  for (let mins = openMinutes; mins + durationMinutes <= closeMinutes; mins += 30) {
    const slotH = Math.floor(mins / 60);
    const slotM = mins % 60;

    // Convert this slot's time to UTC for comparison
    const slotUtc = dateInTz(year, month - 1, day, slotH, slotM, timezone);

    // Skip slots in the past
    if (slotUtc <= nowUtc) continue;

    // Check for conflicts with existing appointments
    const slotEndUtc = new Date(slotUtc.getTime() + durationMinutes * 60 * 1000);
    const hasConflict = appointments.some((apt) => {
      if (apt.status === "cancelled") return false;
      const aptStart = new Date(apt.appointment_time);
      const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60 * 1000);
      return slotUtc < aptEnd && slotEndUtc > aptStart;
    });

    const hasBusyConflict = busyPeriods.some((busy) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return slotUtc < busyEnd && slotEndUtc > busyStart;
    });

    if (!hasConflict && !hasBusyConflict) {
      const period = slotH >= 12 ? "PM" : "AM";
      const displayH = slotH === 0 ? 12 : slotH > 12 ? slotH - 12 : slotH;
      const displayM = slotM.toString().padStart(2, "0");

      slots.push({
        time: `${slotH.toString().padStart(2, "0")}:${displayM}`,
        label: `${displayH}:${displayM} ${period}`,
      });
    }
  }

  return slots;
}
