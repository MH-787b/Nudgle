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
    const message = await client.messages.create({
      body,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
    });
    return message.sid;
  } catch (error) {
    console.error("Failed to send WhatsApp:", error);
    return null;
  }
}
