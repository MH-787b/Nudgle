import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Mail, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Appointment, Message } from "@/lib/types";
import { CancelButton } from "./cancel-button";
import { ConfirmButton } from "./confirm-button";
import { EditForm } from "./edit-form";

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (!appointment) {
    notFound();
  }

  const apt = appointment as Appointment;

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", apt.user_id)
    .single();

  const tz = profile?.timezone || "Europe/London";

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("appointment_id", id)
    .order("sent_at", { ascending: false });

  const msgs = (messages || []) as Message[];

  return (
    <div className="max-w-lg lg:max-w-4xl mx-auto px-4 pt-8">
      <Link
        href="/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-surface-600 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Back
      </Link>

      <div className="bg-surface-100 p-6 rounded-xl border border-surface-300 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">{apt.client_name}</h1>
            <p className="text-surface-600 font-mono text-sm">
              {formatTime(apt.appointment_time, tz)}
            </p>
          </div>
          {apt.status === "confirmed" ? (
            <span className="flex items-center gap-1.5 text-xs font-medium font-mono text-green-400 bg-green-500/10 px-2.5 py-1 rounded">
              <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} />
              Confirmed
            </span>
          ) : apt.status === "cancelled" ? (
            <span className="text-xs font-medium font-mono text-surface-500 bg-surface-300 px-2.5 py-1 rounded">
              Cancelled
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

        <div className="space-y-2 text-sm">
          {apt.client_email && (
            <div className="flex items-center gap-2 text-surface-600">
              <Mail className="w-4 h-4" strokeWidth={2} />
              {apt.client_email}
            </div>
          )}
          {apt.client_phone && (
            <div className="flex items-center gap-2 text-surface-600">
              <MessageSquare className="w-4 h-4" strokeWidth={2} />
              {apt.client_phone}
            </div>
          )}
          <p className="text-surface-600 font-mono">{apt.duration_minutes} min</p>
        </div>

        {apt.status !== "cancelled" && (
          <div className="mt-4 pt-4 border-t border-surface-300 flex items-center gap-4">
            <EditForm appointment={apt} />
            {apt.status !== "confirmed" && (
              <ConfirmButton appointmentId={apt.id} />
            )}
            <CancelButton appointmentId={apt.id} />
          </div>
        )}
      </div>

      {/* Message history */}
      {msgs.length > 0 && (
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white mb-3">Reminder history</h2>
          <div className="space-y-2">
            {msgs.map((msg) => (
              <div key={msg.id} className="bg-surface-100 p-3 rounded-lg border border-surface-300 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white capitalize">{msg.message_type.replace("_", " ")}</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    msg.status === "delivered" ? "bg-green-500/10 text-green-400" :
                    msg.status === "failed" ? "bg-red-500/10 text-red-400" :
                    "bg-surface-300 text-surface-600"
                  }`}>
                    {msg.status}
                  </span>
                </div>
                <p className="text-surface-600 mt-1 font-mono text-xs">
                  {new Date(msg.sent_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz })} via {msg.channel}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
