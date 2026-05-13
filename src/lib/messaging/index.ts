import { sendSMS, sendWhatsApp } from "./sms";
import { sendEmail, generateIcs } from "./email";
import type { ReminderChannel } from "@/lib/types";

interface ReminderParams {
  channel: ReminderChannel;
  recipient: string;
  clientName: string;
  appointmentTime: string;
  durationMinutes?: number;
  businessName?: string;
  timezone?: string;
  appointmentId?: string;
}

export function formatReminderMessage(params: ReminderParams): string {
  const time = new Date(params.appointmentTime).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: params.timezone || "Europe/London",
  });

  const business = params.businessName ? ` with ${params.businessName}` : "";

  if (params.channel === "sms" || params.channel === "whatsapp") {
    return `Reminder: You have an appointment${business} at ${time}. Reply YES to confirm.`;
  }

  return `Reminder: You have an appointment${business} at ${time}. Please reply to confirm your attendance.`;
}

export async function sendReminder(
  params: ReminderParams
): Promise<{ success: boolean; externalId?: string }> {
  const message = formatReminderMessage(params);

  if (params.channel === "sms") {
    const sid = await sendSMS(params.recipient, message);
    return { success: !!sid, externalId: sid || undefined };
  }

  if (params.channel === "email") {
    const subject = params.businessName
      ? `Appointment reminder — ${params.businessName}`
      : "Appointment reminder";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nudgle.vercel.app";
    const confirmUrl = `${appUrl}/api/confirm/${params.appointmentId}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #f97316; margin: 0 0 24px 0; font-size: 22px;">Appointment Reminder</h2>
        <p style="font-size: 16px; color: #374151; margin: 0 0 8px 0;">Hi ${params.clientName},</p>
        <p style="font-size: 16px; color: #374151; margin: 0 0 32px 0; line-height: 1.5;">${message}</p>
        <div style="text-align: center;">
          <a href="${confirmUrl}?response=yes"
             style="display: block; padding: 14px 32px; background: #16a34a; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center;">
            Yes, I'll be there
          </a>
          <div style="height: 12px;"></div>
          <a href="${confirmUrl}?response=no"
             style="display: block; padding: 14px 32px; background: #dc2626; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center;">
            Can't make it
          </a>
        </div>
        <p style="margin: 32px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
          Sent via Nudgle — appointment reminders for small businesses
          <br />Please do not reply to this email.
        </p>
      </div>
    `;

    const attachments = params.durationMinutes ? [{
      filename: "appointment.ics",
      content: generateIcs({
        summary: `Appointment${params.businessName ? ` with ${params.businessName}` : ""}`,
        start: params.appointmentTime,
        end: new Date(new Date(params.appointmentTime).getTime() + params.durationMinutes * 60 * 1000).toISOString(),
        description: "Booked via Nudgle",
      }),
      content_type: "text/calendar" as const,
    }] : undefined;

    const result = await sendEmail(params.recipient, subject, message, html, attachments);
    return { success: result.success, ...(!result.success && { error: result.error }) };
  }

  if (params.channel === "whatsapp") {
    const sid = await sendWhatsApp(params.recipient, message);
    return { success: !!sid, externalId: sid || undefined };
  }

  return { success: false };
}
