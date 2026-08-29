import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {backHref ? (
            <Link
              href={backHref}
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-fog-300 transition-colors hover:text-fog-100"
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-[22px] leading-tight font-extrabold tracking-tight text-fog-100 sm:text-[26px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-fog-400">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
