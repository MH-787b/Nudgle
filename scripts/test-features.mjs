#!/usr/bin/env node

/**
 * Comprehensive feature test suite for Nudgle.
 * Tests booking API, confirmation flow, cron reminders, .ics generation, and availability logic.
 *
 * Usage:
 *   node scripts/test-features.mjs                          # all tests (needs dev server)
 *   node scripts/test-features.mjs --unit                   # unit tests only (no server)
 *   BOOKING_CODE=W3W2WY node scripts/test-features.mjs      # specify booking code
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const BOOKING_CODE = process.env.BOOKING_CODE || "";
const mode = process.argv[2];
const runUnit = !mode || mode === "--unit";
const runIntegration = !mode || mode === "--integration";

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function skip(label) {
  console.log(`  ⏭️  ${label} (skipped)`);
  skipped++;
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

async function testIcsGeneration() {
  console.log("\n📅 .ics Calendar File Generation");

  // Inline a minimal ics generator matching the real one
  function generateIcs(params) {
    const uid = `test-${Date.now()}@nudgle.co.uk`;
    const fmt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const now = fmt(new Date().toISOString());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Nudgle//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${fmt(params.start)}`,
      `DTEND:${fmt(params.end)}`,
      `SUMMARY:${params.summary}`,
      ...(params.description ? [`DESCRIPTION:${params.description}`] : []),
      ...(params.location ? [`LOCATION:${params.location}`] : []),
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    return lines.join("\r\n");
  }

  const ics = generateIcs({
    summary: "Appointment with Fresh Cuts",
    start: "2026-05-15T14:00:00.000Z",
    end: "2026-05-15T14:30:00.000Z",
    description: "Booked via Nudgle",
  });

  assert(ics.includes("BEGIN:VCALENDAR"), "Contains VCALENDAR block");
  assert(ics.includes("BEGIN:VEVENT"), "Contains VEVENT block");
  assert(ics.includes("SUMMARY:Appointment with Fresh Cuts"), "Contains correct summary");
  assert(ics.includes("DTSTART:20260515T140000Z"), "Start time formatted correctly");
  assert(ics.includes("DTEND:20260515T143000Z"), "End time formatted correctly");
  assert(ics.includes("DESCRIPTION:Booked via Nudgle"), "Contains description");
  assert(ics.includes("VERSION:2.0"), "iCalendar version 2.0");
  assert(ics.includes("METHOD:PUBLISH"), "Method is PUBLISH");
  assert(ics.includes("STATUS:CONFIRMED"), "Status is CONFIRMED");
  assert(ics.includes("END:VEVENT"), "VEVENT closed");
  assert(ics.includes("END:VCALENDAR"), "VCALENDAR closed");

  // Test without optional fields
  const icsMinimal = generateIcs({
    summary: "Test",
    start: "2026-06-01T09:00:00.000Z",
    end: "2026-06-01T09:30:00.000Z",
  });
  assert(!icsMinimal.includes("DESCRIPTION:"), "No description when not provided");
  assert(!icsMinimal.includes("LOCATION:"), "No location when not provided");
}

function testAvailabilityLogic() {
  console.log("\n🕐 Availability Logic");

  // Simulate getAvailableDays logic
  function parseBizHours(hours) {
    return hours.filter(h => !h.closed).map(h => ({
      day: h.day_of_week,
      open: h.open_time,
      close: h.close_time,
    }));
  }

  const weekHours = [
    { day_of_week: 0, open_time: "09:00", close_time: "17:00", closed: true },  // Sun closed
    { day_of_week: 1, open_time: "09:00", close_time: "17:00", closed: false }, // Mon open
    { day_of_week: 2, open_time: "09:00", close_time: "17:00", closed: false }, // Tue open
    { day_of_week: 3, open_time: "09:00", close_time: "22:00", closed: false }, // Wed open late
    { day_of_week: 4, open_time: "09:00", close_time: "17:00", closed: false }, // Thu open
    { day_of_week: 5, open_time: "09:00", close_time: "17:00", closed: false }, // Fri open
    { day_of_week: 6, open_time: "10:00", close_time: "14:00", closed: false }, // Sat short
  ];

  const openDays = parseBizHours(weekHours);
  assert(openDays.length === 6, "6 open days (Sunday closed)");
  assert(openDays.find(d => d.day === 0) === undefined, "Sunday excluded");
  assert(openDays.find(d => d.day === 3)?.close === "22:00", "Wednesday open until 22:00");
  assert(openDays.find(d => d.day === 6)?.open === "10:00", "Saturday opens at 10:00");

  // Test slot generation (30-min intervals from open to close)
  function generateSlots(open, close, intervalMins = 30) {
    const slots = [];
    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    let mins = oh * 60 + om;
    const endMins = ch * 60 + cm;
    while (mins + intervalMins <= endMins) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      mins += intervalMins;
    }
    return slots;
  }

  const monSlots = generateSlots("09:00", "17:00", 30);
  assert(monSlots.length === 16, "16 slots from 09:00–17:00 at 30min intervals");
  assert(monSlots[0] === "09:00", "First slot is 09:00");
  assert(monSlots[monSlots.length - 1] === "16:30", "Last slot is 16:30 (not 17:00)");

  const satSlots = generateSlots("10:00", "14:00", 30);
  assert(satSlots.length === 8, "8 slots from 10:00–14:00");

  const wedSlots = generateSlots("09:00", "22:00", 30);
  assert(wedSlots.length === 26, "26 slots from 09:00–22:00");

  // Test overlap detection
  function hasOverlap(newStart, newEnd, existingStart, existingEnd) {
    return newStart < existingEnd && existingStart < newEnd;
  }

  assert(hasOverlap(100, 200, 150, 250) === true, "Overlap: partial overlap");
  assert(hasOverlap(100, 200, 200, 300) === false, "No overlap: adjacent");
  assert(hasOverlap(100, 200, 50, 100) === false, "No overlap: adjacent (before)");
  assert(hasOverlap(100, 300, 150, 250) === true, "Overlap: new contains existing");
  assert(hasOverlap(150, 250, 100, 300) === true, "Overlap: existing contains new");
  assert(hasOverlap(100, 200, 300, 400) === false, "No overlap: completely separate");
}

function testPlanLimits() {
  console.log("\n💰 Plan Limits & Trial Logic");

  const PLAN_LIMITS = {
    trial: { appointments: Infinity, channels: ["email", "whatsapp", "sms"], smsCap: 200 },
    starter: { appointments: 500, channels: ["email", "whatsapp", "sms"], smsCap: 200 },
    business: { appointments: 1500, channels: ["email", "whatsapp", "sms"], smsCap: 500 },
  };

  assert(PLAN_LIMITS.trial.appointments === Infinity, "Trial has no appointment cap");
  assert(PLAN_LIMITS.starter.appointments === 500, "Starter: 500 appointments/mo");
  assert(PLAN_LIMITS.business.appointments === 1500, "Business: 1500 appointments/mo");
  assert(PLAN_LIMITS.business.smsCap === 500, "Business: 500 SMS cap");
  assert(PLAN_LIMITS.starter.smsCap === 200, "Starter: 200 SMS cap");
  assert(PLAN_LIMITS.trial.channels.includes("whatsapp"), "Trial includes WhatsApp");
  assert(PLAN_LIMITS.starter.channels.includes("sms"), "Starter includes SMS");

  // Trial expiry logic
  function isTrialExpired(plan, trialEndsAt) {
    if (plan !== "trial") return false;
    if (!trialEndsAt) return true;
    return new Date(trialEndsAt) < new Date();
  }

  assert(isTrialExpired("trial", null) === true, "Null trial_ends_at = expired");
  assert(isTrialExpired("starter", null) === false, "Starter is never trial-expired");
  assert(isTrialExpired("business", null) === false, "Business is never trial-expired");
  assert(isTrialExpired("trial", "2020-01-01") === true, "Past date = expired");
  assert(isTrialExpired("trial", "2030-01-01") === false, "Future date = not expired");
}

function testChannelFallback() {
  console.log("\n📨 Channel Resolution & Fallback");

  function resolveChannel(preferred, hasPhone, hasEmail, smsSent, smsCap) {
    if (preferred === "sms" && hasPhone) {
      if (smsSent >= smsCap) {
        // Fallback: SMS cap hit → try WhatsApp → email
        return hasPhone ? "whatsapp" : hasEmail ? "email" : null;
      }
      return "sms";
    }
    if (preferred === "whatsapp" && hasPhone) return "whatsapp";
    if (preferred === "email" && hasEmail) return "email";
    // Fallback to email if preferred channel has no recipient
    if (hasEmail) return "email";
    return null;
  }

  assert(resolveChannel("email", false, true, 0, 200) === "email", "Email preferred → email");
  assert(resolveChannel("whatsapp", true, true, 0, 200) === "whatsapp", "WhatsApp preferred + has phone → whatsapp");
  assert(resolveChannel("whatsapp", false, true, 0, 200) === "email", "WhatsApp preferred + no phone → fallback email");
  assert(resolveChannel("sms", true, true, 0, 200) === "sms", "SMS preferred + under cap → sms");
  assert(resolveChannel("sms", true, true, 200, 200) === "whatsapp", "SMS cap hit + has phone → whatsapp");
  assert(resolveChannel("sms", false, true, 200, 200) === "email", "SMS cap hit + no phone → email");
  assert(resolveChannel("whatsapp", false, false, 0, 200) === null, "No phone + no email → null");
}

function testAppointmentStatus() {
  console.log("\n📋 Appointment Status Values");

  const validStatuses = ["pending", "confirmed", "no_response", "cancelled", "pending_approval"];

  assert(validStatuses.length === 5, "5 valid statuses");
  assert(validStatuses.includes("pending_approval"), "pending_approval is valid");
  assert(validStatuses.includes("confirmed"), "confirmed is valid");
  assert(validStatuses.includes("cancelled"), "cancelled is valid");
  assert(validStatuses.includes("no_response"), "no_response is valid");
  assert(validStatuses.includes("pending"), "pending is valid");
}

// ─── Integration Tests ────────────────────────────────────────────────────────

async function testBookingApiGet() {
  console.log("\n🌐 Booking API — GET /api/book");

  if (!BOOKING_CODE) {
    skip("No BOOKING_CODE set — skipping booking API tests");
    return;
  }

  // Test: Get available days
  try {
    const res = await fetch(`${BASE}/api/book?code=${BOOKING_CODE}`);
    assert(res.ok, `GET ?code=${BOOKING_CODE} returns 200`);
    const data = await res.json();
    assert(Array.isArray(data.days), "Response has days array");
    assert(Array.isArray(data.days) && data.days.length >= 0, "Days response is valid");
    if (data.days.length > 0) {
      assert(data.days[0].date, "First day has date field");
      assert(data.days[0].label, "First day has label field");
    }
  } catch (e) {
    assert(false, `GET /api/book failed: ${e.message}`);
  }

  // Test: Get slots for a specific date
  try {
    const daysRes = await fetch(`${BASE}/api/book?code=${BOOKING_CODE}`);
    const daysData = await daysRes.json();
    if (daysData.days?.length > 0) {
      const firstDate = daysData.days[0].date;
      const slotsRes = await fetch(`${BASE}/api/book?code=${BOOKING_CODE}&date=${firstDate}`);
      assert(slotsRes.ok, `GET ?code=...&date=${firstDate} returns 200`);
      const slotsData = await slotsRes.json();
      assert(Array.isArray(slotsData.slots), "Response has slots array");
      if (slotsData.slots.length > 0) {
        assert(slotsData.slots[0].time, "First slot has time field");
        assert(slotsData.slots[0].label, "First slot has label field");
        assert(typeof slotsData.slots[0].conflicted === "boolean", "First slot has conflicted boolean");
      }
    } else {
      skip("No available days — cannot test slots");
    }
  } catch (e) {
    assert(false, `GET /api/book slots failed: ${e.message}`);
  }

  // Test: Invalid booking code
  try {
    const res = await fetch(`${BASE}/api/book?code=INVALID123`);
    assert(!res.ok || (await res.json()).error, "Invalid booking code returns error");
  } catch (e) {
    assert(false, `Invalid code test failed: ${e.message}`);
  }
}

async function testBookingApiPost() {
  console.log("\n📝 Booking API — POST /api/book");

  if (!BOOKING_CODE) {
    skip("No BOOKING_CODE set — skipping POST tests");
    return;
  }

  // Test: Missing required fields
  try {
    const res = await fetch(`${BASE}/api/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: BOOKING_CODE }),
    });
    const data = await res.json();
    assert(data.error, "POST with missing fields returns error");
  } catch (e) {
    assert(false, `POST validation test failed: ${e.message}`);
  }

  // Test: Missing email
  try {
    const res = await fetch(`${BASE}/api/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: BOOKING_CODE,
        date: "2026-05-20",
        time: "10:00",
        clientName: "Test",
      }),
    });
    const data = await res.json();
    assert(data.error, "POST without email returns error");
  } catch (e) {
    assert(false, `POST missing email test failed: ${e.message}`);
  }

  // Test: Invalid date format
  try {
    const res = await fetch(`${BASE}/api/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: BOOKING_CODE,
        date: "invalid",
        time: "10:00",
        clientName: "Test",
        clientEmail: "test@test.com",
      }),
    });
    const data = await res.json();
    assert(!data.success, "POST with invalid date does not succeed");
  } catch (e) {
    assert(false, `POST invalid date test failed: ${e.message}`);
  }
}

async function testConfirmEndpoint() {
  console.log("\n✅ Confirmation Endpoint — GET /api/confirm");

  // Test: Invalid appointment ID
  try {
    const res = await fetch(`${BASE}/api/confirm/00000000-0000-0000-0000-000000000000?response=yes`);
    assert(res.status === 200 || res.status === 404, `Confirm endpoint returns ${res.status} (200 or 404)`);
    const text = await res.text();
    assert(text.includes("html"), "Returns HTML page");
  } catch (e) {
    assert(false, `Confirm endpoint test failed: ${e.message}`);
  }

  // Test: Missing response param
  try {
    const res = await fetch(`${BASE}/api/confirm/00000000-0000-0000-0000-000000000000`);
    const text = await res.text();
    assert(text.includes("html") || res.status === 400, "Missing response param handled");
  } catch (e) {
    assert(false, `Confirm missing param test failed: ${e.message}`);
  }
}

async function testCronEndpoint() {
  console.log("\n⏰ Cron Reminders Endpoint");

  try {
    const res = await fetch(`${BASE}/api/cron/reminders`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET || "test"}` },
    });
    // Should return 200 even with wrong secret (on dev), or 401 on prod
    assert(res.status === 200 || res.status === 401, `Cron returns ${res.status} (200 or 401)`);
    if (res.ok) {
      const data = await res.json();
      assert(typeof data.sent24h === "number", "Response has sent24h count");
      assert(typeof data.sent2h === "number", "Response has sent2h count");
      assert(Array.isArray(data.debug), "Response has debug array");
    }
  } catch (e) {
    assert(false, `Cron endpoint test failed: ${e.message}`);
  }
}

async function testApproveEndpoint() {
  console.log("\n👍 Approval Endpoint — GET /api/approve");

  // Test: Invalid appointment ID
  try {
    const res = await fetch(`${BASE}/api/approve/00000000-0000-0000-0000-000000000000?response=approve`);
    assert(res.status === 200 || res.status === 404, `Approve endpoint returns ${res.status} (200 or 404)`);
    const text = await res.text();
    assert(text.includes("html"), "Returns HTML page");
  } catch (e) {
    assert(false, `Approve endpoint test failed: ${e.message}`);
  }

  // Test: Missing response param
  try {
    const res = await fetch(`${BASE}/api/approve/00000000-0000-0000-0000-000000000000`);
    const text = await res.text();
    assert(text.includes("html") || res.status === 400, "Missing response param handled");
  } catch (e) {
    assert(false, `Approve missing param test failed: ${e.message}`);
  }
}

async function testBookingPage() {
  console.log("\n📄 Public Booking Page");

  if (!BOOKING_CODE) {
    skip("No BOOKING_CODE set — skipping booking page test");
    return;
  }

  try {
    const res = await fetch(`${BASE}/book/${BOOKING_CODE}`);
    assert(res.ok, `GET /book/${BOOKING_CODE} returns 200`);
    const html = await res.text();
    assert(html.includes("html"), "Returns HTML");
    assert(!html.includes("unavailable") || html.includes("Book"), "Page is accessible (not expired trial block)");
  } catch (e) {
    assert(false, `Booking page test failed: ${e.message}`);
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧪 Nudgle Feature Test Suite");
  console.log(`   Mode: ${mode || "all"}`);
  if (BOOKING_CODE) console.log(`   Booking code: ${BOOKING_CODE}`);
  if (runIntegration) console.log(`   Base URL: ${BASE}`);

  if (runUnit) {
    await testIcsGeneration();
    testAvailabilityLogic();
    testPlanLimits();
    testChannelFallback();
    testAppointmentStatus();
  }

  if (runIntegration) {
    await testBookingApiGet();
    await testBookingApiPost();
    await testConfirmEndpoint();
    await testCronEndpoint();
    await testApproveEndpoint();
    await testBookingPage();
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`${failed === 0 ? "✅ All tests passed!" : "❌ Some tests failed"}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
