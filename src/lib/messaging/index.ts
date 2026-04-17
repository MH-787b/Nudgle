import { sendSMS, sendWhatsApp } from "./sms";
import { sendEmail } from "./email";
import type { ReminderChannel } from "@/lib/types";

interface ReminderParams {
  channel: ReminderChannel;
  recipient: string;
  clientName: string;
  appointmentTime: string;
  businessName?: string;
}

export function formatReminderMessage(params: ReminderParams): string {
  const time = new Date(params.appointmentTime).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #f97316; margin-bottom: 16px;">Appointment Reminder</h2>
        <p style="font-size: 16px; color: #374151;">Hi ${params.clientName},</p>
        <p style="font-size: 16px; color: #374151;">${message}</p>
        <div style="margin-top: 24px; padding: 16px; background: #fff7ed; border-radius: 12px;">
          <p style="margin: 0; font-size: 14px; color: #9a3412;">
            Reply to this email or click below to confirm your appointment.
          </p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
          Sent via Nudgle — appointment reminders for small businesses
        </p>
      </div>
    `;

    const success = await sendEmail(params.recipient, subject, message, html);
    return { success };
  }

  if (params.channel === "whatsapp") {
    const sid = await sendWhatsApp(params.recipient, message);
    return { success: !!sid, externalId: sid || undefined };
  }

  return { success: false };
}
