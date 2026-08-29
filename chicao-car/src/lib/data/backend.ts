import type { WorkshopSettings } from "@/types";
import type { RowOf, Snapshot, TableName } from "./snapshot";

/**
 * Contrato de acesso a dados. Existem duas implementações:
 * `supabase-backend` (produção) e `local-backend` (demonstração no navegador).
 * Nenhuma tela conhece a implementação — todas usam o `DataProvider`.
 */
export interface Backend {
  readonly kind: "supabase" | "local";
  load(): Promise<Snapshot>;
  insert<T extends TableName>(table: T, row: RowOf<T>): Promise<RowOf<T>>;
  insertMany<T extends TableName>(table: T, rows: RowOf<T>[]): Promise<RowOf<T>[]>;
  update<T extends TableName>(table: T, id: string, patch: Partial<RowOf<T>>): Promise<void>;
  remove<T extends TableName>(table: T, id: string): Promise<void>;
  saveSettings(settings: WorkshopSettings): Promise<void>;
}
