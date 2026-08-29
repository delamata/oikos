import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/constants";

const ICON_TONE: Record<Tone, string> = {
  neutral: "text-fog-400",
  info: "text-info",
  warn: "text-warn",
  ok: "text-ok",
  danger: "text-danger",
  accent: "text-amber-brand",
  violet: "text-violet-soft",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="label-caps leading-tight">{label}</span>
        {Icon ? <Icon className={cn("size-4 shrink-0", ICON_TONE[tone])} /> : null}
      </div>
      <p className="tabular mt-2.5 text-[26px] leading-none font-bold text-fog-100 sm:text-[28px]">
        {value}
      </p>
      {hint ? <p className="mt-2 truncate text-xs text-fog-400">{hint}</p> : null}
    </>
  );

  const base = cn(
    "block rounded-[14px] border border-ink-700 bg-ink-900 p-4 transition-colors sm:p-5",
    href && "hover:border-ink-600 hover:bg-ink-850",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={base}>
        {content}
      </Link>
    );
  }
  return <div className={base}>{content}</div>;
}
