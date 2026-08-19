"use client";

import { LogIn } from "lucide-react";

import { OAuthSignInButton } from "@/components/auth/oauth-sign-in-button";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function SignInMenu() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <LogIn data-icon="inline-start" />
            Iniciar sesión
          </Button>
        }
      />
      <PopoverContent className="w-auto">
        <OAuthSignInButton provider="github" label="Continuar con GitHub" />
        <OAuthSignInButton provider="google" label="Continuar con Google" />
      </PopoverContent>
    </Popover>
  );
}
