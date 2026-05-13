import { Resend } from "resend";

function getClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface Attachment {
  filename: string;
  content: Buffer;
  content_type?: string;
}

/** Generate an .ics calendar file for an appointment. */
export function generateIcs(params: {
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}): Buffer {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@nudgle.co.uk`;
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const now = fmt(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nudgle//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmt(params.start)}`,
    `DTEND:${fmt(params.end)}`,
    `SUMMARY:${params.summary}`,
    ...(params.description ? [`DESCRIPTION:${params.description}`] : []),
    ...(params.location ? [`LOCATION:${params.location}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return Buffer.from(lines.join("\r\n"), "utf-8");
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  attachments?: Attachment[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getClient();
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      text,
      html: html || text,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        content_type: a.content_type,
      })),
    });
    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to send email:", msg);
    return { success: false, error: msg };
  }
}
