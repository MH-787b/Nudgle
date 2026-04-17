import { createClient } from "@/lib/supabase/server";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, isSameDay, isBefore } from "date-fns";
import { CheckCircle, Clock, Plus } from "lucide-react";
import Link from "next/link";
import type { Appointment } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

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

  const weekMonday = startOfWeek(now, { weekStartsOn: 1 });
  const today = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekMonday, i);
    const dayAppts = weekAppts
      .filter((a) => isSameDay(new Date(a.appointment_time), date))
      .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
    return { date, appointments: dayAppts };
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("reminders_used_this_month, reminders_limit, business_name")
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {profile?.business_name ? `Hi, ${profile.business_name}` : "Dashboard"}
        </h1>
        <p className="text-surface-600 font-mono text-sm mt-1">{format(now, "EEEE, d MMMM")}</p>
      </div>

      {/* Week calendar */}
      <div className="bg-surface-100 rounded-xl border border-surface-300 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-surface-600">This week</h2>
          <span className="text-xs font-mono text-surface-500">
            {confirmedCount}/{totalWeek} confirmed
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const isToday = isSameDay(day.date, now);
            const isPast = isBefore(day.date, today) && !isToday;
            return (
              <div key={i} className="flex flex-col">
                <div className={`text-center py-1.5 rounded-lg mb-1 ${isToday ? "bg-brand-500" : ""}`}>
                  <p
                    className={`text-[10px] font-mono uppercase tracking-wider ${
                      isToday ? "text-white/70" : "text-surface-500"
                    }`}
                  >
                    {format(day.date, "EEE")}
                  </p>
                  <p
                    className={`text-base font-bold ${
                      isToday ? "text-white" : isPast ? "text-surface-500" : "text-white"
                    }`}
                  >
                    {format(day.date, "d")}
                  </p>
                </div>
                <div className="space-y-1 flex-1">
                  {day.appointments.slice(0, 3).map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/appointments/${apt.id}`}
                      className={`block p-1 rounded text-[10px] leading-tight ${
                        apt.status === "confirmed"
                          ? "bg-green-500/10 border border-green-500/20"
                          : "bg-brand-500/10 border border-brand-500/20"
                      } ${isPast ? "opacity-50" : ""}`}
                    >
                      <p
                        className={`font-mono ${
                          apt.status === "confirmed" ? "text-green-400" : "text-brand-400"
                        }`}
                      >
                        {format(new Date(apt.appointment_time), "h:mma").toLowerCase()}
                      </p>
                      <p className="text-white truncate">{apt.client_name.split(" ")[0]}</p>
                    </Link>
                  ))}
                  {day.appointments.length > 3 && (
                    <p className="text-[10px] text-surface-500 text-center font-mono">
                      +{day.appointments.length - 3}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage */}
      {profile && (
        <div className="bg-surface-100 p-4 rounded-xl border border-surface-300 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-surface-600">Reminders used</span>
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
        </div>
      )}

      {/* Today's appointments */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight text-white">Today</h2>
        <Link
          href="/appointments/new"
          className="flex items-center gap-1.5 text-sm text-brand-500 font-medium hover:text-brand-400 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add new
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-surface-100 p-8 rounded-xl border border-surface-300 text-center">
          <p className="text-surface-600 mb-4">No appointments today</p>
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add appointment
          </Link>
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
                  {format(new Date(apt.appointment_time), "h:mm a")}
                </p>
              </div>
              {apt.status === "confirmed" ? (
                <span className="flex items-center gap-1.5 text-xs font-medium font-mono text-green-400 bg-green-500/10 px-2.5 py-1 rounded">
                  <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} />
                  Confirmed
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
    </div>
  );
}
