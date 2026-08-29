"use client";

import * as Primitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils/cn";

export function Switch({ className, ...props }: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-ink-600 transition-colors data-[state=checked]:border-amber-brand data-[state=checked]:bg-amber-brand data-[state=unchecked]:bg-ink-700",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb className="pointer-events-none block size-4.5 translate-x-0.5 rounded-full bg-fog-100 shadow transition-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-ink-950" />
    </Primitive.Root>
  );
}
