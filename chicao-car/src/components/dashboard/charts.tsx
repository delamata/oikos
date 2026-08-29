"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxisCurrency, formatCurrency, formatNumber } from "@/lib/utils/format";

/** Paleta categórica única do sistema — mesma ordem em todos os gráficos. */
export const CHART_COLORS = [
  "#f0a73c",
  "#3fbf87",
  "#5aa9f0",
  "#a98bf0",
  "#f0605d",
  "#e8b54a",
  "#8b939e",
];

const AXIS = { stroke: "#6f7782", fontSize: 11 };
const GRID = "#232830";

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  currency = true,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  currency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-850 px-3 py-2.5 shadow-xl">
      {label != null ? (
        <p className="mb-1.5 text-xs font-semibold text-fog-200">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry, index) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-fog-400">{entry.name}</span>
            <span className="tabular ml-auto font-semibold text-fog-100">
              {currency ? formatCurrency(Number(entry.value)) : formatNumber(Number(entry.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RevenueExpenseChart({
  data,
  height = 260,
}: {
  data: { label: string; revenue: number; expense: number; result: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          width={70}
          tickFormatter={(value: number) => formatAxisCurrency(value)}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "#8b939e", paddingTop: 8 }}
        />
        <Bar name="Receita" dataKey="revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar name="Despesa" dataKey="expense" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Line
          name="Resultado"
          type="monotone"
          dataKey="result"
          stroke={CHART_COLORS[1]}
          strokeWidth={2.2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function TrendAreaChart({
  data,
  dataKey,
  name,
  color = CHART_COLORS[0],
  height = 220,
  currency = true,
}: {
  data: readonly { label: string }[];
  dataKey: string;
  name: string;
  color?: string;
  height?: number;
  currency?: boolean;
}) {
  const gradientId = React.useId();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          width={70}
          tickFormatter={(value: number) =>
            currency ? formatAxisCurrency(value) : formatNumber(value)
          }
        />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Area
          name={name}
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBarChart({
  data,
  height = 260,
  currency = true,
  color = CHART_COLORS[0],
}: {
  data: { label: string; value: number }[];
  height?: number;
  currency?: boolean;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          tickFormatter={(value: number) =>
            currency ? formatAxisCurrency(value) : formatNumber(value)
          }
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ ...AXIS, fontSize: 11 }}
          width={150}
          tickFormatter={(value: string) => (value.length > 26 ? `${value.slice(0, 25)}…` : value)}
        />
        <Tooltip
          content={<ChartTooltip currency={currency} />}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar name="Total" dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
  currency = true,
}: {
  data: { label: string; value: number }[];
  height?: number;
  currency?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 sm:w-1/2">
        {data.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-fog-300">{item.label}</span>
            <span className="tabular shrink-0 font-semibold text-fog-100">
              {currency ? formatCurrency(item.value) : formatNumber(item.value)}
            </span>
            <span className="tabular w-12 shrink-0 text-right text-xs text-fog-400">
              {total > 0 ? `${Math.round((item.value / total) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
