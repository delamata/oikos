import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {Icon ? (
        <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-ink-700 bg-ink-850">
          <Icon className="size-6 text-fog-400" />
        </div>
      ) : null}
      <p className="font-display text-base font-semibold text-fog-100">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fog-400">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
