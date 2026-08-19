"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/supabase-browser-client";

interface OAuthSignInButtonProps {
  provider: "github" | "google";
  label: string;
}

export function OAuthSignInButton({ provider, label }: OAuthSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // No setLoading(false) on success: the browser navigates away to the provider.
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleSignIn} disabled={loading}>
      <LogIn data-icon="inline-start" />
      {label}
    </Button>
  );
}
