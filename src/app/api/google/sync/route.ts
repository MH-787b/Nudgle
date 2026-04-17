import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  return data.access_token || null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get all users with Google Calendar connected
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, google_refresh_token")
    .eq("google_calendar_connected", true)
    .not("google_refresh_token", "is", null);

  let synced = 0;

  for (const profile of profiles || []) {
    const accessToken = await getAccessToken(profile.google_refresh_token!);
    if (!accessToken) continue;

    // Fetch upcoming events (next 7 days)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const calResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&timeMax=${weekFromNow.toISOString()}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const calData = await calResponse.json();

    for (const event of calData.items || []) {
      if (!event.start?.dateTime) continue;

      // Check if already synced
      const { data: existing } = await supabase
        .from("appointments")
        .select("id")
        .eq("google_event_id", event.id)
        .eq("user_id", profile.id)
        .single();

      if (existing) continue;

      // Extract attendee info
      const attendee = event.attendees?.[0];
      const clientName = attendee?.displayName || event.summary || "Calendar Event";
      const clientEmail = attendee?.email || null;

      await supabase.from("appointments").insert({
        user_id: profile.id,
        client_name: clientName,
        client_email: clientEmail,
        appointment_time: event.start.dateTime,
        duration_minutes: event.end?.dateTime
          ? Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000)
          : 30,
        google_event_id: event.id,
      });

      synced++;
    }
  }

  return NextResponse.json({ success: true, synced });
}
