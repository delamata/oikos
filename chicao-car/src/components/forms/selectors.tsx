"use client";

import * as React from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { useData } from "@/lib/data/provider";
import { formatPhone, formatPlate, normalize } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface Option {
  id: string;
  title: string;
  subtitle: string;
  haystack: string;
}

/** Seletor em diálogo: funciona bem no celular e permite cadastrar na hora. */
function EntitySelector({
  label,
  placeholder,
  options,
  value,
  onChange,
  onCreate,
  createLabel,
  disabled,
  emptyMessage,
  className,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  value: string | null;
  onChange: (id: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  disabled?: boolean;
  emptyMessage: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState("");
  const selected = options.find((option) => option.id === value) ?? null;

  const filtered = React.useMemo(() => {
    const q = normalize(term);
    if (!q) return options.slice(0, 60);
    return options.filter((option) => option.haystack.includes(q)).slice(0, 60);
  }, [options, term]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setTerm("");
          setOpen(true);
        }}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-3 text-left transition-colors hover:border-ink-600 disabled:cursor-not-allowed disabled:opacity-60 md:h-10",
          className,
        )}
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-[15px] text-fog-100 md:text-sm">
                {selected.title}
              </span>
              <span className="block truncate text-xs text-fog-400">{selected.subtitle}</span>
            </>
          ) : (
            <span className="text-[15px] text-fog-400 md:text-sm">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-fog-400" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={label} size="md">
          <SearchInput value={term} onChange={setTerm} placeholder="Digite para filtrar…" autoFocus />
          {onCreate ? (
            <Button
              variant="outline"
              block
              className="mt-3"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
            >
              <Plus /> {createLabel ?? "Cadastrar novo"}
            </Button>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title={emptyMessage} />
          ) : (
            <ul className="mt-3 divide-y divide-ink-800">
              {filtered.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-ink-850"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fog-100">
                        {option.title}
                      </span>
                      <span className="block truncate text-xs text-fog-400">{option.subtitle}</span>
                    </span>
                    {option.id === value ? (
                      <Check className="size-4 shrink-0 text-amber-brand" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CustomerSelector({
  value,
  onChange,
  onCreate,
  disabled,
}: {
  value: string | null;
  onChange: (id: string) => void;
  onCreate?: () => void;
  disabled?: boolean;
}) {
  const { customers } = useData();
  const options = React.useMemo<Option[]>(
    () =>
      customers
        .filter((customer) => customer.active)
        .map((customer) => ({
          id: customer.id,
          title: customer.name,
          subtitle:
            [formatPhone(customer.phone), customer.document, customer.city]
              .filter(Boolean)
              .join(" · ") || "Sem contato",
          haystack: normalize(
            `${customer.name} ${customer.document ?? ""} ${customer.phone ?? ""} ${customer.whatsapp ?? ""} ${customer.city ?? ""}`,
          ),
        }))
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [customers],
  );

  return (
    <EntitySelector
      label="Selecionar cliente"
      placeholder="Buscar cliente…"
      options={options}
      value={value}
      onChange={onChange}
      onCreate={onCreate}
      createLabel="Cadastrar novo cliente"
      disabled={disabled}
      emptyMessage="Nenhum cliente encontrado"
    />
  );
}

export function VehicleSelector({
  customerId,
  value,
  onChange,
  onCreate,
  disabled,
}: {
  customerId: string | null;
  value: string | null;
  onChange: (id: string) => void;
  onCreate?: () => void;
  disabled?: boolean;
}) {
  const { vehicles, customers } = useData();
  const options = React.useMemo<Option[]>(
    () =>
      vehicles
        .filter((vehicle) => !customerId || vehicle.customer_id === customerId)
        .map((vehicle) => {
          const owner = customers.find((c) => c.id === vehicle.customer_id);
          return {
            id: vehicle.id,
            title: `${formatPlate(vehicle.plate)} · ${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim(),
            subtitle: [vehicle.year, vehicle.color, owner?.name].filter(Boolean).join(" · "),
            haystack: normalize(
              `${vehicle.plate} ${vehicle.brand ?? ""} ${vehicle.model ?? ""} ${owner?.name ?? ""}`,
            ),
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [vehicles, customers, customerId],
  );

  return (
    <EntitySelector
      label="Selecionar veículo"
      placeholder={customerId ? "Buscar veículo…" : "Selecione o cliente primeiro"}
      options={options}
      value={value}
      onChange={onChange}
      onCreate={onCreate}
      createLabel="Cadastrar novo veículo"
      disabled={disabled}
      emptyMessage="Nenhum veículo encontrado"
    />
  );
}

export function SupplierSelector({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { suppliers } = useData();
  const options = React.useMemo<Option[]>(
    () =>
      suppliers
        .filter((supplier) => supplier.active)
        .map((supplier) => ({
          id: supplier.id,
          title: supplier.trade_name ?? supplier.company_name,
          subtitle: [supplier.company_name, formatPhone(supplier.phone)].filter(Boolean).join(" · "),
          haystack: normalize(`${supplier.company_name} ${supplier.trade_name ?? ""}`),
        }))
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [suppliers],
  );

  return (
    <EntitySelector
      label="Selecionar fornecedor"
      placeholder="Buscar fornecedor…"
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      emptyMessage="Nenhum fornecedor encontrado"
    />
  );
}
