import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteCalendarEvent } from "@/lib/google-calendar";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const response = request.nextUrl.searchParams.get("response");

  if (response !== "yes" && response !== "no") {
    return new NextResponse(renderPage("Invalid link", "This confirmation link is not valid."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = getSupabase();

  const { data: apt } = await supabase
    .from("appointments")
    .select("*, profiles:user_id(business_name)")
    .eq("id", id)
    .single();

  if (!apt) {
    return new NextResponse(renderPage("Not found", "This appointment could not be found."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (response === "yes") {
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", id);

    await supabase.from("confirmations").insert({
      appointment_id: id,
      reply_text: "Confirmed via email",
      confirmed: true,
    });

    const businessName = apt.profiles?.business_name || "your appointment";
    return new NextResponse(
      renderPage("Confirmed!", `Your appointment with ${businessName} is confirmed. See you then!`),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // response === "no"
  await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);

  await supabase.from("confirmations").insert({
    appointment_id: id,
    reply_text: "Cancelled via email",
    confirmed: false,
  });

  // Remove from Google Calendar if linked
  if (apt.google_event_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_refresh_token")
      .eq("id", apt.user_id)
      .single();

    if (profile?.google_refresh_token) {
      await deleteCalendarEvent(profile.google_refresh_token, apt.google_event_id);
      await supabase.from("appointments")
        .update({ google_event_id: null })
        .eq("id", id);
    }
  }

  const businessName = apt.profiles?.business_name || "the business";
  return new NextResponse(
    renderPage("Cancelled", `Your appointment with ${businessName} has been cancelled. Please rebook if needed.`),
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
