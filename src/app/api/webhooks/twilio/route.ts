import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = (formData.get("Body") as string || "").trim().toUpperCase();

  if (!from) {
    return NextResponse.json({ error: "Missing From" }, { status: 400 });
  }

  // Find the most recent message sent to this phone number
  const { data: recentMessage } = await supabase
    .from("messages")
    .select("*, appointments(*)")
    .eq("recipient", from)
    .eq("channel", "sms")
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();

  if (!recentMessage) {
    // No matching message found — respond gracefully
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for your message. We couldn't match it to an appointment.</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  const appointmentId = recentMessage.appointment_id;
  const isConfirmation = body === "YES" || body === "Y" || body === "CONFIRM";

  // Record the confirmation
  await supabase.from("confirmations").insert({
    appointment_id: appointmentId,
    message_id: recentMessage.id,
    reply_text: body,
    confirmed: isConfirmation,
  });

  if (isConfirmation) {
    // Update appointment status
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", appointmentId);

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks! Your appointment is confirmed. See you then!</Message></Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for your reply. To confirm your appointment, please reply YES.</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
