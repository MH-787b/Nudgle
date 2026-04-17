import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReminder } from "@/lib/messaging";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  // Verify cron secret (supports both custom header and Vercel's CRON_SECRET)
  const authHeader = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && vercelCron !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { sent24h: 0, sent2h: 0, followUps: 0, errors: 0 };

  // --- 24-hour reminders ---
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

  const { data: appointments24h } = await supabase
    .from("appointments")
    .select("*, profiles:user_id(*)")
    .eq("reminder_24h_sent", false)
    .neq("status", "cancelled")
    .gte("appointment_time", in23h.toISOString())
    .lte("appointment_time", in24h.toISOString());

  for (const apt of appointments24h || []) {
    const profile = apt.profiles;
    if (!profile?.reminders_active) continue;

    // Check usage limits
    if (profile.reminders_used_this_month >= profile.reminders_limit) continue;

    const channel = profile.reminder_method || "email";
    const recipient = (channel === "sms" || channel === "whatsapp") ? apt.client_phone : apt.client_email;
    if (!recipient) continue;

    const result = await sendReminder({
      channel,
      recipient,
      clientName: apt.client_name,
      appointmentTime: apt.appointment_time,
      businessName: profile.business_name,
    });

    if (result.success) {
      // Log message
      await supabase.from("messages").insert({
        appointment_id: apt.id,
        user_id: apt.user_id,
        channel,
        message_type: "reminder_24h",
        recipient,
        content: `24h reminder for ${apt.client_name}`,
        status: "sent",
        external_id: result.externalId || null,
      });

      // Mark as sent
      await supabase
        .from("appointments")
        .update({ reminder_24h_sent: true })
        .eq("id", apt.id);

      // Increment usage
      await supabase
        .from("profiles")
        .update({ reminders_used_this_month: profile.reminders_used_this_month + 1 })
        .eq("id", apt.user_id);

      results.sent24h++;
    } else {
      results.errors++;
    }
  }

  // --- 2-hour reminders ---
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 1 * 60 * 60 * 1000);

  const { data: appointments2h } = await supabase
    .from("appointments")
    .select("*, profiles:user_id(*)")
    .eq("reminder_2h_sent", false)
    .eq("reminder_24h_sent", true)
    .neq("status", "cancelled")
    .neq("status", "confirmed")
    .gte("appointment_time", in1h.toISOString())
    .lte("appointment_time", in2h.toISOString());

  for (const apt of appointments2h || []) {
    const profile = apt.profiles;
    if (!profile?.reminders_active) continue;
    if (profile.reminders_used_this_month >= profile.reminders_limit) continue;

    const channel = profile.reminder_method || "email";
    const recipient = (channel === "sms" || channel === "whatsapp") ? apt.client_phone : apt.client_email;
    if (!recipient) continue;

    const result = await sendReminder({
      channel,
      recipient,
      clientName: apt.client_name,
      appointmentTime: apt.appointment_time,
      businessName: profile.business_name,
    });

    if (result.success) {
      await supabase.from("messages").insert({
        appointment_id: apt.id,
        user_id: apt.user_id,
        channel,
        message_type: "reminder_2h",
        recipient,
        content: `2h follow-up reminder for ${apt.client_name}`,
        status: "sent",
        external_id: result.externalId || null,
      });

      await supabase
        .from("appointments")
        .update({ reminder_2h_sent: true })
        .eq("id", apt.id);

      await supabase
        .from("profiles")
        .update({ reminders_used_this_month: profile.reminders_used_this_month + 1 })
        .eq("id", apt.user_id);

      results.sent2h++;
    } else {
      results.errors++;
    }
  }

  return NextResponse.json({ success: true, results });
}
