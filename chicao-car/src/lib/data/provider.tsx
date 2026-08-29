"use client";

import * as React from "react";
import type { Profile, WorkshopSettings } from "@/types";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { newId } from "@/lib/utils/id";
import type { Backend } from "./backend";
import { LocalBackend } from "./local-backend";
import { SupabaseBackend } from "./supabase-backend";
import { type RowOf, type Snapshot, type TableName, emptySnapshot } from "./snapshot";

export interface AuditInput {
  action: string;
  entity: string;
  entity_id?: string | null;
  summary?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

interface DataContextValue extends Snapshot {
  mode: "supabase" | "local";
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  insert: <T extends TableName>(table: T, row: RowOf<T>) => Promise<RowOf<T>>;
  insertMany: <T extends TableName>(table: T, rows: RowOf<T>[]) => Promise<RowOf<T>[]>;
  update: <T extends TableName>(table: T, id: string, patch: Partial<RowOf<T>>) => Promise<void>;
  remove: <T extends TableName>(table: T, id: string) => Promise<void>;
  saveSettings: (settings: WorkshopSettings) => Promise<void>;
  audit: (input: AuditInput) => Promise<void>;
  setActor: (profile: Profile | null) => void;
  resetDemoData: () => Promise<void>;
  clearDemoData: () => Promise<void>;
}

const DataContext = React.createContext<DataContextValue | null>(null);

function createBackend(): Backend {
  if (isSupabaseConfigured) {
    const client = getSupabase();
    if (client) return new SupabaseBackend(client);
  }
  return new LocalBackend();
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const backendRef = React.useRef<Backend | null>(null);
  if (backendRef.current === null) backendRef.current = createBackend();
  const backend = backendRef.current;

  const actorRef = React.useRef<Profile | null>(null);
  const [snapshot, setSnapshot] = React.useState<Snapshot>(() => emptySnapshot());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await backend.load());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [backend]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const insert = React.useCallback(
    async <T extends TableName>(table: T, row: RowOf<T>) => {
      const saved = await backend.insert(table, row);
      setSnapshot((prev) => ({ ...prev, [table]: [...(prev[table] as RowOf<T>[]), saved] }));
      return saved;
    },
    [backend],
  );

  const insertMany = React.useCallback(
    async <T extends TableName>(table: T, rows: RowOf<T>[]) => {
      if (rows.length === 0) return [];
      const saved = await backend.insertMany(table, rows);
      setSnapshot((prev) => ({ ...prev, [table]: [...(prev[table] as RowOf<T>[]), ...saved] }));
      return saved;
    },
    [backend],
  );

  const update = React.useCallback(
    async <T extends TableName>(table: T, id: string, patch: Partial<RowOf<T>>) => {
      await backend.update(table, id, patch);
      setSnapshot((prev) => ({
        ...prev,
        [table]: (prev[table] as RowOf<T>[]).map((row) =>
          (row as { id: string }).id === id ? { ...row, ...patch } : row,
        ),
      }));
    },
    [backend],
  );

  const remove = React.useCallback(
    async <T extends TableName>(table: T, id: string) => {
      await backend.remove(table, id);
      setSnapshot((prev) => ({
        ...prev,
        [table]: (prev[table] as RowOf<T>[]).filter((row) => (row as { id: string }).id !== id),
      }));
    },
    [backend],
  );

  const saveSettings = React.useCallback(
    async (settings: WorkshopSettings) => {
      const next = { ...settings, updated_at: new Date().toISOString() };
      await backend.saveSettings(next);
      setSnapshot((prev) => ({ ...prev, settings: next }));
    },
    [backend],
  );

  const audit = React.useCallback(
    async (input: AuditInput) => {
      const actor = actorRef.current;
      const row = {
        id: newId(),
        user_id: actor?.id ?? null,
        user_name: actor?.name ?? null,
        action: input.action,
        entity: input.entity,
        entity_id: input.entity_id ?? null,
        summary: input.summary ?? null,
        before_values: input.before ?? null,
        after_values: input.after ?? null,
        created_at: new Date().toISOString(),
      };
      try {
        await insert("audit_logs", row);
      } catch {
        // auditoria nunca deve impedir a operação principal de concluir
      }
    },
    [insert],
  );

  const setActor = React.useCallback((profile: Profile | null) => {
    actorRef.current = profile;
  }, []);

  const resetDemoData = React.useCallback(async () => {
    if (backend instanceof LocalBackend) {
      setSnapshot(await backend.resetDemo());
    }
  }, [backend]);

  const clearDemoData = React.useCallback(async () => {
    if (backend instanceof LocalBackend) {
      setSnapshot(await backend.clear());
    }
  }, [backend]);

  const value = React.useMemo<DataContextValue>(
    () => ({
      ...snapshot,
      mode: backend.kind,
      loading,
      error,
      reload,
      insert,
      insertMany,
      update,
      remove,
      saveSettings,
      audit,
      setActor,
      resetDemoData,
      clearDemoData,
    }),
    [
      snapshot, backend.kind, loading, error, reload, insert, insertMany, update, remove,
      saveSettings, audit, setActor, resetDemoData, clearDemoData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData precisa estar dentro de <DataProvider>.");
  return ctx;
}
