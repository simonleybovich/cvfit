import Link from "next/link";

import { SignInMenu } from "@/components/auth/sign-in-menu";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { UserAvatar } from "@/components/layout/user-avatar";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";

/**
 * Server Component so auth state is known before the first paint — no
 * signed-out flash while a client component figures out the session.
 */
export async function SiteHeader() {
  const user = await getCurrentUser();

  const displayName =
    (user?.user_metadata?.user_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    "Cuenta";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-base font-semibold tracking-tight">
          cv<span className="text-primary">fit</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/historial" className="text-sm text-muted-foreground hover:text-foreground">
              Mi historial
            </Link>
            <span className="flex items-center gap-1.5 text-sm">
              <UserAvatar avatarUrl={avatarUrl} displayName={displayName} />
              {displayName}
            </span>
            <SignOutButton />
          </div>
        ) : (
          <SignInMenu />
        )}
      </div>
    </header>
  );
}
