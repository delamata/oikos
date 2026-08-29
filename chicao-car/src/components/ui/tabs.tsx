"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

export const Tabs = Primitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof Primitive.List>) {
  return (
    <Primitive.List
      className={cn(
        "scroll-x flex w-full gap-1 rounded-xl border border-ink-700 bg-ink-900 p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      className={cn(
        "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-fog-300 transition-colors hover:text-fog-100 data-[state=active]:bg-ink-700 data-[state=active]:text-fog-100",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content className={cn("mt-4 outline-none", className)} {...props} />;
}
