import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "onboarding";
  const redirectPath = state === "settings" ? "/settings" : "/onboarding";

  if (!code) {
    return NextResponse.redirect(new URL(`${redirectPath}?error=no_code`, request.url));
  }

  // Use the request origin as redirect URI (matches what the browser sent)
  const origin = new URL(request.url).origin;

  // Exchange code for tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${origin}/api/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();

  if (!tokens.refresh_token) {
    console.error("Google OAuth: no refresh token", tokens);
    return NextResponse.redirect(new URL(`${redirectPath}?error=no_refresh_token`, request.url));
  }

  // Get user from auth session
  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    console.error("Google OAuth: no authenticated user found");
    return NextResponse.redirect(new URL(`${redirectPath}?error=no_user`, request.url));
  }

  // Use service role to update profile (bypasses RLS)
  const supabase = getSupabase();
  await supabase.from("profiles").update({
    google_calendar_connected: true,
    google_refresh_token: tokens.refresh_token,
  }).eq("id", user.id);

  const queryParam = state === "settings" ? "?google=connected" : "?calendar=connected";
  return NextResponse.redirect(new URL(`${redirectPath}${queryParam}`, request.url));
}
