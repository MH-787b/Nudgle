"use client";

import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Appointment } from "@/lib/types";
import type { GoogleEvent } from "@/lib/google-calendar";

interface Props {
  appointments: Appointment[];
  googleEvents?: GoogleEvent[];
  weekStartISO: string;
  prevWeekHref: string;
  nextWeekHref: string;
  todayHref: string;
  isCurrentWeek: boolean;
  confirmedCount: number;
  totalWeek: number;
  timezone: string;
}

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const HOUR_HEIGHT = 60;

interface CalendarBlock {
  id: string;
  title: string;
  startMinutes: number; // minutes from DAY_START_HOUR
  durationMinutes: number;
  type: "confirmed" | "pending" | "cancelled" | "google";
  href?: string;
  timeLabel: string;
  // Layout columns (set by layoutBlocks)
  column: number;
  totalColumns: number;
}

/** Assign column positions to overlapping blocks so they render side-by-side. */
function layoutBlocks(blocks: CalendarBlock[]): void {
  if (blocks.length === 0) return;

  // Sort by start time, then by duration (longer first)
  blocks.sort((a, b) => a.startMinutes - b.startMinutes || b.durationMinutes - a.durationMinutes);

  // Group overlapping blocks
  const groups: CalendarBlock[][] = [];
  let currentGroup: CalendarBlock[] = [];
  let groupEnd = -1;

  for (const block of blocks) {
    if (currentGroup.length === 0 || block.startMinutes < groupEnd) {
      currentGroup.push(block);
      groupEnd = Math.max(groupEnd, block.startMinutes + block.durationMinutes);
    } else {
      groups.push(currentGroup);
      currentGroup = [block];
      groupEnd = block.startMinutes + block.durationMinutes;
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Assign columns within each group
  for (const group of groups) {
    const columns: number[] = []; // tracks end time of each column
    for (const block of group) {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        if (block.startMinutes >= columns[col]) {
          block.column = col;
          columns[col] = block.startMinutes + block.durationMinutes;
          placed = true;
          break;
        }
      }
      if (!placed) {
        block.column = columns.length;
        columns.push(block.startMinutes + block.durationMinutes);
      }
    }
    const totalCols = columns.length;
    for (const block of group) {
      block.totalColumns = totalCols;
    }
  }
}

function getMinutesFromMidnight(date: Date, timezone: string): number {
  const timeStr = date.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function formatTimeRange(startDate: Date, durationMin: number, timezone: string): string {
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    }).toLowerCase();
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

export function WeekCalendar({
  appointments,
  googleEvents = [],
  weekStartISO,
  prevWeekHref,
  nextWeekHref,
  todayHref,
  isCurrentWeek,
  confirmedCount,
  totalWeek,
  timezone,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();
  const [nowMinutes, setNowMinutes] = useState(() =>
    getMinutesFromMidnight(new Date(), timezone)
  );

  // Close expanded popout when clicking outside
  const handleBackdropClick = useCallback(() => {
    setExpandedId(null);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMinutes(getMinutesFromMidnight(new Date(), timezone));
    }, 60000);
    return () => clearInterval(interval);
  }, [timezone]);

  const now = new Date();
  const today = startOfDay(now);
  const weekMonday = new Date(weekStartISO);

  // Build day data
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekMonday, i);
    const isToday = isSameDay(date, now);

    // Build calendar blocks for this day
    const blocks: CalendarBlock[] = [];

    // Nudgle appointments
    appointments
      .filter((a) => isSameDay(new Date(a.appointment_time), date))
      .forEach((apt) => {
        const startDate = new Date(apt.appointment_time);
        const mins = getMinutesFromMidnight(startDate, timezone);
        const startFromGrid = mins - DAY_START_HOUR * 60;

        if (startFromGrid + apt.duration_minutes > 0 && startFromGrid < TOTAL_HOURS * 60) {
          blocks.push({
            id: apt.id,
            title: apt.client_name,
            startMinutes: Math.max(0, startFromGrid),
            durationMinutes: apt.duration_minutes,
            type:
              apt.status === "confirmed"
                ? "confirmed"
                : apt.status === "cancelled"
                  ? "cancelled"
                  : "pending",
            href: `/appointments/${apt.id}`,
            timeLabel: formatTimeRange(startDate, apt.duration_minutes, timezone),
            column: 0,
            totalColumns: 1,
          });
        }
      });

    // Google Calendar events
    googleEvents
      .filter((e) => !e.allDay && isSameDay(new Date(e.start), date))
      .forEach((evt) => {
        const startDate = new Date(evt.start);
        const endDate = new Date(evt.end);
        const mins = getMinutesFromMidnight(startDate, timezone);
        const duration = Math.round(
          (endDate.getTime() - startDate.getTime()) / 60000
        );
        const startFromGrid = mins - DAY_START_HOUR * 60;

        if (startFromGrid + duration > 0 && startFromGrid < TOTAL_HOURS * 60) {
          blocks.push({
            id: evt.id,
            title: evt.summary,
            startMinutes: Math.max(0, startFromGrid),
            durationMinutes: duration,
            type: "google",
            timeLabel: formatTimeRange(startDate, duration, timezone),
            column: 0,
            totalColumns: 1,
          });
        }
      });

    // Compute side-by-side layout for overlapping events
    layoutBlocks(blocks);

    return { date, isToday, blocks };
  });

  const weekLabel = `${format(weekMonday, "d MMM")} — ${format(addDays(weekMonday, 6), "d MMM")}`;
  const gridHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const nowOffset = nowMinutes - DAY_START_HOUR * 60;
  const showNowLine = isCurrentWeek && nowOffset >= 0 && nowOffset <= TOTAL_HOURS * 60;

  const colorMap = {
    confirmed: {
      bg: "bg-green-500/15",
      border: "border-green-500/30",
      leftBorder: "border-l-green-500",
      text: "text-green-400",
      title: "text-white",
    },
    pending: {
      bg: "bg-brand-500/15",
      border: "border-brand-500/30",
      leftBorder: "border-l-brand-500",
      text: "text-brand-400",
      title: "text-white",
    },
    cancelled: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      leftBorder: "border-l-red-500/40",
      text: "text-red-400/60",
      title: "text-white/40",
    },
    google: {
      bg: "bg-blue-500/15",
      border: "border-blue-500/30",
      leftBorder: "border-l-blue-500",
      text: "text-blue-400",
      title: "text-white/80",
    },
  };

  const calendar = (
    <div
      className={`bg-surface-100 rounded-xl border border-surface-300 flex flex-col ${
        isFullscreen ? "h-full" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-300">
        <div className="flex items-center gap-1">
          <Link
            href={prevWeekHref}
            className="p-1.5 rounded hover:bg-surface-200 text-surface-500 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </Link>
          <span className="text-sm font-medium text-surface-600 min-w-[130px] text-center">
            {weekLabel}
          </span>
          <Link
            href={nextWeekHref}
            className="p-1.5 rounded hover:bg-surface-200 text-surface-500 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </Link>
          {!isCurrentWeek && (
            <Link
              href={todayHref}
              className="text-xs text-brand-500 hover:text-brand-400 font-medium ml-1"
            >
              Today
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-surface-500">
            {confirmedCount}/{totalWeek} confirmed
          </span>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-surface-200 text-surface-500 hover:text-white transition-colors"
          >
            {isFullscreen ? (
              <X className="w-4 h-4" strokeWidth={2} />
            ) : (
              <Maximize2 className="w-4 h-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid border-b border-surface-300" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        <div />
        {days.map((day, i) => (
          <div
            key={i}
            className={`text-center py-2 border-l border-surface-300/50 ${
              day.isToday ? "bg-brand-500/5" : ""
            }`}
          >
            <p className="text-[10px] font-mono uppercase tracking-wider text-surface-500">
              {format(day.date, "EEE")}
            </p>
            <p
              className={`text-sm font-bold ${
                day.isToday ? "text-brand-500" : "text-white"
              }`}
            >
              {format(day.date, "d")}
            </p>
          </div>
        ))}
      </div>

      {/* Backdrop to close expanded popout */}
      {expandedId && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleBackdropClick}
        />
      )}

      {/* Time grid */}
      <div
        className={`overflow-auto week-cal-scroll ${
          isFullscreen ? "flex-1" : "max-h-[500px]"
        }`}
      >
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: "48px repeat(7, 1fr)",
            height: `${gridHeight}px`,
          }}
        >
          {/* Hour labels + gridlines */}
          {Array.from({ length: TOTAL_HOURS }, (_, i) => {
            const hour = DAY_START_HOUR + i;
            const label =
              hour === 0
                ? "12 AM"
                : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`;

            return (
              <div
                key={hour}
                className="contents"
              >
                {/* Time label */}
                <div
                  className="text-[10px] font-mono text-surface-500 text-right pr-2 -mt-[7px] select-none"
                  style={{
                    gridColumn: "1",
                    gridRow: "1",
                    marginTop: `${i * HOUR_HEIGHT - 7}px`,
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}

          {/* Gridlines spanning full width */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
            <div
              key={`line-${i}`}
              className="absolute left-[48px] right-0 border-t border-surface-300/30"
              style={{ top: `${i * HOUR_HEIGHT}px` }}
            />
          ))}

          {/* Day columns */}
          {days.map((day, dayIdx) => (
            <div
              key={dayIdx}
              className={`relative border-l border-surface-300/50 ${
                day.isToday ? "bg-brand-500/[0.03]" : ""
              }`}
              style={{
                gridColumn: `${dayIdx + 2}`,
                gridRow: "1",
                height: `${gridHeight}px`,
              }}
            >
              {/* Event blocks */}
              {day.blocks.map((block) => {
                const top = (block.startMinutes / 60) * HOUR_HEIGHT;
                const height = Math.max(
                  (block.durationMinutes / 60) * HOUR_HEIGHT,
                  20
                );
                const colors = colorMap[block.type];
                // Equal-width column layout for overlapping events
                const n = block.totalColumns;
                const col = block.column;
                const gap = 2; // px gap between columns
                const leftPercent = n > 1 ? col * (100 / n) : 0;
                const widthPercent = 100 / n;
                const isExpanded = expandedId === block.id;

                const statusLabel = block.type === "google"
                  ? "Google Calendar"
                  : block.type === "confirmed"
                    ? "Confirmed"
                    : block.type === "cancelled"
                      ? "Cancelled"
                      : "Pending";
                const statusColor = block.type === "google"
                  ? "text-blue-400"
                  : block.type === "confirmed"
                    ? "text-green-400"
                    : block.type === "cancelled"
                      ? "text-red-400"
                      : "text-brand-400";

                const popout = (
                  <div className={`rounded-lg border ${colors.border} shadow-xl shadow-black/50 p-3 ${
                    block.type === "confirmed" ? "bg-green-950" :
                    block.type === "cancelled" ? "bg-red-950" :
                    block.type === "google" ? "bg-blue-950" :
                    "bg-surface-50"
                  }`}>
                    <p className="text-sm font-semibold text-white">
                      {block.title}
                    </p>
                    <p className={`text-xs font-mono mt-1 ${colors.text}`}>
                      {block.timeLabel}
                    </p>
                    <p className={`text-[10px] mt-1.5 ${statusColor}`}>
                      {statusLabel}
                    </p>
                    {block.href && (
                      <p className="text-[10px] mt-2 text-surface-500 lg:hidden">
                        Tap again to view details
                      </p>
                    )}
                  </div>
                );

                return (
                  <div
                    key={block.id}
                    className={`group/event absolute rounded-r rounded-l-sm ${colors.bg} border ${colors.border} border-l-2 ${colors.leftBorder} overflow-visible cursor-pointer ${
                      block.type === "cancelled" ? "opacity-40" : ""
                    }`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      minHeight: "20px",
                      left: `calc(${leftPercent}% + ${gap / 2}px)`,
                      width: `calc(${widthPercent}% - ${gap}px)`,
                      zIndex: isExpanded ? 50 : (block.type === "google" ? 1 : 2) + block.column,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
                      if (isDesktop) {
                        // Desktop: click navigates directly (hover shows popout)
                        if (block.href) router.push(block.href);
                      } else {
                        // Mobile: first tap expands, second tap navigates
                        if (isExpanded && block.href) {
                          router.push(block.href);
                        } else {
                          setExpandedId(isExpanded ? null : block.id);
                        }
                      }
                    }}
                  >
                    {/* Compact view */}
                    <div className="px-1.5 py-0.5 h-full overflow-hidden">
                      <p className={`text-[11px] leading-tight font-semibold truncate ${colors.title}`}>
                        {block.title}
                      </p>
                      {height >= 32 && (
                        <p className={`text-[10px] font-mono ${colors.text} truncate`}>
                          {block.timeLabel}
                        </p>
                      )}
                    </div>

                    {/* Desktop: hover popout */}
                    {!isExpanded && (
                      <div className="hidden lg:group-hover/event:block absolute left-1/2 -translate-x-1/2 top-0 min-w-[180px] max-w-[240px] z-50 pointer-events-none">
                        {popout}
                      </div>
                    )}

                    {/* Mobile + desktop: tap/click expanded popout */}
                    {isExpanded && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-0 min-w-[180px] max-w-[240px] z-50">
                        {popout}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Current time indicator */}
              {day.isToday && showNowLine && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{
                    top: `${(nowOffset / 60) * HOUR_HEIGHT}px`,
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-brand-500 -ml-1 shrink-0" />
                    <div className="flex-1 h-[2px] bg-brand-500" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-50 p-4 lg:p-8">
        {calendar}
      </div>
    );
  }

  return calendar;
}
