"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * No celular o modal sobe do rodapé (mais fácil de alcançar com uma mão);
 * a partir de `sm` ele vira um diálogo centralizado.
 */
export function DialogContent({
  className,
  children,
  title,
  description,
  size = "md",
}: {
  className?: string;
  children: React.ReactNode;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const width = {
    sm: "sm:max-w-md",
    md: "sm:max-w-xl",
    lg: "sm:max-w-3xl",
    xl: "sm:max-w-5xl",
  }[size];

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border border-ink-700 bg-ink-900 shadow-2xl outline-none animate-rise",
          "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88vh] sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          width,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <div className="min-w-0">
            <DialogPrimitive.Title className="font-display text-lg font-bold tracking-tight text-fog-100">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-sm text-fog-300">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="-mr-1 -mt-1 rounded-lg p-2 text-fog-400 transition-colors hover:bg-ink-800 hover:text-fog-100">
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-5 -mb-4 mt-5 flex flex-col-reverse gap-2 border-t border-ink-700 bg-ink-900 px-5 py-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
