import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getCalendarEvents } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ conflicts: [] });
  }

  // Get authenticated user
  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ conflicts: [] });
  }

  // Get profile with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_calendar_connected, google_refresh_token, google_calendar_blocks_slots")
    .eq("id", user.id)
    .single();

  if (!profile?.google_calendar_connected || !profile.google_refresh_token || profile.google_calendar_blocks_slots === false) {
    return NextResponse.json({ conflicts: [] });
  }

  // Fetch events for a window around the requested time
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dayStart = new Date(startDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(startDate);
  dayEnd.setHours(23, 59, 59, 999);

  const events = await getCalendarEvents(
    profile.google_refresh_token,
    dayStart.toISOString(),
    dayEnd.toISOString()
  );

  // Filter to events that actually overlap with the requested time range
  const conflicts = events
    .filter((e) => {
      if (e.allDay) return false;
      const eStart = new Date(e.start).getTime();
      const eEnd = new Date(e.end).getTime();
      return eStart < endDate.getTime() && eEnd > startDate.getTime();
    })
    .map((e) => ({ summary: e.summary, start: e.start, end: e.end }));

  return NextResponse.json({ conflicts });
}
