import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/constants";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-ink-700/70 text-fog-200 border-ink-600",
  info: "bg-info/12 text-info border-info/30",
  warn: "bg-warn/12 text-warn border-warn/30",
  ok: "bg-ok/12 text-ok border-ok/30",
  danger: "bg-danger/12 text-danger border-danger/30",
  accent: "bg-amber-brand/12 text-amber-brand border-amber-brand/30",
  violet: "bg-violet-soft/12 text-violet-soft border-violet-soft/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export { TONE_CLASS };
