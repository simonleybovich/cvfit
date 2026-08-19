"use client";

import { Loader2, Mail, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { OAuthSignInButton } from "@/components/auth/oauth-sign-in-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/infrastructure/auth/supabase-browser-client";

// Supabase Auth's default minimum password length (dashboard setting, not
// configurable from this codebase — see spec.md section 6 note on Supabase).
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Mode = "sign-in" | "sign-up";
type Status = "idle" | "loading" | "check-email" | "error";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Single unified sign-in surface: OAuth providers and email/password together, not split across a popover + a separate dialog. */
export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEmail("");
    setPassword("");
    setStatus("idle");
    setError(null);
    setMode("sign-in");
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!EMAIL_PATTERN.test(email)) {
      setError("Ingresá un email válido.");
      setStatus("error");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    const supabase = createSupabaseBrowserClient();

    if (mode === "sign-up") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (signUpError) {
        setError(signUpError.message);
        setStatus("error");
        return;
      }

      if (data.session) {
        // Email confirmation is off for this project: signUp already returns a
        // session, so the user is logged in immediately.
        onOpenChange(false);
        router.refresh();
        return;
      }

      // Confirmation required: no session yet, just a pending user.
      setStatus("check-email");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setStatus("error");
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar sesión</DialogTitle>
          <DialogDescription>Elegí cómo querés acceder a cvfit.</DialogDescription>
        </DialogHeader>

        {status === "check-email" ? (
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <Mail className="mt-0.5 size-4 shrink-0" />
              Te enviamos un email de confirmación a <strong className="font-medium">{email}</strong>.
              Revisá tu email para confirmar tu cuenta antes de iniciar sesión.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Entendido
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <OAuthSignInButton provider="github" label="Continuar con GitHub" />
              <OAuthSignInButton provider="google" label="Continuar con Google" />
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={emailId}>Email</Label>
                <Input
                  id={emailId}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={passwordId}>Contraseña</Label>
                <Input
                  id={passwordId}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <TriangleAlert className="size-4 shrink-0" />
                  {error}
                </p>
              )}

              <DialogFooter className="items-center sm:justify-between">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="self-start px-0 sm:self-auto"
                  onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
                >
                  {mode === "sign-in" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Iniciá sesión"}
                </Button>
                <Button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? (
                    <>
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                      {mode === "sign-in" ? "Ingresando..." : "Creando cuenta..."}
                    </>
                  ) : mode === "sign-in" ? (
                    "Iniciar sesión"
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
