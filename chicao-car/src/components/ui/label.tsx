"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-[13px] font-medium text-fog-200", className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-amber-brand">*</span> : null}
    </label>
  );
}

/** Campo = rótulo + controle + mensagem de erro. */
export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-fog-400">{hint}</p>
      ) : null}
    </div>
  );
}
