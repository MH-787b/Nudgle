export interface BusyPeriod {
  start: string;
  end: string;
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: string;
  end: string;
  timeZone?: string;
  attendees?: { email: string; displayName?: string }[];
}

/** Exchange a refresh token for a short-lived access token. */
export async function getAccessToken(refreshToken: string): Promise<string | null> {
  try {
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
    if (!response.ok) {
      console.error("Google OAuth token refresh failed:", data.error || response.status);
      return null;
    }
    return data.access_token || null;
  } catch (err) {
    console.error("Google OAuth token refresh error:", err);
    return null;
  }
}

/** Get busy periods from Google Calendar using the FreeBusy API. */
export async function getBusyTimes(
  refreshToken: string,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  try {
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return [];

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: [{ id: "primary" }],
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Google FreeBusy API error:", data.error || response.status);
      return [];
    }
    return (data.calendars?.primary?.busy as BusyPeriod[]) || [];
  } catch (err) {
    console.error("Google FreeBusy error:", err);
    return [];
  }
}

/** Fetch calendar events for a time range. Returns event summaries + times. */
export interface GoogleEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
}

export async function getCalendarEvents(
  refreshToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  try {
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return [];

    // Get all calendars the user has access to
    const calListRes = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const calListData = await calListRes.json();
    const calendarIds: string[] = (calListData.items || [])
      .filter((c: { accessRole?: string }) => c.accessRole === "owner" || c.accessRole === "writer" || c.accessRole === "reader")
      .map((c: { id: string }) => c.id);

    // Fallback to primary if calendarList fails
    if (calendarIds.length === 0) calendarIds.push("primary");

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });

    // Fetch events from all calendars in parallel
    const allEvents: GoogleEvent[] = [];
    const seenIds = new Set<string>();

    const responses = await Promise.all(
      calendarIds.map((calId) =>
        fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then((r) => r.json()).catch(() => ({ items: [] }))
      )
    );

    for (const data of responses) {
      for (const e of (data.items || [])) {
        if (e.status === "cancelled" || seenIds.has(e.id)) continue;
        seenIds.add(e.id);
        allEvents.push({
          id: e.id,
          summary: e.summary || "Busy",
          start: e.start?.dateTime || e.start?.date || "",
          end: e.end?.dateTime || e.end?.date || "",
          allDay: !e.start?.dateTime,
        });
      }
    }

    return allEvents;
  } catch (err) {
    console.error("Google Calendar events fetch error:", err);
    return [];
  }
}

/** Create a calendar event. Returns the event ID or null on failure. */
export async function createCalendarEvent(
  refreshToken: string,
  event: CalendarEvent
): Promise<string | null> {
  try {
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return null;

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { dateTime: event.start, timeZone: event.timeZone },
          end: { dateTime: event.end, timeZone: event.timeZone },
          attendees: event.attendees,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Google Calendar create event error:", data.error || response.status);
      return null;
    }
    return data.id || null;
  } catch (err) {
    console.error("Google Calendar create event error:", err);
    return null;
  }
}

/** Delete a calendar event. Returns true on success. */
export async function deleteCalendarEvent(
  refreshToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return false;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.ok || response.status === 404;
  } catch (err) {
    console.error("Google Calendar delete event error:", err);
    return false;
  }
}

/** Update a calendar event. Returns true on success. */
export async function updateCalendarEvent(
  refreshToken: string,
  eventId: string,
  event: CalendarEvent
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return false;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { dateTime: event.start, timeZone: event.timeZone },
          end: { dateTime: event.end, timeZone: event.timeZone },
          attendees: event.attendees,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error("Google Calendar update event error:", data.error || response.status);
    }
    return response.ok;
  } catch (err) {
    console.error("Google Calendar update event error:", err);
    return false;
  }
}
