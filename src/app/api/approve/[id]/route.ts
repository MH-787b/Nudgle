import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, generateIcs } from "@/lib/messaging/email";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Handles owner approve/reject of a pending_approval booking request. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const response = request.nextUrl.searchParams.get("response");

  if (response !== "approve" && response !== "reject") {
    return new NextResponse(renderPage("Invalid link", "This approval link is not valid."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = getSupabase();

  const { data: apt } = await supabase
    .from("appointments")
    .select("*, profiles:user_id(business_name, timezone, google_calendar_connected, google_refresh_token)")
    .eq("id", id)
    .single();

  if (!apt) {
    return new NextResponse(renderPage("Not found", "This appointment could not be found."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Only allow action on pending_approval appointments
  if (apt.status !== "pending_approval") {
    const msg = apt.status === "confirmed"
      ? "This booking has already been approved."
      : apt.status === "cancelled"
        ? "This booking has already been declined."
        : "This booking request has already been processed.";
    return new NextResponse(renderPage("Already processed", msg), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nudgle.vercel.app";
  const businessName = apt.profiles?.business_name || "the business";
  const tz = apt.profiles?.timezone || "Europe/London";
  const displayDate = new Date(apt.appointment_time).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  });
  const displayTime = new Date(apt.appointment_time).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });

  if (response === "approve") {
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", id);

    // Sync to Google Calendar
    if (apt.profiles?.google_calendar_connected && apt.profiles?.google_refresh_token) {
      import("@/lib/google-calendar").then(({ createCalendarEvent }) =>
        createCalendarEvent(apt.profiles.google_refresh_token!, {
          summary: `${apt.client_name} (via Nudgle)`,
          start: apt.appointment_time,
          end: new Date(new Date(apt.appointment_time).getTime() + apt.duration_minutes * 60 * 1000).toISOString(),
          timeZone: tz,
        }).then((eventId) => {
          if (eventId) {
            supabase.from("appointments").update({ google_event_id: eventId }).eq("id", id).then(() => {});
          }
        }).catch(() => {})
      );
    }

    // Email client that booking is confirmed (with .ics attachment)
    if (apt.client_email) {
      const endTime = new Date(new Date(apt.appointment_time).getTime() + apt.duration_minutes * 60 * 1000);
      const icsFile = generateIcs({
        summary: `Appointment with ${businessName}`,
        start: apt.appointment_time,
        end: endTime.toISOString(),
        description: "Booked via Nudgle",
      });

      const result = await sendEmail(
        apt.client_email,
        `Booking confirmed — ${businessName}`,
        `Hi ${apt.client_name},\n\nGreat news! Your booking with ${businessName} has been approved.\n\n${displayDate} at ${displayTime}\n${apt.duration_minutes} minutes\n\nPowered by Nudgle`,
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">Booking confirmed!</h2>
          <p style="margin: 0 0 24px; color: #666; font-size: 14px;">Your booking with <strong style="color: #111;">${businessName}</strong> has been approved.</p>
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 16px; color: #111; font-weight: 600;">${displayDate}</p>
            <p style="margin: 0 0 4px; font-size: 14px; color: #666;">${displayTime} &middot; ${apt.duration_minutes} minutes</p>
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
            <tr>
              <td align="center">
                <a href="${appUrl}/api/confirm/${id}?response=yes" style="display: block; width: 100%; padding: 14px; background: #22c55e; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; text-align: center; box-sizing: border-box;">Yes, I'll be there</a>
              </td>
            </tr>
            <tr><td height="10"></td></tr>
            <tr>
              <td align="center">
                <a href="${appUrl}/api/confirm/${id}?response=no" style="display: block; width: 100%; padding: 14px; background: #ef4444; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; text-align: center; box-sizing: border-box;">I need to cancel</a>
              </td>
            </tr>
          </table>
          <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">Powered by <a href="${appUrl}" style="color: #999;">Nudgle</a> &middot; Please do not reply to this email</p>
        </div>`,
        [{ filename: "appointment.ics", content: icsFile, content_type: "text/calendar" }]
      );
      console.log("[approve] Client confirmation email result:", result);
    }

    return new NextResponse(
      renderPage("Approved!", `You've approved the booking for ${apt.client_name} on ${displayDate} at ${displayTime}. They've been notified.`),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // response === "reject"
  await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  // Email client that booking was declined
  if (apt.client_email) {
    const result = await sendEmail(
      apt.client_email,
      `Booking update — ${businessName}`,
      `Hi ${apt.client_name},\n\nUnfortunately, ${businessName} is unable to accommodate your requested booking:\n\n${displayDate} at ${displayTime}\n\nPlease visit their booking page to choose an alternative time.\n\nPowered by Nudgle`,
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">Booking unavailable</h2>
        <p style="margin: 0 0 24px; color: #666; font-size: 14px;"><strong style="color: #111;">${businessName}</strong> is unable to accommodate your requested time.</p>
        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 16px; color: #111; font-weight: 600;">${displayDate}</p>
          <p style="margin: 0 0 4px; font-size: 14px; color: #666;">${displayTime} &middot; ${apt.duration_minutes} minutes</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #dc2626; font-weight: 500;">Unavailable</p>
        </div>
        <p style="margin: 0 0 8px; font-size: 13px; color: #666;">Please visit their booking page to choose an alternative time.</p>
        <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">Powered by <a href="${appUrl}" style="color: #999;">Nudgle</a> &middot; Please do not reply to this email</p>
      </div>`
    );
    console.log("[approve] Client rejection email result:", result);
  }

  return new NextResponse(
    renderPage("Declined", `The booking request from ${apt.client_name} has been declined. They've been notified.`),
    { headers: { "Content-Type": "text/html" } }
  );
}

function renderPage(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Nudgle</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { max-width: 400px; text-align: center; }
    h1 { color: #f97316; font-size: 24px; margin-bottom: 8px; }
    p { color: #9ca3af; font-size: 16px; line-height: 1.5; }
    .logo { font-size: 14px; color: #6b7280; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <p class="logo">Nudgle</p>
  </div>
</body>
</html>`;
}
