import { Resend } from "resend";

function getClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getClient();
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      text,
      html: html || text,
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
