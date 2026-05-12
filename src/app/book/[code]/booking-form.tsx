"use client";

import { useState } from "react";
import { ArrowLeft, Calendar, Check, Clock, Loader2, User, Mail, Phone } from "lucide-react";

interface BookingFormProps {
  code: string;
  businessName: string;
  duration: number;
}

type Step = "day" | "time" | "details" | "confirmed";

/** Interactive multi-step booking form for public booking pages. */
export function BookingForm({ code, businessName, duration }: BookingFormProps) {
  const [step, setStep] = useState<Step>("day");
  const [days, setDays] = useState<{ date: string; label: string }[]>([]);
  const [slots, setSlots] = useState<{ time: string; label: string }[]>([]);
  const [selectedDay, setSelectedDay] = useState<{ date: string; label: string } | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; label: string } | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [error, setError] = useState("");
  const [confirmedDetails, setConfirmedDetails] = useState<{
    date: string;
    time: string;
    duration: number;
    businessName: string;
  } | null>(null);

  // Load available days on mount
  useState(() => {
    fetch(`/api/book?code=${code}`)
      .then((r) => r.json())
      .then((data) => {
        setDays(data.days || []);
        setLoadingInit(false);
      })
      .catch(() => {
        setError("Failed to load availability");
        setLoadingInit(false);
      });
  });

  async function pickDay(day: { date: string; label: string }) {
    setSelectedDay(day);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/book?code=${code}&date=${day.date}`);
      const data = await res.json();
      setSlots(data.slots || []);
      setStep("time");
    } catch {
      setError("Failed to load time slots");
    }
    setLoading(false);
  }

  async function handleBook() {
    if (!clientName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!clientEmail.trim() && !clientPhone.trim()) {
      setError("Please enter your email or phone number");
      return;
    }
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          date: selectedDay!.date,
          time: selectedSlot!.time,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || null,
          clientPhone: clientPhone.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Booking failed. Please try again.");
        if (res.status === 409) {
          // Slot taken — go back to time selection
          setStep("time");
          setSelectedSlot(null);
          // Refresh slots
          const slotsRes = await fetch(`/api/book?code=${code}&date=${selectedDay!.date}`);
          const slotsData = await slotsRes.json();
          setSlots(slotsData.slots || []);
        }
        setLoading(false);
        return;
      }

      setConfirmedDetails(data.appointment);
      setStep("confirmed");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  function goBack() {
    setError("");
    if (step === "time") {
      setStep("day");
      setSelectedDay(null);
      setSlots([]);
    } else if (step === "details") {
      setStep("time");
      setSelectedSlot(null);
    }
  }

  const inputClass =
    "w-full px-4 py-3 bg-surface-100 border border-surface-300 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition placeholder:text-surface-500 text-sm";

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  // Step: Confirmed
  if (step === "confirmed" && confirmedDetails) {
    return (
      <div className="text-center space-y-5">
        <div className="w-14 h-14 bg-green-500/15 rounded-xl flex items-center justify-center mx-auto">
          <Check className="w-7 h-7 text-green-400" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">You&apos;re booked!</h2>
          <p className="text-sm text-surface-600">
            Your appointment with {confirmedDetails.businessName || businessName} is confirmed.
          </p>
        </div>
        <div className="bg-surface-100/50 border border-surface-300 rounded-xl p-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Date</span>
            <span className="text-white font-medium">{selectedDay?.label}</span>
          </div>
          <div className="border-t border-surface-300" />
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Time</span>
            <span className="text-white font-medium">{selectedSlot?.label}</span>
          </div>
          <div className="border-t border-surface-300" />
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Duration</span>
            <span className="text-white font-medium">{confirmedDetails.duration} min</span>
          </div>
        </div>
        {clientEmail && (
          <p className="text-xs text-surface-500">
            A confirmation email has been sent to {clientEmail}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      {step !== "day" && (
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Step: Pick a day */}
      {step === "day" && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-brand-500" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-white">Pick a day</h2>
          </div>
          {days.length === 0 ? (
            <p className="text-sm text-surface-500 py-4 text-center">No available days right now</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {days.map((day) => (
                <button
                  key={day.date}
                  onClick={() => pickDay(day)}
                  disabled={loading}
                  className="px-4 py-3 bg-surface-100/50 border border-surface-300 rounded-xl text-sm text-white font-medium hover:border-brand-500 hover:bg-brand-500/5 active:scale-[0.98] transition-all disabled:opacity-50 text-left"
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Step: Pick a time */}
      {step === "time" && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-brand-500" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-white">
              Pick a time — {selectedDay?.label}
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-surface-500 mb-3">No available times on this day</p>
              <button
                onClick={goBack}
                className="text-sm text-brand-500 hover:text-brand-400 font-medium transition-colors"
              >
                Pick another day
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep("details");
                    setError("");
                  }}
                  className="px-3 py-2.5 bg-surface-100/50 border border-surface-300 rounded-xl text-sm text-white font-medium hover:border-brand-500 hover:bg-brand-500/5 active:scale-[0.98] transition-all text-center"
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Step: Enter details */}
      {step === "details" && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-brand-500" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-white">Your details</h2>
          </div>

          {/* Summary bar */}
          <div className="flex items-center gap-3 px-3 py-2 bg-brand-500/5 border border-brand-500/20 rounded-lg text-xs text-surface-600">
            <span className="font-medium text-white">{selectedDay?.label}</span>
            <span>&middot;</span>
            <span className="font-medium text-white">{selectedSlot?.label}</span>
            <span>&middot;</span>
            <span>{duration} min</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-surface-500 mb-1.5">
                <User className="w-3 h-3" strokeWidth={2} />
                Your name *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Sarah Johnson"
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-surface-500 mb-1.5">
                <Mail className="w-3 h-3" strokeWidth={2} />
                Email
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="sarah@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-surface-500 mb-1.5">
                <Phone className="w-3 h-3" strokeWidth={2} />
                Phone
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+44 7700 900000"
                className={inputClass}
              />
            </div>
            <p className="text-xs text-surface-500">Email or phone required so we can send you a reminder</p>
          </div>

          <button
            onClick={handleBook}
            disabled={loading}
            className="w-full py-3.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Booking...
              </>
            ) : (
              "Confirm booking"
            )}
          </button>
        </>
      )}
    </div>
  );
}
