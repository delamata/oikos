"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkshopSettings } from "@/types";
import type { Backend } from "./backend";
import {
  DEFAULT_SETTINGS,
  SETTINGS_ID,
  TABLES,
  type RowOf,
  type Snapshot,
  type TableName,
  emptySnapshot,
} from "./snapshot";

/** Backend de produção. As permissões reais são aplicadas pelo RLS do Postgres. */
export class SupabaseBackend implements Backend {
  readonly kind = "supabase" as const;

  constructor(private readonly client: SupabaseClient) {}

  async load(): Promise<Snapshot> {
    const snapshot = emptySnapshot();

    const results = await Promise.all(
      TABLES.map((table) => this.client.from(table).select("*")),
    );

    results.forEach((result, index) => {
      const table = TABLES[index];
      if (result.error) {
        throw new Error(`Falha ao carregar "${table}": ${result.error.message}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (snapshot as any)[table] = result.data ?? [];
    });

    const settings = await this.client
      .from("workshop_settings")
      .select("*")
      .eq("id", SETTINGS_ID)
      .maybeSingle();
    if (settings.error) {
      throw new Error(`Falha ao carregar configurações: ${settings.error.message}`);
    }
    snapshot.settings = (settings.data as WorkshopSettings | null) ?? { ...DEFAULT_SETTINGS };

    snapshot.work_orders.sort((a, b) => b.order_number - a.order_number);
    return snapshot;
  }

  async insert<T extends TableName>(table: T, row: RowOf<T>): Promise<RowOf<T>> {
    const { data, error } = await this.client
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(row as any)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return (data ?? row) as RowOf<T>;
  }

  async insertMany<T extends TableName>(table: T, rows: RowOf<T>[]): Promise<RowOf<T>[]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.client
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(rows as any)
      .select();
    if (error) throw new Error(error.message);
    return (data ?? rows) as RowOf<T>[];
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<RowOf<T>>): Promise<void> {
    const { error } = await this.client
      .from(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async remove<T extends TableName>(table: T, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async saveSettings(settings: WorkshopSettings): Promise<void> {
    const { error } = await this.client
      .from("workshop_settings")
      .upsert({ ...settings, id: SETTINGS_ID });
    if (error) throw new Error(error.message);
  }
}
