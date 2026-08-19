import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Server-side Supabase client (Server Components, Route Handlers). Reads/
 * writes the session cookie via Next.js `cookies()`. Writing can fail when
 * called from a Server Component render (cookies are read-only there) — that's
 * fine, `middleware.ts` is what actually refreshes the session cookie; this
 * try/catch just avoids an unhandled render error.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — no-op, middleware handles refresh.
          }
        },
      },
    },
  );
}

/**
 * Verified caller identity for this request. Uses `getUser()` (not
 * `getSession()`): it revalidates the JWT against Supabase Auth instead of
 * trusting the cookie's decoded payload, which matters here because the
 * result gates writes to the historial table. `cache()` dedupes repeated
 * calls within the same request (e.g. layout header + page both need it).
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
