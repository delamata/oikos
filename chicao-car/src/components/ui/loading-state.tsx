import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function LoadingState({ label = "Carregando…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2.5 py-14 text-sm text-fog-400", className)}>
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}
