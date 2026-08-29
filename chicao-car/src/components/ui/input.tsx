"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const inputClass =
  "flex h-11 w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-[15px] text-fog-100 placeholder:text-fog-400 transition-colors focus:border-amber-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:text-sm";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(inputClass, "h-auto min-h-[84px] py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
});

/** Select nativo — no celular abre o seletor do sistema, que é mais rápido. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        inputClass,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238b939e%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_10px_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
