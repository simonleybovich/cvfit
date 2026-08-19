"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";

import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { Button } from "@/components/ui/button";

export function SignInMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <LogIn data-icon="inline-start" />
        Iniciar sesión
      </Button>
      <SignInDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
