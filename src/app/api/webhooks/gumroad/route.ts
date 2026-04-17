import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const formData = await request.formData();

  // Gumroad sends pings as form-encoded data
  const sellerId = formData.get("seller_id") as string;
  const productId = formData.get("product_id") as string;
  const saleId = formData.get("sale_id") as string;
  const subscriptionId = formData.get("subscription_id") as string;
  const email = formData.get("email") as string;
  const userId = formData.get("custom_fields[user_id]") as string;
  const resourceName = formData.get("resource_name") as string; // "sale", "cancellation", etc.

  // Verify this ping is from our Gumroad account
  if (sellerId !== process.env.GUMROAD_SELLER_ID) {
    return NextResponse.json({ error: "Invalid seller" }, { status: 403 });
  }

  // Verify product matches
  if (productId !== process.env.GUMROAD_PRODUCT_ID) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  if (resourceName === "sale" || resourceName === "subscription_updated") {
    // New purchase or resubscription
    const matchColumn = userId ? "id" : "email";
    const matchValue = userId || email;

    await supabase
      .from("profiles")
      .update({
        gumroad_sale_id: saleId,
        gumroad_subscription_id: subscriptionId,
        plan: "paid",
        reminders_limit: 1000,
      })
      .eq(matchColumn, matchValue);
  }

  if (resourceName === "cancellation" || resourceName === "subscription_ended") {
    // Subscription cancelled
    if (subscriptionId) {
      await supabase
        .from("profiles")
        .update({
          plan: "free",
          reminders_limit: 50,
          gumroad_subscription_id: null,
        })
        .eq("gumroad_subscription_id", subscriptionId);
    }
  }

  // Reset usage on new billing cycle (Gumroad sends a new "sale" ping each cycle)
  if (resourceName === "sale" && subscriptionId) {
    const matchColumn = userId ? "id" : "email";
    const matchValue = userId || email;

    await supabase
      .from("profiles")
      .update({ reminders_used_this_month: 0 })
      .eq(matchColumn, matchValue);
  }

  return NextResponse.json({ received: true });
}
