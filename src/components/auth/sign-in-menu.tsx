"use client";

import { LogIn, Mail } from "lucide-react";
import { useState } from "react";

import { EmailPasswordDialog } from "@/components/auth/email-password-dialog";
import { OAuthSignInButton } from "@/components/auth/oauth-sign-in-button";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function SignInMenu() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPopoverOpen(false);
              setEmailDialogOpen(true);
            }}
          >
            <Mail data-icon="inline-start" />
            Continuar con email
          </Button>
        </PopoverContent>
      </Popover>
      <EmailPasswordDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
    </>
  );
}
