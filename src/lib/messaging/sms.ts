import twilio from "twilio";

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

export async function sendSMS(to: string, body: string): Promise<string | null> {
  try {
    const client = getClient();
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    return message.sid;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return null;
  }
}

export async function sendWhatsApp(to: string, body: string): Promise<string | null> {
  try {
    const client = getClient();
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";
    // Env var may already include "whatsapp:" prefix — normalise both from and to
    const from = whatsappNumber.startsWith("whatsapp:") ? whatsappNumber : `whatsapp:${whatsappNumber}`;
    const toNum = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const message = await client.messages.create({
      body,
      from,
      to: toNum,
    });
    return message.sid;
  } catch (error) {
    console.error("Failed to send WhatsApp:", error);
    return null;
  }
}
