import type { Appointment, BusinessHour, ConversationContext, ConversationState } from "@/lib/types";
import type { BusyPeriod } from "@/lib/google-calendar";
import { getAvailableDays, getAvailableSlots } from "./availability";

export interface HandleResult {
  reply: string;
  state: ConversationState;
  context: ConversationContext;
  createAppointment?: {
    clientName: string;
    clientPhone: string;
    appointmentTime: string;
    durationMinutes: number;
    remindersOptIn: boolean;
  };
  restart?: boolean;
}

/** Start a new booking conversation — show available days */
export function startConversation(
  businessName: string,
  businessHours: BusinessHour[],
  clientName: string,
  timezone: string = "Europe/London"
): HandleResult {
  const availableDays = getAvailableDays(businessHours, timezone);

  if (availableDays.length === 0) {
    return {
      reply: `Hi! Thanks for contacting ${businessName}. Unfortunately there are no available slots in the next 7 days. Please contact us directly.`,
      state: "completed",
      context: {},
    };
  }

  const dayList = availableDays.map((d, i) => `${i + 1}. ${d.label}`).join("\n");

  return {
    reply: `Hi${clientName ? ` ${clientName}` : ""}! Welcome to ${businessName}.\n\nI can help you book an appointment. What day works for you?\n\n${dayList}\n\nReply with a number.`,
    state: "selecting_day",
    context: {
      days: availableDays,
      clientName,
    },
  };
}

/** Handle day selection — show available time slots */
export function handleDaySelection(
  body: string,
  context: ConversationContext,
  businessHours: BusinessHour[],
  appointments: Appointment[],
  durationMinutes: number,
  timezone: string = "Europe/London",
  busyPeriods: BusyPeriod[] = []
): HandleResult {
  const num = parseInt(body.trim());
  const days = context.days || [];

  if (isNaN(num) || num < 1 || num > days.length) {
    const dayList = days.map((d, i) => `${i + 1}. ${d.label}`).join("\n");
    return {
      reply: `Please reply with a number between 1 and ${days.length}:\n\n${dayList}`,
      state: "selecting_day",
      context,
    };
  }

  const selectedDay = days[num - 1];
  const slots = getAvailableSlots(selectedDay.date, businessHours, appointments, durationMinutes, timezone, busyPeriods);

  if (slots.length === 0) {
    const dayList = days.map((d, i) => `${i + 1}. ${d.label}`).join("\n");
    return {
      reply: `Sorry, no times available on ${selectedDay.label}. Pick another day:\n\n${dayList}`,
      state: "selecting_day",
      context,
    };
  }

  const slotList = slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n");

  return {
    reply: `Times on ${selectedDay.label}:\n\n${slotList}\n\nReply with a number.`,
    state: "selecting_time",
    context: {
      ...context,
      selectedDay: selectedDay.date,
      slots,
    },
  };
}

/** Handle time selection — show confirmation prompt */
export function handleTimeSelection(
  body: string,
  context: ConversationContext,
  durationMinutes: number,
  businessName: string
): HandleResult {
  const num = parseInt(body.trim());
  const slots = context.slots || [];

  if (isNaN(num) || num < 1 || num > slots.length) {
    const slotList = slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n");
    return {
      reply: `Please reply with a number between 1 and ${slots.length}:\n\n${slotList}`,
      state: "selecting_time",
      context,
    };
  }

  const selectedSlot = slots[num - 1];
  const dayLabel = context.days?.find((d) => d.date === context.selectedDay)?.label || context.selectedDay;

  return {
    reply: `Your booking:\n\n${dayLabel} at ${selectedSlot.label}\n${durationMinutes} min at ${businessName}\n\nReply YES to confirm or NO to start over.`,
    state: "confirming",
    context: {
      ...context,
      selectedTime: selectedSlot.time,
    },
  };
}

/** Handle confirmation — create appointment or restart */
export function handleConfirmation(
  body: string,
  context: ConversationContext,
  durationMinutes: number,
  businessName: string,
  clientPhone: string,
  timezone: string = "Europe/London"
): HandleResult {
  const upper = body.trim().toUpperCase();

  if (upper === "YES" || upper === "Y" || upper === "CONFIRM") {
    return {
      reply: "Would you like to receive a reminder before your appointment?\n\nReply YES or NO (default is YES).",
      state: "asking_reminder",
      context,
    };
  }

  if (upper === "NO" || upper === "N" || upper === "RESTART") {
    return {
      reply: "",
      state: "selecting_day",
      context: { clientName: context.clientName },
      restart: true,
    };
  }

  return {
    reply: "Reply YES to confirm your booking, or NO to start over.",
    state: "confirming",
    context,
  };
}

/** Handle reminder opt-in question — create the appointment with the client's preference */
export function handleReminderQuestion(
  body: string,
  context: ConversationContext,
  durationMinutes: number,
  businessName: string,
  clientPhone: string,
  timezone: string = "Europe/London"
): HandleResult {
  const upper = body.trim().toUpperCase();
  const optOut = upper === "NO" || upper === "N";
  const remindersOptIn = !optOut;

  const dateStr = context.selectedDay!;
  const timeStr = context.selectedTime!;
  const appointmentTime = toISOWithTz(dateStr, timeStr, timezone);

  const dayLabel = context.days?.find((d) => d.date === context.selectedDay)?.label || context.selectedDay;
  const timeLabel = context.slots?.find((s) => s.time === context.selectedTime)?.label || context.selectedTime;

  const reminderNote = remindersOptIn
    ? "\n\nYou'll get a reminder before your appointment."
    : "";

  return {
    reply: `Booked! ${businessName} will see you on ${dayLabel} at ${timeLabel}.${reminderNote}`,
    state: "completed",
    context,
    createAppointment: {
      clientName: context.clientName || "WhatsApp Booking",
      clientPhone,
      appointmentTime,
      durationMinutes,
      remindersOptIn,
    },
  };
}

/** Convert a date string + time string in a timezone to an ISO timestamp */
function toISOWithTz(dateStr: string, timeStr: string, tz: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Create a reference UTC date
  const utcRef = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

  // Find the offset: what does this UTC instant look like in the target timezone?
  const inTz = new Date(utcRef.toLocaleString("en-US", { timeZone: tz }));
  const offsetMs = utcRef.getTime() - inTz.getTime();

  // The actual UTC time for "year-month-day hours:minutes in tz"
  const actualUtc = new Date(utcRef.getTime() + offsetMs);
  return actualUtc.toISOString();
}
