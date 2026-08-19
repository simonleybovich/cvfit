import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/infrastructure/auth/supabase-server-client";

// Standard Supabase Auth flow: GitHub redirects here with a `code`, which we
// exchange for a session (sets the auth cookies via the server client), then
// send the user back into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${resolveRedirectOrigin(request, origin)}${next}`);
    }
  }

  return NextResponse.redirect(`${resolveRedirectOrigin(request, origin)}/?authError=1`);
}

/**
 * Behind Dokploy's reverse proxy, `request.url`'s host reflects the
 * container's own bind address (0.0.0.0:3000, set in the Dockerfile),
 * not the public domain — a redirect built from it briefly sends the
 * browser to an unreachable address. `x-forwarded-host`, which Traefik
 * does set correctly, is Supabase's own documented fix for this exact
 * case (https://supabase.com/docs/guides/auth/server-side/nextjs).
 */
function resolveRedirectOrigin(request: Request, fallbackOrigin: string): string {
  if (process.env.NODE_ENV === "development") return fallbackOrigin;

  const forwardedHost = request.headers.get("x-forwarded-host");
  return forwardedHost ? `https://${forwardedHost}` : fallbackOrigin;
}
