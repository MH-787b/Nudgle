import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/booking/availability";
import { getBusyTimes } from "@/lib/google-calendar";
import { sendEmail } from "@/lib/messaging/email";
import type { BusinessHour } from "@/lib/types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Returns available days and time slots for a business, or creates a booking. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.toUpperCase();
  const date = searchParams.get("date");

  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const supabase = getSupabase();

  const { data: business } = await supabase
    .from("profiles")
    .select("id, business_name, default_duration, timezone, google_calendar_connected, google_refresh_token, google_calendar_blocks_slots")
    .eq("booking_code", code)
    .eq("booking_enabled", true)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("user_id", business.id)
    .order("day_of_week");

  const businessHours = (hours || []) as BusinessHour[];

  if (!date) {
    // Return available days (next 14 days)
    const { getAvailableDays } = await import("@/lib/booking/availability");
    const days = getAvailableDays(businessHours, business.timezone, 14);
    return NextResponse.json({ days });
  }

  // Return available slots for a specific date
  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", business.id)
    .neq("status", "cancelled")
    .gte("appointment_time", dayStart)
    .lte("appointment_time", dayEnd);

  // Fetch Google Calendar busy periods if connected and blocking is enabled
  let busyPeriods: { start: string; end: string }[] = [];
  if (business.google_calendar_connected && business.google_refresh_token && business.google_calendar_blocks_slots) {
    busyPeriods = await getBusyTimes(business.google_refresh_token, dayStart, dayEnd);
  }

  const slots = getAvailableSlots(
    date,
    businessHours,
    appointments || [],
    business.default_duration,
    business.timezone,
    busyPeriods
  );

  return NextResponse.json({ slots });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, date, time, clientName, clientEmail, clientPhone } = body;

  if (!code || !date || !time || !clientName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!clientEmail && !clientPhone) {
    return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: business } = await supabase
    .from("profiles")
    .select("id, business_name, default_duration, timezone, google_calendar_connected, google_refresh_token, google_calendar_blocks_slots")
    .eq("booking_code", code.toUpperCase())
    .eq("booking_enabled", true)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("user_id", business.id)
    .order("day_of_week");

  const businessHours = (hours || []) as BusinessHour[];

  // Validate slot is still available
  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;

  const { data: existingAppts } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", business.id)
    .neq("status", "cancelled")
    .gte("appointment_time", dayStart)
    .lte("appointment_time", dayEnd);

  let busyPeriods: { start: string; end: string }[] = [];
  if (business.google_calendar_connected && business.google_refresh_token && business.google_calendar_blocks_slots) {
    busyPeriods = await getBusyTimes(business.google_refresh_token, dayStart, dayEnd);
  }

  const availableSlots = getAvailableSlots(
    date,
    businessHours,
    existingAppts || [],
    business.default_duration,
    business.timezone,
    busyPeriods
  );

  const slotExists = availableSlots.some((s) => s.time === time);
  if (!slotExists) {
    return NextResponse.json({ error: "This time slot is no longer available. Please pick another time." }, { status: 409 });
  }

  // Build the appointment time in the business timezone
  const { dateInTz } = await import("@/lib/booking/availability");
  const [year, month, day] = date.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  const appointmentTimeUtc = dateInTz(year, month - 1, day, h, m, business.timezone);

  const { data: newApt, error: insertError } = await supabase
    .from("appointments")
    .insert({
      user_id: business.id,
      client_name: clientName.trim(),
      client_email: clientEmail?.trim() || null,
      client_phone: clientPhone?.trim() || null,
      appointment_time: appointmentTimeUtc.toISOString(),
      duration_minutes: business.default_duration,
      status: "confirmed",
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Sync to Google Calendar (fire and forget)
  if (newApt && business.google_calendar_connected && business.google_refresh_token) {
    import("@/lib/google-calendar").then(({ createCalendarEvent }) =>
      createCalendarEvent(business.google_refresh_token!, {
        summary: `${clientName.trim()} (via Nudgle)`,
        start: appointmentTimeUtc.toISOString(),
        end: new Date(appointmentTimeUtc.getTime() + business.default_duration * 60 * 1000).toISOString(),
        timeZone: business.timezone,
      }).then((eventId) => {
        if (eventId) {
          supabase.from("appointments").update({ google_event_id: eventId }).eq("id", newApt.id).then(() => {});
        }
      }).catch(() => {})
    );
  }

  // Send confirmation email (fire and forget)
  if (clientEmail) {
    const businessName = business.business_name || "your appointment";
    const displayDate = new Date(appointmentTimeUtc).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: business.timezone,
    });
    const displayTime = new Date(appointmentTimeUtc).toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: business.timezone,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nudgle.vercel.app";

    sendEmail(
      clientEmail.trim(),
      `Booking confirmed — ${businessName}`,
      `Hi ${clientName.trim()},\n\nYour appointment with ${businessName} is confirmed:\n\n${displayDate} at ${displayTime}\n${business.default_duration} minutes\n\nNeed to cancel? Reply to this email or contact ${businessName} directly.\n\nPowered by Nudgle`,
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">Booking confirmed</h2>
        <p style="margin: 0 0 24px; color: #666; font-size: 14px;">Your appointment with <strong style="color: #111;">${businessName}</strong></p>
        <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 16px; color: #111; font-weight: 600;">${displayDate}</p>
          <p style="margin: 0 0 4px; font-size: 14px; color: #666;">${displayTime} &middot; ${business.default_duration} minutes</p>
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
          <tr>
            <td align="center">
              <a href="${appUrl}/api/confirm/${newApt.id}?response=yes" style="display: block; width: 100%; padding: 14px; background: #22c55e; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; text-align: center; box-sizing: border-box;">Yes, I'll be there</a>
            </td>
          </tr>
          <tr><td height="10"></td></tr>
          <tr>
            <td align="center">
              <a href="${appUrl}/api/confirm/${newApt.id}?response=no" style="display: block; width: 100%; padding: 14px; background: #ef4444; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; text-align: center; box-sizing: border-box;">I need to cancel</a>
            </td>
          </tr>
        </table>
        <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">Powered by <a href="${appUrl}" style="color: #999;">Nudgle</a> &middot; Please do not reply to this email</p>
      </div>`
    ).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    appointment: {
      id: newApt.id,
      date,
      time,
      duration: business.default_duration,
      businessName: business.business_name,
    },
  });
}
