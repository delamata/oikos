"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Car, ClipboardList, Search, User, X } from "lucide-react";
import { useData } from "@/lib/data/provider";
import { globalSearch, type SearchResult } from "@/lib/domain/search";
import { cn } from "@/lib/utils/cn";

const ICONS = {
  customer: User,
  vehicle: Car,
  work_order: ClipboardList,
} as const;

const TYPE_LABEL = {
  customer: "Cliente",
  vehicle: "Veículo",
  work_order: "Ordem de serviço",
} as const;

/**
 * Busca do balcão: nome, telefone, CPF/CNPJ, placa, modelo ou número da OS.
 * Atalho "/" no desktop; no celular abre em tela cheia.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const data = useData();
  const [term, setTerm] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results = React.useMemo<SearchResult[]>(
    () =>
      globalSearch(term, {
        customers: data.customers,
        vehicles: data.vehicles,
        work_orders: data.work_orders,
      }),
    [term, data.customers, data.vehicles, data.work_orders],
  );

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(result: SearchResult) {
    setOpen(false);
    setTerm("");
    router.push(result.href);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fog-400" />
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        value={term}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setTerm(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && results[highlight]) {
            go(results[highlight]);
          }
        }}
        placeholder="Buscar cliente, placa, telefone ou OS…"
        className="h-10 w-full rounded-xl border border-ink-700 bg-ink-850 pr-9 pl-9 text-sm text-fog-100 placeholder:text-fog-400 focus:border-amber-brand focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {term ? (
        <button
          type="button"
          onClick={() => setTerm("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-fog-400 hover:bg-ink-800 hover:text-fog-100"
        >
          <X className="size-3.5" />
          <span className="sr-only">Limpar busca</span>
        </button>
      ) : (
        <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-ink-600 px-1.5 py-0.5 text-[10px] text-fog-400 lg:block">
          /
        </kbd>
      )}

      {open && term.trim().length >= 2 ? (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 overflow-hidden rounded-xl border border-ink-700 bg-ink-850 shadow-2xl animate-fade-in">
          {results.length === 0 ? (
            <p className="px-4 py-5 text-sm text-fog-400">
              Nada encontrado para “{term}”.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto py-1.5">
              {results.map((result, index) => {
                const Icon = ICONS[result.type];
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => go(result)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
                        index === highlight ? "bg-ink-800" : "",
                      )}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-900">
                        <Icon className="size-4 text-fog-300" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fog-100">
                          {result.title}
                        </span>
                        <span className="block truncate text-xs text-fog-400">{result.subtitle}</span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold tracking-wider text-fog-400 uppercase">
                        {TYPE_LABEL[result.type]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
