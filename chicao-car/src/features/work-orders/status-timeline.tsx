"use client";

import { Check, X } from "lucide-react";
import { WORK_ORDER_FLOW, WORK_ORDER_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { WorkOrder } from "@/types";

/** Linha do tempo da OS — mostra em que ponto do fluxo o atendimento está. */
export function StatusTimeline({ order }: { order: WorkOrder }) {
  if (order.status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
          <X className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-danger">Ordem de serviço cancelada</p>
          <p className="text-xs text-fog-400">
            O histórico foi preservado, mas a OS não entra em faturamento.
          </p>
        </div>
      </div>
    );
  }

  // "aguardando peças" é um desvio do fluxo: só aparece quando é o status atual
  const steps = WORK_ORDER_FLOW.filter(
    (status) => status !== "waiting_parts" || order.status === "waiting_parts",
  );
  const currentIndex = steps.indexOf(order.status);

  const dates: Partial<Record<string, string | null>> = {
    draft: order.created_at,
    approved: order.approved_at,
    completed: order.completed_at,
    delivered: order.delivered_at,
  };

  return (
    <ol className="scroll-x flex gap-1 pb-1">
      {steps.map((status, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        const meta = WORK_ORDER_STATUS[status];
        return (
          <li key={status} className="flex min-w-0 flex-1 shrink-0 flex-col gap-1.5">
            <span
              className={cn(
                "h-1 rounded-full",
                done ? "bg-ok/60" : current ? "bg-amber-brand" : "bg-ink-700",
              )}
            />
            <span className="flex items-center gap-1.5">
              {done ? <Check className="size-3 shrink-0 text-ok" /> : null}
              <span
                className={cn(
                  "truncate text-[11px] font-semibold whitespace-nowrap",
                  current ? "text-amber-brand" : done ? "text-fog-300" : "text-fog-400",
                )}
              >
                {meta.short}
              </span>
            </span>
            {dates[status] ? (
              <span className="tabular text-[10px] text-fog-400">{formatDate(dates[status])}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
