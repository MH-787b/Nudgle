import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReminder } from "@/lib/messaging";
import { PLAN_LIMITS } from "@/lib/types";
import type { PlanType, ReminderChannel } from "@/lib/types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Get the effective plan, accounting for expired trials */
function getEffectivePlan(profile: { plan: string; trial_ends_at: string | null }): PlanType {
  if (profile.plan === 'trial') {
    if (!profile.trial_ends_at || new Date(profile.trial_ends_at) < new Date()) {
      return 'starter';
    }
  }
  return profile.plan as PlanType;
}

/** Resolve which channel to actually use, respecting plan restrictions */
function resolveChannel(
  preferred: ReminderChannel,
  plan: PlanType,
  smsUsed: number,
): ReminderChannel | null {
  const config = PLAN_LIMITS[plan];
  const allowed = config.channels;

  // If preferred channel is allowed, use it (with SMS cap check)
  if (allowed.includes(preferred)) {
    if (preferred === 'sms' && smsUsed >= config.smsCap) {
      // SMS cap hit — fall back to WhatsApp, then email
      if (allowed.includes('whatsapp')) return 'whatsapp';
      return 'email';
    }
    return preferred;
  }

  // Preferred not allowed — fall back: whatsapp > email
  if (allowed.includes('whatsapp')) return 'whatsapp';
  if (allowed.includes('email')) return 'email';
  return null;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && vercelCron !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { sent24h: 0, sent2h: 0, errors: 0 };

  // --- 24-hour reminders ---
  // Cron runs once daily — catch all unreminded appointments in the next 28h
  // The reminder_24h_sent flag prevents duplicate sends
  const in28h = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  const { data: appointments24h } = await supabase
    .from("appointments")
    .select("*, profiles:user_id(*)")
    .eq("reminder_24h_sent", false)
    .neq("status", "cancelled")
    .gte("appointment_time", now.toISOString())
    .lte("appointment_time", in28h.toISOString());

  for (const apt of appointments24h || []) {
    const profile = apt.profiles;
    if (!profile?.reminders_active) continue;

    const effectivePlan = getEffectivePlan(profile);
    const config = PLAN_LIMITS[effectivePlan];

    // Check appointment usage limit
    if (profile.reminders_used_this_month >= config.appointments) continue;

    // Resolve channel with plan restrictions
    const channel = resolveChannel(
      profile.reminder_method || "email",
      effectivePlan,
      profile.sms_used_this_month || 0,
    );
    if (!channel) continue;

    const recipient = (channel === "sms" || channel === "whatsapp") ? apt.client_phone : apt.client_email;
    if (!recipient) continue;

    const result = await sendReminder({
      channel,
      recipient,
      clientName: apt.client_name,
      appointmentTime: apt.appointment_time,
      businessName: profile.business_name,
      timezone: profile.timezone || "Europe/London",
    });

    if (result.success) {
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

      await supabase
        .from("appointments")
        .update({ reminder_24h_sent: true })
        .eq("id", apt.id);

      // Increment usage counters
      const updates: Record<string, number> = {
        reminders_used_this_month: (profile.reminders_used_this_month || 0) + 1,
      };
      if (channel === "sms") {
        updates.sms_used_this_month = (profile.sms_used_this_month || 0) + 1;
      }
      await supabase.from("profiles").update(updates).eq("id", apt.user_id);

      results.sent24h++;
    } else {
      results.errors++;
    }
  }

  // --- 2-hour reminders (plans with has2hReminder) ---
  // Wider window since cron only runs once daily on Hobby plan
  // Only sends for appointments that already got a 24h reminder but aren't confirmed
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: appointments2h } = await supabase
    .from("appointments")
    .select("*, profiles:user_id(*)")
    .eq("reminder_2h_sent", false)
    .eq("reminder_24h_sent", true)
    .neq("status", "cancelled")
    .neq("status", "confirmed")
    .gte("appointment_time", now.toISOString())
    .lte("appointment_time", in4h.toISOString());

  for (const apt of appointments2h || []) {
    const profile = apt.profiles;
    if (!profile?.reminders_active) continue;

    const effectivePlan = getEffectivePlan(profile);
    const config = PLAN_LIMITS[effectivePlan];

    // 2h reminders only for plans that support it
    if (!config.has2hReminder) continue;

    if (profile.reminders_used_this_month >= config.appointments) continue;

    const channel = resolveChannel(
      profile.reminder_method || "email",
      effectivePlan,
      profile.sms_used_this_month || 0,
    );
    if (!channel) continue;

    const recipient = (channel === "sms" || channel === "whatsapp") ? apt.client_phone : apt.client_email;
    if (!recipient) continue;

    const result = await sendReminder({
      channel,
      recipient,
      clientName: apt.client_name,
      appointmentTime: apt.appointment_time,
      businessName: profile.business_name,
      timezone: profile.timezone || "Europe/London",
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

      const updates: Record<string, number> = {
        reminders_used_this_month: (profile.reminders_used_this_month || 0) + 1,
      };
      if (channel === "sms") {
        updates.sms_used_this_month = (profile.sms_used_this_month || 0) + 1;
      }
      await supabase.from("profiles").update(updates).eq("id", apt.user_id);

      results.sent2h++;
    } else {
      results.errors++;
    }
  }

  return NextResponse.json({ success: true, results });
}
