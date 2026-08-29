"use client";

import * as React from "react";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { CalendarRange } from "lucide-react";
import { Select } from "./input";
import { cn } from "@/lib/utils/cn";

export interface DateRange {
  from: Date;
  to: Date;
}

export type RangePreset =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "last_month"
  | "90d"
  | "year"
  | "custom";

const PRESET_LABEL: Record<RangePreset, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  month: "Mês atual",
  last_month: "Mês passado",
  "90d": "Últimos 90 dias",
  year: "Ano atual",
  custom: "Período personalizado",
};

export function rangeFromPreset(preset: RangePreset, today = new Date()): DateRange {
  switch (preset) {
    case "today":
      return { from: startOfDay(today), to: endOfDay(today) };
    case "7d":
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    case "30d":
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    case "last_month": {
      const previous = subMonths(today, 1);
      return { from: startOfMonth(previous), to: endOfMonth(previous) };
    }
    case "90d":
      return { from: startOfDay(subDays(today, 89)), to: endOfDay(today) };
    case "year":
      return { from: startOfYear(today), to: endOfYear(today) };
    case "month":
    default:
      return { from: startOfMonth(today), to: endOfMonth(today) };
  }
}

/** Filtro de período usado no financeiro e nos relatórios. */
export function DateRangeFilter({
  preset,
  range,
  onChange,
  className,
}: {
  preset: RangePreset;
  range: DateRange;
  onChange: (preset: RangePreset, range: DateRange) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row", className)}>
      <div className="relative sm:w-56">
        <CalendarRange className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-fog-400" />
        <Select
          className="pl-9"
          value={preset}
          onChange={(e) => {
            const next = e.target.value as RangePreset;
            onChange(next, next === "custom" ? range : rangeFromPreset(next));
          }}
        >
          {(Object.keys(PRESET_LABEL) as RangePreset[]).map((key) => (
            <option key={key} value={key}>
              {PRESET_LABEL[key]}
            </option>
          ))}
        </Select>
      </div>

      {preset === "custom" ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            type="date"
            value={format(range.from, "yyyy-MM-dd")}
            onChange={(e) =>
              onChange("custom", { ...range, from: startOfDay(new Date(`${e.target.value}T12:00`)) })
            }
            className="tabular h-11 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 text-sm text-fog-100 focus:border-amber-brand focus:outline-none md:h-10"
          />
          <span className="shrink-0 text-sm text-fog-400">até</span>
          <input
            type="date"
            value={format(range.to, "yyyy-MM-dd")}
            onChange={(e) =>
              onChange("custom", { ...range, to: endOfDay(new Date(`${e.target.value}T12:00`)) })
            }
            className="tabular h-11 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 text-sm text-fog-100 focus:border-amber-brand focus:outline-none md:h-10"
          />
        </div>
      ) : null}
    </div>
  );
}
