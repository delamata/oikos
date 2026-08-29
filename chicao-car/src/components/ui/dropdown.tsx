"use client";

import * as React from "react";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils/cn";

export const Dropdown = Primitive.Root;
export const DropdownTrigger = Primitive.Trigger;

export function DropdownContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
}) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-[190px] overflow-hidden rounded-xl border border-ink-700 bg-ink-850 p-1.5 shadow-xl animate-fade-in",
          className,
        )}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export function DropdownItem({
  className,
  danger,
  ...props
}: React.ComponentProps<typeof Primitive.Item> & { danger?: boolean }) {
  return (
    <Primitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fog-200 outline-none transition-colors data-[highlighted]:bg-ink-800 data-[highlighted]:text-fog-100 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fog-400",
        danger && "text-danger data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <Primitive.Separator className="my-1.5 h-px bg-ink-700" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <Primitive.Label className="px-2.5 py-1.5 label-caps">{children}</Primitive.Label>;
}
