"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth/provider";
import { LoadingState } from "@/components/ui/loading-state";

/** Todas as rotas internas passam por aqui — sem sessão, volta para o login. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !profile) router.replace("/login");
  }, [loading, profile, router]);

  if (loading || !profile) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingState label="Carregando a oficina…" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
