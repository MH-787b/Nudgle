import { createClient } from "@/lib/supabase/server";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay } from "date-fns";
import { AlertTriangle, Calendar, CheckCircle, Clock, Lock, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { isTrialExpired } from "@/lib/types";
import type { Appointment } from "@/lib/types";
import { WeekCalendar } from "@/components/week-calendar";
import { getCalendarEvents, type GoogleEvent } from "@/lib/google-calendar";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  // Week can be navigated via ?week= param
  const weekMonday = week
    ? startOfWeek(new Date(week + "T00:00:00"), { weekStartsOn: 1 })
    : startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekMonday = startOfWeek(now, { weekStartsOn: 1 });
  const isCurrentWeek = isSameDay(weekMonday, currentWeekMonday);

  const weekStart = startOfDay(weekMonday).toISOString();
  const weekEnd = endOfDay(addDays(weekMonday, 6)).toISOString();

  // Navigation hrefs
  const prevMonday = addDays(weekMonday, -7);
  const nextMonday = addDays(weekMonday, 7);
  const prevWeekHref = isSameDay(prevMonday, currentWeekMonday)
    ? "/dashboard"
    : `/dashboard?week=${format(prevMonday, "yyyy-MM-dd")}`;
  const nextWeekHref = isSameDay(nextMonday, currentWeekMonday)
    ? "/dashboard"
    : `/dashboard?week=${format(nextMonday, "yyyy-MM-dd")}`;
  const todayHref = "/dashboard";

  const { data: todayAppointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", user!.id)
    .gte("appointment_time", todayStart)
    .lte("appointment_time", todayEnd)
    .order("appointment_time", { ascending: true });

  const { data: weekAppointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", user!.id)
    .gte("appointment_time", weekStart)
    .lte("appointment_time", weekEnd);

  const appointments = (todayAppointments || []) as Appointment[];
  const weekAppts = (weekAppointments || []) as Appointment[];

  const confirmedCount = weekAppts.filter((a) => a.status === "confirmed").length;
  const totalWeek = weekAppts.length;

  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const [{ data: profile }, { count: confirmedThisMonth }] = await Promise.all([
    supabase
      .from("profiles")
      .select("reminders_used_this_month, reminders_limit, business_name, booking_enabled, booking_code, average_appointment_value, plan, trial_ends_at, timezone, google_calendar_connected, google_refresh_token")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("status", "confirmed")
      .gte("appointment_time", monthStart)
      .lte("appointment_time", monthEnd),
  ]);

  // Fetch Google Calendar events if connected
  let googleEvents: GoogleEvent[] = [];
  if (profile?.google_calendar_connected && profile?.google_refresh_token) {
    googleEvents = await getCalendarEvents(profile.google_refresh_token, weekStart, weekEnd);
    // Filter out events that already exist as Nudgle appointments (by google_event_id)
    const nudgleEventIds = new Set(weekAppts.map((a) => a.google_event_id).filter(Boolean));
    googleEvents = googleEvents.filter((e) => !nudgleEventIds.has(e.id));
  }

  const tz = profile?.timezone || "Europe/London";
  const appointmentValue = profile?.average_appointment_value || 0;
  const savedAmount = (confirmedThisMonth || 0) * appointmentValue;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nudgle.vercel.app";
  const bookingPageUrl = profile?.booking_code
    ? `${appUrl}/book/${profile.booking_code}`
    : null;

  // Shared sections as JSX
  const greetingSection = (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-white">
        {profile?.business_name ? `Hi, ${profile.business_name}` : "Dashboard"}
      </h1>
      <p className="text-surface-600 font-mono text-sm mt-1">{format(now, "EEEE, d MMMM")}</p>
    </div>
  );

  const savedSection = appointmentValue > 0 ? (
    <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-green-400" strokeWidth={2} />
        </div>
        <div>
          <p className="text-2xl font-bold font-mono text-green-400">
            &pound;{savedAmount.toLocaleString()}
          </p>
          <p className="text-xs text-surface-600">
            saved this month &mdash; {confirmedThisMonth || 0} confirmed appointment{confirmedThisMonth !== 1 ? 's' : ''} &times; &pound;{appointmentValue}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <Link
      href="/settings"
      className="block bg-surface-100 border border-surface-300 rounded-xl p-4 mb-6 hover:border-brand-500/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-brand-500" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">See how much Nudgle saves you</p>
          <p className="text-xs text-surface-600">Set your average appointment value in settings</p>
        </div>
      </div>
    </Link>
  );

  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const isOnTrial = profile?.plan === 'trial' && trialDaysLeft !== null && trialDaysLeft > 0;
  const expired = isTrialExpired(profile?.plan || "trial", profile?.trial_ends_at || null);

  const usageSection = profile && (
    <div className="bg-surface-100 p-4 rounded-xl border border-surface-300 mb-6">
      {expired ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-400">Trial expired</p>
            <p className="text-xs text-surface-600 mt-0.5">Pick a plan to continue</p>
          </div>
          <Link
            href="/billing"
            className="px-3 py-1.5 bg-brand-500 text-white text-sm font-semibold rounded-lg hover:bg-brand-600 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      ) : isOnTrial ? (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-surface-600">Free trial</span>
            <span className="font-medium font-mono text-white">
              {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
            </span>
          </div>
          <div className="mt-2 h-1 bg-surface-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, ((14 - (trialDaysLeft ?? 0)) / 14) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-surface-500">
            All features unlocked &mdash; no limits during trial
          </p>
        </>
      ) : (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-surface-600">Appointments used</span>
            <span className="font-medium font-mono text-white">
              {profile.reminders_used_this_month}/{profile.reminders_limit}
            </span>
          </div>
          <div className="mt-2 h-1 bg-surface-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  (profile.reminders_used_this_month / profile.reminders_limit) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </>
      )}
    </div>
  );

  const bookingSection = expired ? null : bookingPageUrl ? (
    <div className="bg-surface-100 p-4 rounded-xl border border-brand-500/20 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-brand-500" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Your booking link</p>
          <p className="text-xs text-brand-400 font-mono truncate">{bookingPageUrl}</p>
        </div>
        <Link
          href="/settings"
          className="text-xs font-medium text-brand-500 hover:text-brand-400 transition-colors shrink-0"
        >
          Manage
        </Link>
      </div>
      <p className="text-xs text-surface-500 mt-2 ml-12">
        Share this link with clients to have them book themselves in
      </p>
    </div>
  ) : null;

  const todaySection = (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight text-white">Today</h2>
        {expired ? (
          <Link
            href="/billing"
            className="flex items-center gap-1.5 text-sm text-surface-500 font-medium"
          >
            <Lock className="w-3.5 h-3.5" strokeWidth={2} />
            Trial ended
          </Link>
        ) : (
          <Link
            href="/appointments/new"
            className="flex items-center gap-1.5 text-sm text-brand-500 font-medium hover:text-brand-400 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add new
          </Link>
        )}
      </div>

      {appointments.length === 0 ? (
        <div className="bg-surface-100 p-8 rounded-xl border border-surface-300 text-center">
          <p className="text-surface-600 mb-4">No appointments today</p>
          {expired ? (
            <Link
              href="/billing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              Choose a plan
            </Link>
          ) : (
            <Link
              href="/appointments/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add appointment
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-surface-100 p-4 rounded-xl border border-surface-300 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-white">{apt.client_name}</p>
                <p className="text-sm text-surface-600 font-mono">
                  {new Date(apt.appointment_time).toLocaleString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })}
                </p>
              </div>
              {apt.status === "confirmed" ? (
                <span className="flex items-center gap-1.5 text-xs font-medium font-mono text-green-400 bg-green-500/10 px-2.5 py-1 rounded">
                  <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} />
                  Confirmed
                </span>
              ) : apt.status === "pending_approval" ? (
                <span className="flex items-center gap-1.5 text-xs font-medium font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded">
                  <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                  Needs approval
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded">
                  <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                  Pending
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const calendarSection = (
    <WeekCalendar
      appointments={weekAppts}
      googleEvents={googleEvents}
      weekStartISO={weekMonday.toISOString()}
      prevWeekHref={prevWeekHref}
      nextWeekHref={nextWeekHref}
      todayHref={todayHref}
      isCurrentWeek={isCurrentWeek}
      confirmedCount={confirmedCount}
      totalWeek={totalWeek}
      timezone={tz}
    />
  );

  return (
    <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 pt-8">
      {/* Greeting — full width */}
      {greetingSection}

      {/* Saved £X — full width */}
      {savedSection}

      {/* Desktop: two columns | Mobile: stack */}
      <div className="lg:flex lg:gap-8">
        {/* Calendar — left half on desktop */}
        <div className="mb-6 lg:mb-0 lg:w-1/2 lg:sticky lg:top-20 lg:self-start">
          {calendarSection}
        </div>

        {/* Right column */}
        <div className="lg:w-1/2">
          {usageSection}
          {bookingSection}
          {todaySection}
        </div>
      </div>
    </div>
  );
}
