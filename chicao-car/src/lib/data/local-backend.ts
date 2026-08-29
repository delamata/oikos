"use client";

import type { WorkshopSettings } from "@/types";
import type { Backend } from "./backend";
import { buildSeed } from "./seed";
import { type RowOf, type Snapshot, type TableName, emptySnapshot } from "./snapshot";

const STORAGE_KEY = "chicaocar.db.v1";

/**
 * Backend de demonstração: guarda tudo no `localStorage` do navegador.
 * É o que roda quando o Supabase não está configurado, para que o sistema possa
 * ser avaliado por completo sem nenhuma credencial. Os dados nunca saem do
 * dispositivo e nunca se misturam com a base de produção.
 */
export class LocalBackend implements Backend {
  readonly kind = "local" as const;
  private snapshot: Snapshot = emptySnapshot();

  async load(): Promise<Snapshot> {
    if (typeof window === "undefined") return emptySnapshot();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.snapshot = { ...emptySnapshot(), ...(JSON.parse(stored) as Snapshot) };
        return structuredClone(this.snapshot);
      } catch {
        // conteúdo corrompido: recomeça a partir do seed
      }
    }
    this.snapshot = buildSeed();
    this.persist();
    return structuredClone(this.snapshot);
  }

  async insert<T extends TableName>(table: T, row: RowOf<T>): Promise<RowOf<T>> {
    (this.snapshot[table] as RowOf<T>[]).push(row);
    this.persist();
    return row;
  }

  async insertMany<T extends TableName>(table: T, rows: RowOf<T>[]): Promise<RowOf<T>[]> {
    (this.snapshot[table] as RowOf<T>[]).push(...rows);
    this.persist();
    return rows;
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<RowOf<T>>): Promise<void> {
    const list = this.snapshot[table] as RowOf<T>[];
    const index = list.findIndex((r) => (r as { id: string }).id === id);
    if (index >= 0) {
      list[index] = { ...list[index], ...patch };
      this.persist();
    }
  }

  async remove<T extends TableName>(table: T, id: string): Promise<void> {
    const list = this.snapshot[table] as RowOf<T>[];
    const index = list.findIndex((r) => (r as { id: string }).id === id);
    if (index >= 0) {
      list.splice(index, 1);
      this.persist();
    }
  }

  async saveSettings(settings: WorkshopSettings): Promise<void> {
    this.snapshot.settings = settings;
    this.persist();
  }

  /** Recria os dados de demonstração do zero. */
  async resetDemo(): Promise<Snapshot> {
    this.snapshot = buildSeed();
    this.persist();
    return structuredClone(this.snapshot);
  }

  /** Esvazia a base local (começar do zero, sem dados de exemplo). */
  async clear(): Promise<Snapshot> {
    this.snapshot = emptySnapshot();
    this.persist();
    return structuredClone(this.snapshot);
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snapshot));
    } catch {
      // cota estourada: o app continua funcionando em memória nesta sessão
    }
  }
}
