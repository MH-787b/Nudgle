import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/google-calendar";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  return user?.id || null;
}

// POST: Create a calendar event for an appointment
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ created: false, reason: "unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await request.json();
  if (!appointmentId) {
    return NextResponse.json({ created: false, reason: "missing_id" });
  }

  const supabase = getSupabase();

  const { data: apt } = await supabase
    .from("appointments")
    .select("id, client_name, client_email, appointment_time, duration_minutes, user_id, google_event_id")
    .eq("id", appointmentId)
    .eq("user_id", userId)
    .single();

  if (!apt) {
    return NextResponse.json({ created: false, reason: "not_found" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_calendar_connected, google_refresh_token, timezone")
    .eq("id", apt.user_id)
    .single();

  if (!profile?.google_calendar_connected || !profile.google_refresh_token) {
    return NextResponse.json({ created: false, reason: "not_connected" });
  }

  const endTime = new Date(
    new Date(apt.appointment_time).getTime() + apt.duration_minutes * 60 * 1000
  ).toISOString();

  const eventId = await createCalendarEvent(profile.google_refresh_token, {
    summary: `${apt.client_name} - Appointment`,
    description: "Booked via Nudgle",
    start: apt.appointment_time,
    end: endTime,
    timeZone: profile.timezone || "Europe/London",
    attendees: apt.client_email
      ? [{ email: apt.client_email, displayName: apt.client_name }]
      : undefined,
  });

  if (eventId) {
    await supabase
      .from("appointments")
      .update({ google_event_id: eventId })
      .eq("id", appointmentId);
  }

  return NextResponse.json({ created: !!eventId, eventId });
}

// DELETE: Remove a calendar event when appointment is cancelled
export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ deleted: false, reason: "unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await request.json();
  if (!appointmentId) {
    return NextResponse.json({ deleted: false });
  }

  const supabase = getSupabase();

  const { data: apt } = await supabase
    .from("appointments")
    .select("google_event_id, user_id")
    .eq("id", appointmentId)
    .eq("user_id", userId)
    .single();

  if (!apt?.google_event_id) {
    return NextResponse.json({ deleted: false, reason: "no_event" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token")
    .eq("id", apt.user_id)
    .single();

  if (!profile?.google_refresh_token) {
    return NextResponse.json({ deleted: false, reason: "no_token" });
  }

  const success = await deleteCalendarEvent(profile.google_refresh_token, apt.google_event_id);

  if (success) {
    await supabase
      .from("appointments")
      .update({ google_event_id: null })
      .eq("id", appointmentId);
  }

  return NextResponse.json({ deleted: success });
}

// PATCH: Update a calendar event when appointment is edited
export async function PATCH(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ updated: false, reason: "unauthorized" }, { status: 401 });
  }

  const { appointmentId } = await request.json();
  if (!appointmentId) {
    return NextResponse.json({ updated: false });
  }

  const supabase = getSupabase();

  const { data: apt } = await supabase
    .from("appointments")
    .select("id, client_name, client_email, appointment_time, duration_minutes, user_id, google_event_id")
    .eq("id", appointmentId)
    .eq("user_id", userId)
    .single();

  if (!apt?.google_event_id) {
    return NextResponse.json({ updated: false, reason: "no_event" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token, timezone")
    .eq("id", apt.user_id)
    .single();

  if (!profile?.google_refresh_token) {
    return NextResponse.json({ updated: false, reason: "no_token" });
  }

  const endTime = new Date(
    new Date(apt.appointment_time).getTime() + apt.duration_minutes * 60 * 1000
  ).toISOString();

  const success = await updateCalendarEvent(
    profile.google_refresh_token,
    apt.google_event_id,
    {
      summary: `${apt.client_name} - Appointment`,
      description: "Booked via Nudgle",
      start: apt.appointment_time,
      end: endTime,
      timeZone: profile.timezone || "Europe/London",
      attendees: apt.client_email
        ? [{ email: apt.client_email, displayName: apt.client_name }]
        : undefined,
    }
  );

  return NextResponse.json({ updated: success });
}
