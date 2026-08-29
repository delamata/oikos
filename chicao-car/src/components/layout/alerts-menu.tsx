"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useData } from "@/lib/data/provider";
import { buildAlerts } from "@/lib/domain/alerts";
import { Dropdown, DropdownContent, DropdownTrigger } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils/cn";
import { TONE_CLASS } from "@/components/ui/badge";

export function AlertsMenu() {
  const data = useData();
  const alerts = React.useMemo(
    () =>
      buildAlerts({
        revenues: data.revenues,
        expenses: data.expenses,
        work_orders: data.work_orders,
        products: data.products,
      }),
    [data.revenues, data.expenses, data.work_orders, data.products],
  );

  const urgent = alerts.filter((a) => a.tone === "danger").length;

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type="button"
          className="relative grid size-10 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-fog-300 transition-colors hover:text-fog-100"
        >
          <Bell className="size-4" />
          {alerts.length > 0 ? (
            <span
              className={cn(
                "absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold",
                urgent > 0 ? "bg-danger text-white" : "bg-amber-brand text-ink-950",
              )}
            >
              {alerts.length > 99 ? "99+" : alerts.length}
            </span>
          ) : null}
          <span className="sr-only">Alertas</span>
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-[340px] p-0">
        <div className="border-b border-ink-700 px-4 py-3">
          <p className="label-caps">Alertas</p>
          <p className="mt-0.5 text-xs text-fog-400">
            {alerts.length === 0
              ? "Nenhuma pendência no momento."
              : `${alerts.length} item(ns) precisando de atenção`}
          </p>
        </div>
        <ul className="max-h-[70vh] overflow-y-auto">
          {alerts.slice(0, 25).map((alert) => (
            <li key={alert.id}>
              <Link
                href={alert.href}
                className="flex gap-3 border-b border-ink-800 px-4 py-3 transition-colors last:border-0 hover:bg-ink-800"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full border",
                    TONE_CLASS[alert.tone],
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fog-100">{alert.title}</span>
                  <span className="block text-xs text-fog-400">{alert.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </DropdownContent>
    </Dropdown>
  );
}
