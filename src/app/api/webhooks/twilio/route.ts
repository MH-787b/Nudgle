import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  startConversation,
  handleDaySelection,
  handleTimeSelection,
  handleConfirmation,
} from "@/lib/booking/conversation";
import type { Appointment, BusinessHour, ConversationContext, ConversationState } from "@/lib/types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function twiml(message: string) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

function emptyTwiml() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = (formData.get("Body") as string || "").trim();
  const profileName = (formData.get("ProfileName") as string) || "";

  if (!from) {
    return NextResponse.json({ error: "Missing From" }, { status: 400 });
  }

  const isWhatsApp = from.startsWith("whatsapp:");

  if (isWhatsApp) {
    return handleWhatsApp(supabase, from, body, profileName);
  }

  return handleSmsConfirmation(supabase, from, body);
}

// ── WhatsApp booking flow ──────────────────────────────────────────

async function handleWhatsApp(
  supabase: ReturnType<typeof getSupabase>,
  from: string,
  body: string,
  profileName: string
) {
  const clientPhone = from.replace("whatsapp:", "");
  const upperBody = body.toUpperCase().trim();

  // Check for active conversation (updated in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existingConvo } = await supabase
    .from("conversations")
    .select("*")
    .eq("client_phone", clientPhone)
    .neq("state", "completed")
    .gte("updated_at", oneHourAgo)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  // ── New booking request ──
  if (upperBody.startsWith("BOOK ")) {
    const code = body.substring(5).trim().toUpperCase();

    const { data: business } = await supabase
      .from("profiles")
      .select("*")
      .eq("booking_code", code)
      .eq("booking_enabled", true)
      .single();

    if (!business) {
      return twiml("Sorry, that booking code wasn't recognised. Please check the link and try again.");
    }

    const { data: hours } = await supabase
      .from("business_hours")
      .select("*")
      .eq("user_id", business.id)
      .order("day_of_week");

    if (!hours || hours.length === 0) {
      return twiml("Sorry, this business hasn't set up their booking hours yet. Please contact them directly.");
    }

    // Clear any old conversations for this phone + business
    await supabase
      .from("conversations")
      .delete()
      .eq("client_phone", clientPhone)
      .eq("business_id", business.id)
      .neq("state", "completed");

    const timezone = business.timezone || "Europe/London";
    const result = startConversation(
      business.business_name || "this business",
      hours as BusinessHour[],
      profileName,
      timezone
    );

    // Save conversation
    await supabase.from("conversations").insert({
      business_id: business.id,
      client_phone: clientPhone,
      state: result.state,
      context: result.context,
    });

    return twiml(result.reply);
  }

  // ── Continue existing conversation ──
  if (existingConvo) {
    const convo = existingConvo as {
      id: string;
      business_id: string;
      state: ConversationState;
      context: ConversationContext;
    };

    const { data: business } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", convo.business_id)
      .single();

    if (!business) return twiml("Sorry, something went wrong. Please try again.");

    const { data: hours } = await supabase
      .from("business_hours")
      .select("*")
      .eq("user_id", business.id)
      .order("day_of_week");

    if (!hours) return twiml("Sorry, something went wrong. Please try again.");

    const businessName = business.business_name || "this business";
    const duration = business.default_duration || 30;
    const timezone = business.timezone || "Europe/London";
    let result;

    if (convo.state === "selecting_day") {
      // Fetch appointments for availability check
      const appointments = await getAppointmentsForWeek(supabase, business.id);
      result = handleDaySelection(body, convo.context, hours as BusinessHour[], appointments, duration, timezone);
    } else if (convo.state === "selecting_time") {
      result = handleTimeSelection(body, convo.context, duration, businessName);
    } else if (convo.state === "confirming") {
      result = handleConfirmation(body, convo.context, duration, businessName, clientPhone, timezone);
    } else {
      return twiml("Sorry, something went wrong. Please try again.");
    }

    // Handle restart
    if (result.restart) {
      result = startConversation(businessName, hours as BusinessHour[], convo.context.clientName || profileName, timezone);
    }

    // Create appointment if needed
    if (result.createAppointment) {
      await supabase.from("appointments").insert({
        user_id: business.id,
        client_name: result.createAppointment.clientName,
        client_phone: result.createAppointment.clientPhone,
        appointment_time: result.createAppointment.appointmentTime,
        duration_minutes: result.createAppointment.durationMinutes,
        status: "confirmed",
      });
    }

    // Update conversation
    await supabase
      .from("conversations")
      .update({
        state: result.state,
        context: result.context,
        updated_at: new Date().toISOString(),
      })
      .eq("id", convo.id);

    return twiml(result.reply);
  }

  // ── No active conversation and no BOOK command ──
  // Check if this is a confirmation reply to a reminder
  const { data: recentMessage } = await supabase
    .from("messages")
    .select("*, appointments(*)")
    .eq("recipient", clientPhone)
    .eq("channel", "whatsapp")
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();

  if (recentMessage) {
    return handleReminderReply(supabase, recentMessage, body);
  }

  return twiml("Hi! To book an appointment, please use the booking link provided by the business.");
}

// ── SMS confirmation (original logic) ──────────────────────────────

async function handleSmsConfirmation(
  supabase: ReturnType<typeof getSupabase>,
  from: string,
  body: string
) {
  const upperBody = body.toUpperCase().trim();

  const { data: recentMessage } = await supabase
    .from("messages")
    .select("*, appointments(*)")
    .eq("recipient", from)
    .eq("channel", "sms")
    .order("sent_at", { ascending: false })
    .limit(1)
    .single();

  if (!recentMessage) {
    return twiml("Thanks for your message. We couldn't match it to an appointment.");
  }

  return handleReminderReply(supabase, recentMessage, body);
}

// ── Shared reminder reply handler ──────────────────────────────────

async function handleReminderReply(
  supabase: ReturnType<typeof getSupabase>,
  recentMessage: { id: string; appointment_id: string },
  body: string
) {
  const upperBody = body.toUpperCase().trim();
  const isConfirmation = upperBody === "YES" || upperBody === "Y" || upperBody === "CONFIRM";

  await supabase.from("confirmations").insert({
    appointment_id: recentMessage.appointment_id,
    message_id: recentMessage.id,
    reply_text: body,
    confirmed: isConfirmation,
  });

  if (isConfirmation) {
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", recentMessage.appointment_id);

    return twiml("Thanks! Your appointment is confirmed. See you then!");
  }

  return twiml("Thanks for your reply. To confirm your appointment, please reply YES.");
}

// ── Helpers ────────────────────────────────────────────────────────

async function getAppointmentsForWeek(
  supabase: ReturnType<typeof getSupabase>,
  userId: string
): Promise<Appointment[]> {
  const now = new Date();
  const weekLater = new Date(now);
  weekLater.setDate(weekLater.getDate() + 7);

  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .gte("appointment_time", now.toISOString())
    .lte("appointment_time", weekLater.toISOString())
    .neq("status", "cancelled");

  return (data || []) as Appointment[];
}
