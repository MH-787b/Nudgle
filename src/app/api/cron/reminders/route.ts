import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReminder } from "@/lib/messaging";
import { PLAN_LIMITS, isTrialExpired } from "@/lib/types";
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
  const results = { sent24h: 0, errors: 0 };
  const debug: Record<string, unknown>[] = [];

  // --- 24-hour reminders ---
  // Cron runs once daily — catch all unreminded appointments in the next 28h
  // The reminder_24h_sent flag prevents duplicate sends
  const in28h = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  debug.push({ now: now.toISOString(), in28h: in28h.toISOString() });

  // --- Auto-reject expired pending_approval requests ---
  // If the appointment time has passed and owner never responded, cancel it
  const { data: expiredRequests } = await supabase
    .from("appointments")
    .select("id, client_name, client_email, appointment_time, duration_minutes, user_id, profiles:user_id(business_name, timezone)")
    .eq("status", "pending_approval")
    .lt("appointment_time", now.toISOString());

  for (const req of expiredRequests || []) {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", req.id);
    // Notify client their request was auto-declined
    const prof = req.profiles as unknown as { business_name: string; timezone: string } | null;
    if (req.client_email) {
      const tz = prof?.timezone || "Europe/London";
      const biz = prof?.business_name || "the business";
      const dDate = new Date(req.appointment_time).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
      const dTime = new Date(req.appointment_time).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz });
      const { sendEmail } = await import("@/lib/messaging/email");
      sendEmail(
        req.client_email,
        `Booking update — ${biz}`,
        `Hi ${req.client_name},\n\nUnfortunately, ${biz} was unable to accommodate your requested booking on ${dDate} at ${dTime}.\n\nPlease visit their booking page to choose an alternative time.\n\nPowered by Nudgle`,
      ).catch(() => {});
    }
    debug.push({ auto_rejected: req.id, client: req.client_name, reason: "appointment_time_passed" });
  }

  const { data: appointments24h, error: queryError } = await supabase
    .from("appointments")
    .select("*, profiles:user_id(*)")
    .eq("reminder_24h_sent", false)
    .eq("reminders_opt_in", true)
    .neq("status", "cancelled")
    .neq("status", "pending_approval")
    .gte("appointment_time", now.toISOString())
    .lte("appointment_time", in28h.toISOString());

  if (queryError) {
    debug.push({ queryError: queryError.message, code: queryError.code });
  }

  debug.push({ appointments24h_count: appointments24h?.length ?? 0 });

  for (const apt of appointments24h || []) {
    const profile = apt.profiles;
    const aptDebug: Record<string, unknown> = {
      id: apt.id,
      client_name: apt.client_name,
      client_email: apt.client_email,
      appointment_time: apt.appointment_time,
      status: apt.status,
      reminder_24h_sent: apt.reminder_24h_sent,
      has_profile: !!profile,
      reminders_active: profile?.reminders_active,
      reminder_method: profile?.reminder_method,
      plan: profile?.plan,
      trial_ends_at: profile?.trial_ends_at,
      reminders_used: profile?.reminders_used_this_month,
    };

    if (!profile?.reminders_active) {
      aptDebug.skipped = "reminders_active is false or profile missing";
      debug.push(aptDebug);
      continue;
    }

    if (isTrialExpired(profile.plan, profile.trial_ends_at)) {
      aptDebug.skipped = "trial expired — upgrade required";
      debug.push(aptDebug);
      continue;
    }

    const effectivePlan = getEffectivePlan(profile);
    const config = PLAN_LIMITS[effectivePlan];
    aptDebug.effectivePlan = effectivePlan;

    // Check appointment usage limit (trial is time-based only, no cap)
    if (effectivePlan !== 'trial' && profile.reminders_used_this_month >= config.appointments) {
      aptDebug.skipped = `usage limit reached (${profile.reminders_used_this_month}/${config.appointments})`;
      debug.push(aptDebug);
      continue;
    }

    // Resolve channel with plan restrictions
    const channel = resolveChannel(
      profile.reminder_method || "email",
      effectivePlan,
      profile.sms_used_this_month || 0,
    );
    aptDebug.resolved_channel = channel;
    if (!channel) {
      aptDebug.skipped = "no channel resolved";
      debug.push(aptDebug);
      continue;
    }

    let actualChannel = channel;
    let recipient = (actualChannel === "sms" || actualChannel === "whatsapp") ? apt.client_phone : apt.client_email;

    // Fall back to email if preferred channel has no recipient
    if (!recipient && actualChannel !== "email" && apt.client_email) {
      actualChannel = "email";
      recipient = apt.client_email;
    }

    aptDebug.resolved_channel = actualChannel;
    aptDebug.recipient = recipient;
    if (!recipient) {
      aptDebug.skipped = `no recipient for channel ${actualChannel}`;
      debug.push(aptDebug);
      continue;
    }

    const result = await sendReminder({
      channel: actualChannel,
      recipient,
      clientName: apt.client_name,
      appointmentTime: apt.appointment_time,
      durationMinutes: apt.duration_minutes,
      businessName: profile.business_name,
      timezone: profile.timezone || "Europe/London",
      appointmentId: apt.id,
    });

    aptDebug.send_result = result;
    debug.push(aptDebug);

    if (result.success) {
      await supabase.from("messages").insert({
        appointment_id: apt.id,
        user_id: apt.user_id,
        channel: actualChannel,
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
      if (actualChannel === "sms") {
        updates.sms_used_this_month = (profile.sms_used_this_month || 0) + 1;
      }
      await supabase.from("profiles").update(updates).eq("id", apt.user_id);

      results.sent24h++;
    } else {
      results.errors++;
    }
  }

  return NextResponse.json({ success: true, results, debug });
}
