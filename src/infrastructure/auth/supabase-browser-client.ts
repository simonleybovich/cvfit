import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client — identity only (GitHub OAuth), see spec.md section 6. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
