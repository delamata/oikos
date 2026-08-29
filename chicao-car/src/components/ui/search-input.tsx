"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { inputClass } from "./input";

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fog-400" />
      <input
        type="search"
        inputMode="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, "pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-fog-400 transition-colors hover:bg-ink-800 hover:text-fog-100"
        >
          <X className="size-3.5" />
          <span className="sr-only">Limpar</span>
        </button>
      ) : null}
    </div>
  );
}
