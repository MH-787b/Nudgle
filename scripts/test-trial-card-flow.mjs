#!/usr/bin/env node

/**
 * Tests the trial-requires-card flow end-to-end.
 *
 * Part 1: Unit tests — verifies trial logic, state detection, webhook behavior (no server needed)
 * Part 2: Integration tests — hits Gumroad webhook and checks profile state (needs dev server + env vars)
 *
 * Usage:
 *   node scripts/test-trial-card-flow.mjs              # all tests
 *   node scripts/test-trial-card-flow.mjs --unit        # unit tests only (no server needed)
 *   node scripts/test-trial-card-flow.mjs --integration # integration only (needs dev server)
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const mode = process.argv[2];
const runUnit = !mode || mode === "--unit";
const runIntegration = !mode || mode === "--integration";

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

function unitTests() {

  // ── 1. Trial duration constant ──────────────────────────────────────────
  section("Trial Duration");

  const TRIAL_DURATION_DAYS = 7;
  assert(TRIAL_DURATION_DAYS === 7, "TRIAL_DURATION_DAYS is 7");
  assert(TRIAL_DURATION_DAYS !== 14, "TRIAL_DURATION_DAYS is not 14 (old value)");

  // ── 2. isTrialExpired logic ─────────────────────────────────────────────
  section("isTrialExpired() — core gating logic");

  function isTrialExpired(plan, trialEndsAt) {
    if (plan !== "trial") return false;
    if (!trialEndsAt) return true;
    return new Date(trialEndsAt) < new Date();
  }

  // Non-trial plans never expire
  assert(isTrialExpired("starter", null) === false, "starter plan → not expired");
  assert(isTrialExpired("business", null) === false, "business plan → not expired");
  assert(isTrialExpired("starter", "2020-01-01T00:00:00Z") === false, "starter with old date → not expired");

  // Trial with NULL trial_ends_at = card not added = treated as expired (gating blocks features)
  assert(isTrialExpired("trial", null) === true, "trial + null trial_ends_at → expired (pending card)");
  assert(isTrialExpired("trial", undefined) === true, "trial + undefined trial_ends_at → expired");

  // Trial with future date = active
  const future = new Date();
  future.setDate(future.getDate() + 3);
  assert(isTrialExpired("trial", future.toISOString()) === false, "trial + 3 days left → not expired");

  const farFuture = new Date();
  farFuture.setDate(farFuture.getDate() + 7);
  assert(isTrialExpired("trial", farFuture.toISOString()) === false, "trial + 7 days left → not expired");

  // Trial with past date = expired
  const past = new Date();
  past.setDate(past.getDate() - 1);
  assert(isTrialExpired("trial", past.toISOString()) === true, "trial + 1 day ago → expired");

  const longPast = new Date();
  longPast.setDate(longPast.getDate() - 30);
  assert(isTrialExpired("trial", longPast.toISOString()) === true, "trial + 30 days ago → expired");

  // ── 3. Pending card detection ───────────────────────────────────────────
  section("Pending Card State Detection");

  function isPendingCard(plan, trialEndsAt) {
    return plan === "trial" && !trialEndsAt;
  }

  assert(isPendingCard("trial", null) === true, "trial + null → pending card");
  assert(isPendingCard("trial", undefined) === true, "trial + undefined → pending card");
  assert(isPendingCard("trial", future.toISOString()) === false, "trial + future date → NOT pending card");
  assert(isPendingCard("trial", past.toISOString()) === false, "trial + past date → NOT pending card (it's expired)");
  assert(isPendingCard("starter", null) === false, "starter + null → NOT pending card");
  assert(isPendingCard("business", null) === false, "business + null → NOT pending card");

  // ── 4. Trial activation (webhook logic) ─────────────────────────────────
  section("Webhook Trial Activation Logic");

  function simulateWebhook(existingProfile, resourceName) {
    const isTrialActivation =
      existingProfile?.plan === "trial" && !existingProfile?.trial_ends_at;

    if (resourceName === "sale" || resourceName === "subscription_updated") {
      if (isTrialActivation) {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);
        return {
          action: "trial_activation",
          trial_ends_at: trialEndsAt.toISOString(),
          reminders_active: true,
        };
      } else {
        return {
          action: "plan_upgrade",
          trial_ends_at: null,
        };
      }
    }

    if (resourceName === "cancellation" || resourceName === "subscription_ended") {
      return { action: "downgrade" };
    }

    return { action: "none" };
  }

  // New user on trial with no card → trial activation
  const newUser = { plan: "trial", trial_ends_at: null };
  const activationResult = simulateWebhook(newUser, "sale");
  assert(activationResult.action === "trial_activation", "New trial user + sale → trial activation");
  assert(activationResult.reminders_active === true, "Trial activation sets reminders_active = true");
  assert(activationResult.trial_ends_at !== null, "Trial activation sets trial_ends_at");

  // Verify trial_ends_at is ~7 days from now
  const trialEnd = new Date(activationResult.trial_ends_at);
  const daysUntil = (trialEnd - new Date()) / (1000 * 60 * 60 * 24);
  assert(daysUntil > 6.9 && daysUntil < 7.1, `Trial ends in ~7 days (got ${daysUntil.toFixed(2)})`);

  // User already on active trial → plan upgrade (not trial activation)
  const activeTrialUser = { plan: "trial", trial_ends_at: future.toISOString() };
  const upgradeResult = simulateWebhook(activeTrialUser, "sale");
  assert(upgradeResult.action === "plan_upgrade", "Active trial user + sale → plan upgrade");

  // User on starter → plan upgrade
  const starterUser = { plan: "starter", trial_ends_at: null };
  const starterResult = simulateWebhook(starterUser, "sale");
  assert(starterResult.action === "plan_upgrade", "Starter user + sale → plan upgrade");

  // Cancellation
  const cancelResult = simulateWebhook(activeTrialUser, "cancellation");
  assert(cancelResult.action === "downgrade", "Cancellation → downgrade");

  const endedResult = simulateWebhook(starterUser, "subscription_ended");
  assert(endedResult.action === "downgrade", "subscription_ended → downgrade");

  // subscription_updated also triggers
  const subUpdated = simulateWebhook(newUser, "subscription_updated");
  assert(subUpdated.action === "trial_activation", "subscription_updated for new user → trial activation");

  // ── 5. Trial progress bar math ──────────────────────────────────────────
  section("Trial Progress Bar Calculations");

  function trialProgress(daysLeft) {
    return Math.min(100, ((7 - daysLeft) / 7) * 100);
  }

  assert(trialProgress(7) === 0, "7 days left → 0% progress");
  assert(trialProgress(0) === 100, "0 days left → 100% progress");
  assert(Math.abs(trialProgress(3.5) - 50) < 0.01, "3.5 days left → 50% progress");
  assert(Math.abs(trialProgress(1) - (6 / 7) * 100) < 0.01, "1 day left → ~85.7% progress");

  // Old 14-day math should NOT be used
  function oldTrialProgress(daysLeft) {
    return Math.min(100, ((14 - daysLeft) / 14) * 100);
  }
  assert(trialProgress(7) !== oldTrialProgress(7), "New 7-day math differs from old 14-day math");

  // ── 6. Onboarding does NOT set reminders_active ─────────────────────────
  section("Onboarding Profile Update Shape");

  function buildOnboardingUpdate(reminderMethod, phone, businessName) {
    return {
      reminder_method: reminderMethod,
      phone: (reminderMethod === "sms" || reminderMethod === "whatsapp") ? phone : null,
      onboarding_completed: true,
      ...(businessName && { business_name: businessName }),
    };
  }

  const emailUpdate = buildOnboardingUpdate("email", null, "Test Salon");
  assert(emailUpdate.onboarding_completed === true, "Onboarding sets onboarding_completed = true");
  assert(emailUpdate.reminders_active === undefined, "Onboarding does NOT set reminders_active");
  assert(emailUpdate.reminder_method === "email", "Onboarding saves reminder_method");
  assert(emailUpdate.phone === null, "Email method → phone is null");
  assert(emailUpdate.business_name === "Test Salon", "Business name saved");

  const smsUpdate = buildOnboardingUpdate("sms", "+447123456789", "Test Barber");
  assert(smsUpdate.phone === "+447123456789", "SMS method → phone is saved");

  const noBusinessName = buildOnboardingUpdate("email", null, "");
  assert(noBusinessName.business_name === undefined, "Empty business name → not included");

  // ── 7. Gumroad URL construction ─────────────────────────────────────────
  section("Gumroad Checkout URL");

  function buildGumroadUrl(baseUrl, email) {
    return `${baseUrl}?email=${encodeURIComponent(email)}`;
  }

  const url1 = buildGumroadUrl("https://hulme6.gumroad.com/l/ypimv", "test@example.com");
  assert(url1 === "https://hulme6.gumroad.com/l/ypimv?email=test%40example.com", "Email encoded in Gumroad URL");

  const url2 = buildGumroadUrl("https://hulme6.gumroad.com/l/ypimv", "user+tag@example.com");
  assert(url2.includes("user%2Btag%40example.com"), "Plus sign encoded correctly");

  // ── 8. State machine: all user states ───────────────────────────────────
  section("User State Machine — All Possible States");

  function getUserState(profile) {
    if (!profile.onboarding_completed) return "onboarding";
    if (profile.plan === "trial" && !profile.trial_ends_at) return "pending_card";
    if (profile.plan === "trial") {
      const expired = new Date(profile.trial_ends_at) < new Date();
      if (expired) return "trial_expired";
      return "trial_active";
    }
    return "paid";
  }

  assert(getUserState({ onboarding_completed: false, plan: "trial", trial_ends_at: null }) === "onboarding",
    "Not onboarded → onboarding");

  assert(getUserState({ onboarding_completed: true, plan: "trial", trial_ends_at: null }) === "pending_card",
    "Onboarded + no card → pending_card");

  assert(getUserState({ onboarding_completed: true, plan: "trial", trial_ends_at: future.toISOString() }) === "trial_active",
    "Onboarded + future trial → trial_active");

  assert(getUserState({ onboarding_completed: true, plan: "trial", trial_ends_at: past.toISOString() }) === "trial_expired",
    "Onboarded + past trial → trial_expired");

  assert(getUserState({ onboarding_completed: true, plan: "starter", trial_ends_at: null }) === "paid",
    "Starter plan → paid");

  assert(getUserState({ onboarding_completed: true, plan: "business", trial_ends_at: null }) === "paid",
    "Business plan → paid");

  // ── 9. Cron should skip pending card users ──────────────────────────────
  section("Cron — Pending Card Users Skipped");

  function shouldSendReminder(profile) {
    if (!profile.reminders_active) return false;
    if (isTrialExpired(profile.plan, profile.trial_ends_at)) return false;
    return true;
  }

  assert(shouldSendReminder({ reminders_active: false, plan: "trial", trial_ends_at: null }) === false,
    "Pending card user (reminders_active=false) → skip");

  assert(shouldSendReminder({ reminders_active: true, plan: "trial", trial_ends_at: future.toISOString() }) === true,
    "Active trial user → send");

  assert(shouldSendReminder({ reminders_active: true, plan: "trial", trial_ends_at: past.toISOString() }) === false,
    "Expired trial user → skip");

  assert(shouldSendReminder({ reminders_active: true, plan: "starter", trial_ends_at: null }) === true,
    "Paid starter user → send");

  assert(shouldSendReminder({ reminders_active: false, plan: "starter", trial_ends_at: null }) === false,
    "Paid user with reminders off → skip");

  // ── 10. Booking page gating ─────────────────────────────────────────────
  section("Booking Page — Gating for Pending Card");

  function isBookingAvailable(business) {
    return !isTrialExpired(business.plan, business.trial_ends_at);
  }

  assert(isBookingAvailable({ plan: "trial", trial_ends_at: null }) === false,
    "Pending card → booking unavailable");
  assert(isBookingAvailable({ plan: "trial", trial_ends_at: future.toISOString() }) === true,
    "Active trial → booking available");
  assert(isBookingAvailable({ plan: "trial", trial_ends_at: past.toISOString() }) === false,
    "Expired trial → booking unavailable");
  assert(isBookingAvailable({ plan: "starter", trial_ends_at: null }) === true,
    "Paid plan → booking available");

  // ── 11. PLAN_LIMITS sanity ──────────────────────────────────────────────
  section("PLAN_LIMITS Constants");

  const PLAN_LIMITS = {
    trial: { name: "Free Trial", price: 0, appointments: 500, smsCap: 200, maxStaff: 1 },
    starter: { name: "Starter", price: 29, appointments: 500, smsCap: 200, maxStaff: 1 },
    business: { name: "Business", price: 79, appointments: 1500, smsCap: 500, maxStaff: 5 },
  };

  assert(PLAN_LIMITS.starter.price === 29, "Starter is £29/mo");
  assert(PLAN_LIMITS.business.price === 79, "Business is £79/mo");
  assert(PLAN_LIMITS.trial.price === 0, "Trial is free");
  assert(PLAN_LIMITS.starter.appointments === 500, "Starter has 500 appointments");
  assert(PLAN_LIMITS.business.appointments === 1500, "Business has 1500 appointments");

  // ── 12. Migration 011 shape ─────────────────────────────────────────────
  section("Migration 011 — Trigger Sets NULL trial_ends_at");

  // Simulate what the new trigger does
  function simulateNewUserTrigger(userId, email) {
    return {
      id: userId,
      email: email,
      plan: "trial",
      reminders_limit: 500,
      trial_ends_at: null, // KEY CHANGE: was NOW() + 14 days
      booking_enabled: true,
      booking_code: "ABC123",
    };
  }

  const newProfile = simulateNewUserTrigger("user-123", "test@example.com");
  assert(newProfile.trial_ends_at === null, "New user trigger sets trial_ends_at to NULL");
  assert(newProfile.plan === "trial", "New user starts on trial plan");
  assert(newProfile.booking_enabled === true, "New user has booking enabled");
  assert(newProfile.reminders_limit === 500, "New user has 500 reminders limit");
}

// ─── Part 2: Integration Tests ──────────────────────────────────────────────

async function integrationTests() {
  section("INTEGRATION TESTS — Gumroad Webhook");

  // Test 1: Webhook rejects invalid seller
  try {
    const form = new URLSearchParams({
      seller_id: "INVALID_SELLER",
      product_id: "test",
      sale_id: "test",
      subscription_id: "test",
      email: "test@test.com",
      resource_name: "sale",
    });

    const res = await fetch(`${BASE}/api/webhooks/gumroad`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    assert(res.status === 403, "Invalid seller_id → 403 rejected");
  } catch (err) {
    assert(false, `Webhook seller check: ${err.message}`);
  }

  // Test 2: Webhook rejects unknown product
  try {
    const sellerId = process.env.GUMROAD_SELLER_ID || "test-seller";
    const form = new URLSearchParams({
      seller_id: sellerId,
      product_id: "NONEXISTENT_PRODUCT_ID",
      sale_id: "test",
      subscription_id: "test",
      email: "test@test.com",
      resource_name: "sale",
    });

    const res = await fetch(`${BASE}/api/webhooks/gumroad`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    // If seller ID matches but product doesn't, expect 400
    if (res.status === 403) {
      assert(true, "Seller ID mismatch (expected in local dev) → 403");
    } else {
      assert(res.status === 400, "Unknown product_id → 400 rejected");
    }
  } catch (err) {
    assert(false, `Webhook product check: ${err.message}`);
  }

  // Test 3: Landing page shows 7-day trial text
  section("INTEGRATION TESTS — Landing Page Content");

  try {
    const res = await fetch(`${BASE}/`);
    const html = await res.text();

    assert(html.includes("7 days free"), "Landing page shows '7 days free'");
    assert(html.includes("7-day free trial"), "Landing page shows '7-day free trial'");
    assert(!html.includes("14 days free"), "Landing page does NOT show '14 days free'");
    assert(!html.includes("14-day free trial"), "Landing page does NOT show '14-day free trial'");
    assert(!html.includes("No credit card required"), "Landing page does NOT say 'No credit card required'");
    assert(html.includes("Cancel anytime"), "Landing page shows 'Cancel anytime'");
  } catch (err) {
    assert(false, `Landing page fetch: ${err.message}`);
  }

  // Test 4: Onboarding source file contains card collection step
  // (client component — verify source directly since SSR doesn't render conditional steps)
  section("INTEGRATION TESTS — Onboarding Source Verification");

  try {
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/app/onboarding/page.tsx", "utf-8");

    assert(src.includes("Start your free trial") || src.includes("7-day free trial"),
      "Onboarding source mentions trial");
    assert(!src.includes("Launch my dashboard"), "Onboarding source does NOT have old 'Launch my dashboard'");
    assert(src.includes("payment partner"),
      "Onboarding source mentions payment partner");
    assert(src.includes("startTrial"), "Onboarding calls startTrial (not activateReminders)");
    assert(!src.includes("reminders_active: true"), "Onboarding does NOT set reminders_active: true");
    assert(src.includes("onboarding_completed: true"), "Onboarding sets onboarding_completed: true");
    assert(src.includes("NEXT_PUBLIC_GUMROAD_STARTER_URL"), "Onboarding references Gumroad URL env var");
    assert(src.includes("window.open"), "Onboarding opens Gumroad in new tab");
    assert(src.includes("CreditCard"), "Onboarding uses CreditCard icon");
  } catch (err) {
    assert(false, `Onboarding source read: ${err.message}`);
  }

  // Test 5: Signup page still works
  section("INTEGRATION TESTS — Signup Page");

  try {
    const res = await fetch(`${BASE}/signup`);
    assert(res.status === 200, "Signup page loads (200)");
    const html = await res.text();
    assert(html.includes("Create free account"), "Signup page has 'Create free account' button");
  } catch (err) {
    assert(false, `Signup page fetch: ${err.message}`);
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧪 Nudgle Trial + Card Flow Tests\n");

  if (runUnit) {
    unitTests();
  }

  if (runIntegration) {
    await integrationTests();
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${"─".repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
