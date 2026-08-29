"use client";

import * as React from "react";
import type { Profile } from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useData } from "@/lib/data/provider";

const DEMO_SESSION_KEY = "chicaocar.session.v1";

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  mode: "supabase" | "local";
  signIn: (email: string, password: string) => Promise<void>;
  signInAsDemo: (profileId: string) => void;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const data = useData();
  const { profiles, setActor, reload, loading: dataLoading } = data;

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [authUserEmail, setAuthUserEmail] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // --- Supabase Auth ------------------------------------------------------
  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabase();
    if (!client) return;

    let active = true;
    void client.auth.getSession().then(({ data: session }) => {
      if (!active) return;
      setAuthUserEmail(session.session?.user.email ?? null);
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setAuthUserEmail(session?.user.email ?? null);
      void reload();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [reload]);

  // --- sessão de demonstração --------------------------------------------
  React.useEffect(() => {
    if (isSupabaseConfigured) return;
    if (dataLoading) return;
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(DEMO_SESSION_KEY) : null;
    const found = stored ? profiles.find((p) => p.id === stored) : null;
    setProfile(found ?? null);
    setLoading(false);
  }, [dataLoading, profiles]);

  // resolve o perfil a partir do e-mail autenticado
  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!authUserEmail) {
      setProfile(null);
      return;
    }
    const found = profiles.find(
      (p) => p.email.toLowerCase() === authUserEmail.toLowerCase() && p.active,
    );
    setProfile(found ?? null);
  }, [authUserEmail, profiles]);

  React.useEffect(() => {
    setActor(profile);
  }, [profile, setActor]);

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured) {
        const found = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
        if (!found) throw new Error("Usuário não encontrado nesta base de demonstração.");
        window.localStorage.setItem(DEMO_SESSION_KEY, found.id);
        setProfile(found);
        return;
      }
      const client = getSupabase();
      if (!client) throw new Error("Supabase não configurado.");
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(
          error.message === "Invalid login credentials"
            ? "E-mail ou senha inválidos."
            : error.message,
        );
      }
    },
    [profiles],
  );

  const signInAsDemo = React.useCallback(
    (profileId: string) => {
      const found = profiles.find((p) => p.id === profileId);
      if (!found) return;
      window.localStorage.setItem(DEMO_SESSION_KEY, found.id);
      setProfile(found);
    },
    [profiles],
  );

  const signOut = React.useCallback(async () => {
    if (isSupabaseConfigured) {
      await getSupabase()?.auth.signOut();
    }
    window.localStorage.removeItem(DEMO_SESSION_KEY);
    setProfile(null);
  }, []);

  const requestPasswordReset = React.useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      throw new Error(
        "A recuperação de senha exige o Supabase configurado. Nesta demonstração, escolha um usuário na tela de login.",
      );
    }
    const client = getSupabase();
    if (!client) throw new Error("Supabase não configurado.");
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      profile,
      loading: loading || dataLoading,
      mode: isSupabaseConfigured ? "supabase" : "local",
      signIn,
      signInAsDemo,
      signOut,
      requestPasswordReset,
    }),
    [profile, loading, dataLoading, signIn, signInAsDemo, signOut, requestPasswordReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}
