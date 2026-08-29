"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/provider";
import { useData } from "@/lib/data/provider";
import { USER_ROLE } from "@/lib/constants";
import { initials } from "@/lib/utils/format";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInAsDemo, profile, loading, mode } = useAuth();
  const { profiles } = useData();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!loading && profile) router.replace("/painel");
  }, [loading, profile, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/painel");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca — some no celular para dar espaço ao formulário */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-ink-700 bg-ink-900 p-10 lg:flex">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-amber-brand/10 blur-3xl" />
        <Logo />
        <div className="relative">
          <h2 className="font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-fog-100">
            A oficina inteira
            <br />
            em uma tela só.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fog-300">
            Ordem de serviço, orçamento aprovado pelo WhatsApp, peças baixadas do estoque,
            pagamento no caixa e histórico do veículo — sem planilha paralela.
          </p>
          <ul className="mt-8 grid gap-2.5 text-sm text-fog-300">
            {[
              "Orçamento pronto para enviar em 1 clique",
              "Prontuário completo por placa",
              "Contas a pagar e a receber com alertas",
              "Relatórios gerenciais em PDF",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="grid size-5 place-items-center rounded-md bg-amber-brand/15 text-amber-brand">
                  <ShieldCheck className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-fog-400">
          © {new Date().getFullYear()} Chicão Car · Oficina Mecânica
        </p>
      </div>

      {/* Formulário */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="font-display text-2xl font-extrabold tracking-tight text-fog-100">
            Entrar no sistema
          </h1>
          <p className="mt-1.5 text-sm text-fog-400">
            Use o e-mail cadastrado pela administração da oficina.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label="E-mail" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@chicaocar.com.br"
              />
            </Field>
            <Field label="Senha" htmlFor="password" required={mode === "supabase"}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required={mode === "supabase"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button type="submit" size="lg" block loading={busy}>
              Entrar <ArrowRight />
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/recuperar-senha" className="text-sm text-fog-400 hover:text-amber-brand">
              Esqueci minha senha
            </Link>
          </div>

          {mode === "local" ? (
            <div className="mt-9 rounded-2xl border border-ink-700 bg-ink-900 p-4">
              <p className="label-caps">Modo demonstração</p>
              <p className="mt-1.5 text-xs leading-relaxed text-fog-400">
                O Supabase ainda não foi configurado. Os dados ficam apenas neste navegador.
                Escolha um perfil para explorar o sistema com as permissões correspondentes.
              </p>
              <ul className="mt-3 space-y-1.5">
                {profiles.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        signInAsDemo(item.id);
                        router.replace("/painel");
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5 text-left transition-colors hover:border-amber-brand/40"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-brand/15 text-xs font-bold text-amber-brand">
                        {initials(item.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fog-100">
                          {item.name}
                        </span>
                        <span className="block text-xs text-fog-400">
                          {USER_ROLE[item.role].label}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-fog-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
