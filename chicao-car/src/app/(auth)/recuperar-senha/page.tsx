"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/provider";

export default function RecoverPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o e-mail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Logo className="mb-8" />
      {sent ? (
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-6 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-ok/12 text-ok">
            <MailCheck className="size-6" />
          </span>
          <h1 className="font-display text-lg font-bold text-fog-100">Verifique seu e-mail</h1>
          <p className="mt-2 text-sm text-fog-400">
            Enviamos um link de redefinição para <strong className="text-fog-200">{email}</strong>.
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-fog-100">
            Recuperar senha
          </h1>
          <p className="mt-1.5 text-sm text-fog-400">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="E-mail" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@chicaocar.com.br"
              />
            </Field>
            <Button type="submit" size="lg" block loading={busy}>
              Enviar link
            </Button>
          </form>
        </>
      )}
      <Link
        href="/login"
        className="mt-6 inline-flex items-center justify-center gap-2 text-sm text-fog-400 hover:text-amber-brand"
      >
        <ArrowLeft className="size-4" /> Voltar para o login
      </Link>
    </div>
  );
}
