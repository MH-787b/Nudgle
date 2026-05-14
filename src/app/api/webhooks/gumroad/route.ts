import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, TRIAL_DURATION_DAYS } from "@/lib/types";
import type { PlanType } from "@/lib/types";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Map Gumroad product IDs to plan tiers
function getPlanFromProduct(productId: string): PlanType | null {
  const map: Record<string, PlanType> = {};
  if (process.env.GUMROAD_STARTER_PRODUCT_ID) map[process.env.GUMROAD_STARTER_PRODUCT_ID] = 'starter';
  if (process.env.GUMROAD_BUSINESS_PRODUCT_ID) map[process.env.GUMROAD_BUSINESS_PRODUCT_ID] = 'business';
  // Fallback: legacy single product ID maps to starter
  if (process.env.GUMROAD_PRODUCT_ID) map[process.env.GUMROAD_PRODUCT_ID] = 'starter';
  return map[productId] || null;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const formData = await request.formData();

  const sellerId = formData.get("seller_id") as string;
  const productId = formData.get("product_id") as string;
  const saleId = formData.get("sale_id") as string;
  const subscriptionId = formData.get("subscription_id") as string;
  const email = formData.get("email") as string;
  const userId = formData.get("custom_fields[user_id]") as string;
  const resourceName = formData.get("resource_name") as string;

  // Verify seller
  if (sellerId !== process.env.GUMROAD_SELLER_ID) {
    return NextResponse.json({ error: "Invalid seller" }, { status: 403 });
  }

  // Resolve plan from product ID
  const plan = getPlanFromProduct(productId);
  if (!plan) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const config = PLAN_LIMITS[plan];
  const matchColumn = userId ? "id" : "email";
  const matchValue = userId || email;

  if (resourceName === "sale" || resourceName === "subscription_updated") {
    // Check if user is on trial with no trial_ends_at — this is a trial activation (card added)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("plan, trial_ends_at")
      .eq(matchColumn, matchValue)
      .single();

    const isTrialActivation = existingProfile?.plan === "trial" && !existingProfile?.trial_ends_at;

    if (isTrialActivation) {
      // Trial activation — start the trial clock, activate reminders
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

      await supabase
        .from("profiles")
        .update({
          gumroad_sale_id: saleId,
          gumroad_subscription_id: subscriptionId,
          trial_ends_at: trialEndsAt.toISOString(),
          reminders_active: true,
        })
        .eq(matchColumn, matchValue);
    } else {
      // Paid upgrade or resubscription — activate plan
      await supabase
        .from("profiles")
        .update({
          gumroad_sale_id: saleId,
          gumroad_subscription_id: subscriptionId,
          plan,
          reminders_limit: config.appointments,
          trial_ends_at: null,
        })
        .eq(matchColumn, matchValue);
    }
  }

  if (resourceName === "cancellation" || resourceName === "subscription_ended") {
    // Cancelled — downgrade to starter (lowest paid) with no active subscription
    // They keep access until current period ends (Gumroad handles this)
    const downgradeData = {
      plan: "starter" as const,
      reminders_limit: PLAN_LIMITS.starter.appointments,
      gumroad_subscription_id: null,
    };

    if (subscriptionId) {
      await supabase
        .from("profiles")
        .update(downgradeData)
        .eq("gumroad_subscription_id", subscriptionId);
    } else if (matchValue) {
      // Fallback: match by user ID or email if no subscription ID
      await supabase
        .from("profiles")
        .update(downgradeData)
        .eq(matchColumn, matchValue);
    }
  }

  // Reset usage counters on new billing cycle
  if (resourceName === "sale" && subscriptionId) {
    await supabase
      .from("profiles")
      .update({
        reminders_used_this_month: 0,
        sms_used_this_month: 0,
      })
      .eq(matchColumn, matchValue);
  }

  return NextResponse.json({ received: true });
}
