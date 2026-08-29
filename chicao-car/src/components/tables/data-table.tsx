"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { SkeletonRows } from "@/components/ui/skeleton";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  /** Esconde a coluna abaixo do breakpoint informado (a tabela só aparece em md+). */
  hideBelow?: "lg" | "xl";
  width?: string;
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * Tabela em telas grandes, lista de cards no celular.
 * `mobileCard` é obrigatório justamente para evitar tabelas gigantes no mobile.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  mobileCard,
  loading,
  empty,
  footer,
  className,
}: {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  mobileCard: (row: T) => React.ReactNode;
  loading?: boolean;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  if (loading) {
    return <SkeletonRows rows={6} className="p-4" />;
  }

  if (data.length === 0) {
    return <>{empty ?? null}</>;
  }

  return (
    <div className={className}>
      {/* Mobile: cards */}
      <ul className="divide-y divide-ink-700 md:hidden">
        {data.map((row) => (
          <li key={getRowId(row)}>
            {onRowClick ? (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                className="flex w-full items-center gap-2 px-4 py-3.5 text-left transition-colors active:bg-ink-850"
              >
                <div className="min-w-0 flex-1">{mobileCard(row)}</div>
                <ChevronRight className="size-4 shrink-0 text-fog-400" />
              </button>
            ) : (
              <div className="px-4 py-3.5">{mobileCard(row)}</div>
            )}
          </li>
        ))}
      </ul>

      {/* Desktop: tabela */}
      <div className="scroll-x hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "label-caps px-4 py-2.5 font-semibold whitespace-nowrap",
                    ALIGN[col.align ?? "left"],
                    col.hideBelow === "lg" && "hidden lg:table-cell",
                    col.hideBelow === "xl" && "hidden xl:table-cell",
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {data.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-ink-850",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 align-middle text-fog-200",
                      ALIGN[col.align ?? "left"],
                      col.hideBelow === "lg" && "hidden lg:table-cell",
                      col.hideBelow === "xl" && "hidden xl:table-cell",
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer ? <tfoot className="border-t border-ink-700">{footer}</tfoot> : null}
        </table>
      </div>
    </div>
  );
}

/** Bloco de rótulo + valor usado dentro dos cards mobile. */
export function CardField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold tracking-[0.08em] text-fog-400 uppercase">{label}</p>
      <div className="truncate text-sm text-fog-200">{value}</div>
    </div>
  );
}
