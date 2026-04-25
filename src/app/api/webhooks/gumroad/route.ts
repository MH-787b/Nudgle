import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS } from "@/lib/types";
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
    // New purchase or resubscription — activate plan
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

  if (resourceName === "cancellation" || resourceName === "subscription_ended") {
    // Cancelled — downgrade to starter (lowest paid) with no active subscription
    // They keep access until current period ends (Gumroad handles this)
    if (subscriptionId) {
      await supabase
        .from("profiles")
        .update({
          plan: "starter",
          reminders_limit: PLAN_LIMITS.starter.appointments,
          gumroad_subscription_id: null,
        })
        .eq("gumroad_subscription_id", subscriptionId);
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
