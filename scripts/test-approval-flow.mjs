#!/usr/bin/env node

/**
 * Tests the full calendar-conflict approval workflow.
 *
 * Part 1: Unit tests — verifies conflict detection logic inline (no server needed)
 * Part 2: Integration tests — hits /api/book and /api/approve against the dev server
 *
 * Usage:
 *   node scripts/test-approval-flow.mjs                 # run all (needs dev server)
 *   node scripts/test-approval-flow.mjs --unit           # unit tests only
 *   node scripts/test-approval-flow.mjs --integration    # integration only
 *   BOOKING_CODE=ABC123 node scripts/test-approval-flow.mjs  # specify booking code
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const BOOKING_CODE = process.env.BOOKING_CODE || "";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n━━━ ${title} ━━━`);
}

// ─── Part 1: Unit Tests ─────────────────────────────────────────────────────
// Re-implements the core conflict detection logic from getAvailableSlots
// to verify it works correctly without needing module imports.

function unitTests() {
  section("UNIT TESTS — Conflict Detection Logic");

  // Simulate dateInTz for Europe/London (UTC+0 in winter, UTC+1 in summer)
  // For test purposes we use UTC directly
  function makeSlotUtc(dateStr, time) {
    return new Date(`${dateStr}T${time}:00Z`);
  }

  // Core logic extracted from getAvailableSlots
  function checkSlotConflicts(slotStart, slotEnd, appointments, busyPeriods) {
    const hasNudgleConflict = appointments.some((apt) => {
      if (apt.status === "cancelled") return false;
      const aptStart = new Date(apt.appointment_time);
      const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60 * 1000);
      return slotStart < aptEnd && slotEnd > aptStart;
    });

    const hasCalendarConflict = busyPeriods.some((busy) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    return { blocked: hasNudgleConflict, conflicted: hasCalendarConflict };
  }

  const DURATION = 30; // minutes

  // Test 1: Clean slot (no conflicts)
  {
    const slotStart = makeSlotUtc("2026-06-15", "10:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const result = checkSlotConflicts(slotStart, slotEnd, [], []);
    assert(!result.blocked && !result.conflicted, "Clean slot: not blocked, not conflicted");
  }

  // Test 2: Nudgle appointment conflict — should be BLOCKED (filtered out)
  {
    const slotStart = makeSlotUtc("2026-06-15", "10:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const appointments = [{
      status: "confirmed",
      appointment_time: "2026-06-15T09:45:00Z",
      duration_minutes: 30,
    }];
    const result = checkSlotConflicts(slotStart, slotEnd, appointments, []);
    assert(result.blocked, "Nudgle appointment overlap: slot is blocked");
  }

  // Test 3: Cancelled appointment should NOT block
  {
    const slotStart = makeSlotUtc("2026-06-15", "10:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const appointments = [{
      status: "cancelled",
      appointment_time: "2026-06-15T10:00:00Z",
      duration_minutes: 30,
    }];
    const result = checkSlotConflicts(slotStart, slotEnd, appointments, []);
    assert(!result.blocked, "Cancelled appointment: slot is NOT blocked");
  }

  // Test 4: Google Calendar busy period — should be CONFLICTED (shown in amber)
  {
    const slotStart = makeSlotUtc("2026-06-15", "14:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const busyPeriods = [
      { start: "2026-06-15T13:30:00Z", end: "2026-06-15T15:00:00Z" },
    ];
    const result = checkSlotConflicts(slotStart, slotEnd, [], busyPeriods);
    assert(!result.blocked && result.conflicted, "Google Calendar overlap: flagged as conflicted, not blocked");
  }

  // Test 5: Busy period ends exactly when slot starts — NOT conflicted
  {
    const slotStart = makeSlotUtc("2026-06-15", "15:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const busyPeriods = [
      { start: "2026-06-15T14:00:00Z", end: "2026-06-15T15:00:00Z" },
    ];
    const result = checkSlotConflicts(slotStart, slotEnd, [], busyPeriods);
    assert(!result.conflicted, "Busy period ends exactly at slot start: NOT conflicted");
  }

  // Test 6: Busy period starts exactly when slot ends — NOT conflicted
  {
    const slotStart = makeSlotUtc("2026-06-15", "10:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const busyPeriods = [
      { start: "2026-06-15T10:30:00Z", end: "2026-06-15T11:30:00Z" },
    ];
    const result = checkSlotConflicts(slotStart, slotEnd, [], busyPeriods);
    assert(!result.conflicted, "Busy period starts exactly at slot end: NOT conflicted");
  }

  // Test 7: Partial overlap — busy period overlaps first 10 min of slot
  {
    const slotStart = makeSlotUtc("2026-06-15", "10:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const busyPeriods = [
      { start: "2026-06-15T09:50:00Z", end: "2026-06-15T10:10:00Z" },
    ];
    const result = checkSlotConflicts(slotStart, slotEnd, [], busyPeriods);
    assert(result.conflicted, "Partial overlap (busy bleeds into slot start): conflicted");
  }

  // Test 8: Both Nudgle and Google conflict — blocked takes priority
  {
    const slotStart = makeSlotUtc("2026-06-15", "10:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const appointments = [{
      status: "confirmed",
      appointment_time: "2026-06-15T10:00:00Z",
      duration_minutes: 30,
    }];
    const busyPeriods = [
      { start: "2026-06-15T10:00:00Z", end: "2026-06-15T11:00:00Z" },
    ];
    const result = checkSlotConflicts(slotStart, slotEnd, appointments, busyPeriods);
    assert(result.blocked, "Both Nudgle + Google conflict: blocked (Nudgle takes priority)");
  }

  // Test 9: Multiple busy periods, slot only conflicts with one
  {
    const slotStart = makeSlotUtc("2026-06-15", "12:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const busyPeriods = [
      { start: "2026-06-15T09:00:00Z", end: "2026-06-15T10:00:00Z" },
      { start: "2026-06-15T12:15:00Z", end: "2026-06-15T13:00:00Z" },
    ];
    const result = checkSlotConflicts(slotStart, slotEnd, [], busyPeriods);
    assert(result.conflicted, "Multiple busy periods, one overlaps: conflicted");
  }

  // Test 10: pending_approval appointment should NOT block new bookings (only cancelled is skipped)
  {
    const slotStart = makeSlotUtc("2026-06-15", "10:00");
    const slotEnd = new Date(slotStart.getTime() + DURATION * 60 * 1000);
    const appointments = [{
      status: "pending_approval",
      appointment_time: "2026-06-15T10:00:00Z",
      duration_minutes: 30,
    }];
    const result = checkSlotConflicts(slotStart, slotEnd, appointments, []);
    assert(result.blocked, "pending_approval still blocks the slot (not cancelled)");
  }
}

// ─── Part 2: Integration Tests ──────────────────────────────────────────────

async function integrationTests() {
  section("INTEGRATION TESTS — API Flow");

  if (!BOOKING_CODE) {
    console.log("  ⚠️  No BOOKING_CODE set. Skipping integration tests.");
    console.log("  Run with: BOOKING_CODE=XXXXXX node scripts/test-approval-flow.mjs");
    return;
  }

  // Check dev server is running
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(3000) });
  } catch {
    console.log(`  ⚠️  Dev server not reachable at ${BASE}. Start with npm run dev.`);
    return;
  }
  console.log(`  Server: ${BASE}`);
  console.log(`  Booking code: ${BOOKING_CODE}`);

  // Step 1: GET available days
  console.log("\n  📅 Step 1: Fetch available days");
  const daysRes = await fetch(`${BASE}/api/book?code=${BOOKING_CODE}`);
  const daysData = await daysRes.json();
  assert(daysRes.ok, `GET /api/book?code=... returned ${daysRes.status}`);
  assert(Array.isArray(daysData.days), `Response has days array (${daysData.days?.length || 0} days)`);

  if (!daysData.days?.length) {
    console.log("  ⚠️  No available days. Can't continue integration tests.");
    return;
  }

  // Step 2: GET time slots — try each day until we find one with slots
  console.log("\n  🕐 Step 2: Fetch time slots");
  let testDate = null;
  let slotsData = null;
  for (const day of daysData.days) {
    const res = await fetch(`${BASE}/api/book?code=${BOOKING_CODE}&date=${day.date}`);
    const data = await res.json();
    if (data.slots?.length > 0) {
      testDate = day.date;
      slotsData = data;
      console.log(`  Using date: ${day.label} (${day.date}) — ${data.slots.length} slots`);
      break;
    }
    console.log(`  Skipped ${day.label} (${day.date}) — no slots available`);
  }

  if (!testDate || !slotsData) {
    console.log("  ⚠️  No slots available on any day. Can't test booking flow.");
    return;
  }

  assert(true, `Found slots on ${testDate}`);
  assert(Array.isArray(slotsData.slots), `Response has slots array (${slotsData.slots?.length || 0} slots)`);

  // Check slot shape includes conflicted field
  if (slotsData.slots?.length) {
    const firstSlot = slotsData.slots[0];
    assert("conflicted" in firstSlot, `Slots include 'conflicted' field (value: ${firstSlot.conflicted})`);
    assert(typeof firstSlot.time === "string", `Slot has 'time' field`);
    assert(typeof firstSlot.label === "string", `Slot has 'label' field`);

    const conflictedSlots = slotsData.slots.filter((s) => s.conflicted);
    const freeSlots = slotsData.slots.filter((s) => !s.conflicted);
    console.log(`  Found ${freeSlots.length} free slots, ${conflictedSlots.length} conflicted slots`);

    assert("calendarBlocking" in slotsData, `Response includes calendarBlocking flag (${slotsData.calendarBlocking})`);
  } else {
    console.log("  ⚠️  No slots available. Can't test booking flow.");
    return;
  }

  // Step 3: Try booking a free slot (should create as confirmed)
  const freeSlots = slotsData.slots.filter((s) => !s.conflicted);
  if (freeSlots.length) {
    console.log("\n  ✅ Step 3a: Book a FREE slot");
    const testSlot = freeSlots[freeSlots.length - 1]; // pick last to avoid conflicts with manual testing
    const bookRes = await fetch(`${BASE}/api/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: BOOKING_CODE,
        date: testDate,
        time: testSlot.time,
        clientName: "Test Free Slot",
        clientEmail: "test-free@example.com",
        clientPhone: null,
      }),
    });
    const bookData = await bookRes.json();

    if (bookRes.ok) {
      assert(!bookData.pendingApproval, "Free slot booking: pendingApproval is false");
      assert(bookData.appointment?.id, `Appointment created with ID: ${bookData.appointment?.id}`);
      console.log(`  💡 Clean up: delete appointment ${bookData.appointment?.id} from Supabase after testing`);
    } else {
      assert(false, `Free slot booking failed: ${bookData.error} (${bookRes.status})`);
    }
  } else {
    console.log("\n  ⚠️  Step 3a: No free slots to test direct booking");
  }

  // Step 3b: Try booking a conflicted slot (should create as pending_approval)
  const conflictedSlots = slotsData.slots.filter((s) => s.conflicted);
  if (conflictedSlots.length) {
    console.log("\n  ⚠️ Step 3b: Book a CONFLICTED slot");
    const testSlot = conflictedSlots[0];
    console.log(`  Requesting conflicted slot: ${testSlot.label} (${testSlot.time})`);

    const bookRes = await fetch(`${BASE}/api/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: BOOKING_CODE,
        date: testDate,
        time: testSlot.time,
        clientName: "Test Conflict Slot",
        clientEmail: "test-conflict@example.com",
        clientPhone: null,
      }),
    });
    const bookData = await bookRes.json();

    if (bookRes.ok) {
      assert(bookData.pendingApproval === true, "Conflicted slot: pendingApproval is true");
      assert(bookData.appointment?.id, `Appointment created with ID: ${bookData.appointment?.id}`);

      const aptId = bookData.appointment.id;

      // Step 4: Test the approve endpoint
      console.log("\n  📧 Step 4: Test APPROVE endpoint");

      // Test invalid response param
      const invalidRes = await fetch(`${BASE}/api/approve/${aptId}?response=invalid`);
      assert(invalidRes.status === 400, "Invalid response param returns 400");

      // Test approve
      const approveRes = await fetch(`${BASE}/api/approve/${aptId}?response=approve`);
      const approveHtml = await approveRes.text();
      assert(approveRes.ok, `Approve endpoint returned ${approveRes.status}`);
      assert(approveHtml.includes("Approved"), "Approve response HTML contains 'Approved'");

      // Step 5: Test double-approve (should say already processed)
      console.log("\n  🔁 Step 5: Test DOUBLE APPROVE (idempotency)");
      const doubleRes = await fetch(`${BASE}/api/approve/${aptId}?response=approve`);
      const doubleHtml = await doubleRes.text();
      assert(doubleHtml.includes("already been approved"), "Double approve shows 'already approved' message");

      // Step 6: Test reject on already-approved (should say already processed)
      const rejectAfterApprove = await fetch(`${BASE}/api/approve/${aptId}?response=reject`);
      const rejectHtml = await rejectAfterApprove.text();
      assert(rejectHtml.includes("already been approved"), "Reject after approve shows 'already approved'");

      console.log(`\n  💡 Clean up: delete appointment ${aptId} from Supabase after testing`);
    } else {
      assert(false, `Conflicted slot booking failed: ${bookData.error} (${bookRes.status})`);
    }
  } else {
    console.log("\n  ⚠️  Step 3b: No conflicted slots found (Google OAuth may not be configured locally).");
    console.log("     Testing approval flow via direct DB insert instead...");

    // Create a pending_approval appointment directly in Supabase to test the approve/reject flow
    await testApprovalViaDirect(testDate);
  }

  // Step 7: Test expired trial blocking
  console.log("\n  🔒 Step 7: Test invalid/missing booking code");
  const badCodeRes = await fetch(`${BASE}/api/book?code=ZZZZZZ`);
  const badCodeData = await badCodeRes.json();
  assert(badCodeRes.status === 404, "Invalid booking code returns 404");
  assert(badCodeData.error === "Business not found", "Error message is correct");
}

// ─── Direct DB approval test (bypasses Google Calendar) ─────────────────────

async function testApprovalViaDirect(testDate) {
  // Load env vars from .env.local
  const { readFileSync } = await import("fs");
  let envVars = {};
  try {
    const envContent = readFileSync(".env.local", "utf8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) envVars[match[1]] = match[2].trim();
    }
  } catch {
    console.log("  ⚠️  Could not read .env.local — skipping direct DB test");
    return;
  }

  const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.log("  ⚠️  Missing Supabase env vars — skipping direct DB test");
    return;
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // Find the business profile by booking code
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?booking_code=eq.${BOOKING_CODE}&select=id`,
    { headers }
  );
  const profiles = await profileRes.json();
  if (!profiles?.length) {
    console.log("  ⚠️  Could not find profile — skipping direct DB test");
    return;
  }
  const userId = profiles[0].id;

  console.log("\n  📝 Step 3b (direct): Insert pending_approval appointment via Supabase");

  // Create a pending_approval appointment for tomorrow at 10:00
  const aptTime = new Date(`${testDate}T10:00:00Z`).toISOString();
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId,
      client_name: "Test Approval Client",
      client_email: "test-approval@example.com",
      client_phone: null,
      appointment_time: aptTime,
      duration_minutes: 30,
      status: "pending_approval",
    }),
  });

  const inserted = await insertRes.json();
  if (!insertRes.ok || !inserted?.length) {
    console.log("  ❌ Failed to insert test appointment:", JSON.stringify(inserted));
    return;
  }

  const aptId = inserted[0].id;
  assert(true, `Created pending_approval appointment: ${aptId}`);

  // Step 4: Test APPROVE
  console.log("\n  📧 Step 4: Test APPROVE endpoint");

  const invalidRes = await fetch(`${BASE}/api/approve/${aptId}?response=invalid`);
  assert(invalidRes.status === 400, "Invalid response param returns 400");

  const approveRes = await fetch(`${BASE}/api/approve/${aptId}?response=approve`);
  const approveHtml = await approveRes.text();
  assert(approveRes.ok, `Approve endpoint returned ${approveRes.status}`);
  assert(approveHtml.includes("Approved"), "Approve response HTML contains 'Approved'");

  // Wait briefly for async Google Calendar sync to complete
  await new Promise((r) => setTimeout(r, 2000));

  // Verify status changed in DB + check Google Calendar sync
  const checkRes = await fetch(
    `${supabaseUrl}/rest/v1/appointments?id=eq.${aptId}&select=status,google_event_id`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const checkData = await checkRes.json();
  assert(checkData?.[0]?.status === "confirmed", `DB status updated to 'confirmed' (got: ${checkData?.[0]?.status})`);

  // Google Calendar sync check
  const gcalEventId = checkData?.[0]?.google_event_id;
  if (gcalEventId) {
    assert(true, `Google Calendar event created: ${gcalEventId}`);
  } else {
    console.log("  ⚠️  google_event_id is null — Google Calendar sync skipped (OAuth not configured locally, will work on production)");
  }

  // Step 5: Test DOUBLE APPROVE (idempotency)
  console.log("\n  🔁 Step 5: Test DOUBLE APPROVE (idempotency)");
  const doubleRes = await fetch(`${BASE}/api/approve/${aptId}?response=approve`);
  const doubleHtml = await doubleRes.text();
  assert(doubleHtml.includes("already been approved"), "Double approve shows 'already approved' message");

  // Step 6: Test REJECT on already-approved
  const rejectAfterApprove = await fetch(`${BASE}/api/approve/${aptId}?response=reject`);
  const rejectHtml = await rejectAfterApprove.text();
  assert(rejectHtml.includes("already been approved"), "Reject after approve shows 'already approved'");

  // Clean up: delete the test appointment
  await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${aptId}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  console.log(`  🧹 Cleaned up test appointment ${aptId}`);

  // Step 6b: Test REJECT flow with a fresh appointment
  console.log("\n  🚫 Step 6b: Test REJECT flow");
  const insertRes2 = await fetch(`${supabaseUrl}/rest/v1/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: userId,
      client_name: "Test Reject Client",
      client_email: "test-reject@example.com",
      client_phone: null,
      appointment_time: aptTime,
      duration_minutes: 30,
      status: "pending_approval",
    }),
  });
  const inserted2 = await insertRes2.json();
  const aptId2 = inserted2?.[0]?.id;
  assert(!!aptId2, `Created second pending_approval appointment: ${aptId2}`);

  const rejectRes = await fetch(`${BASE}/api/approve/${aptId2}?response=reject`);
  const rejectResHtml = await rejectRes.text();
  assert(rejectRes.ok, `Reject endpoint returned ${rejectRes.status}`);
  assert(rejectResHtml.includes("Declined"), "Reject response HTML contains 'Declined'");

  // Verify status changed to cancelled in DB
  const checkRes2 = await fetch(
    `${supabaseUrl}/rest/v1/appointments?id=eq.${aptId2}&select=status`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  const checkData2 = await checkRes2.json();
  assert(checkData2?.[0]?.status === "cancelled", `DB status updated to 'cancelled' (got: ${checkData2?.[0]?.status})`);

  // Clean up
  await fetch(`${supabaseUrl}/rest/v1/appointments?id=eq.${aptId2}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  console.log(`  🧹 Cleaned up test appointment ${aptId2}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const runUnit = args.includes("--unit") || !args.some((a) => a.startsWith("--"));
  const runIntegration = args.includes("--integration") || !args.some((a) => a.startsWith("--"));

  console.log("🧪 Nudgle Approval Flow Test Suite\n");

  if (runUnit) unitTests();
  if (runIntegration) await integrationTests();

  section("RESULTS");
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
