import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Logo({
  name = "Chicão Car",
  compact,
  className,
}: {
  name?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-brand to-amber-deep text-ink-950 shadow-lg shadow-amber-brand/10">
        <Wrench className="size-[18px]" strokeWidth={2.4} />
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block truncate font-display text-[17px] leading-none font-extrabold tracking-tight text-fog-100">
            {name}
          </span>
          <span className="mt-1 block text-[10px] font-semibold tracking-[0.16em] text-fog-400 uppercase">
            Oficina Mecânica
          </span>
        </span>
      ) : null}
    </div>
  );
}
