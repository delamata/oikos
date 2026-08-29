"use client";

import * as React from "react";
import { toast } from "sonner";
import { Package, Search, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { FormRow } from "@/components/forms/controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/lib/data/provider";
import { formatCurrency, formatNumber, normalize } from "@/lib/utils/format";

export interface ItemDraft {
  refId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
}

/**
 * Adiciona serviço ou peça à OS: escolhe do catálogo (preço já preenchido) ou
 * digita manualmente, para o caso de item sem cadastro prévio.
 */
export function AddItemDialog({
  open,
  onOpenChange,
  kind,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "service" | "product";
  onConfirm: (item: ItemDraft) => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <AddItemForm kind={kind} onClose={() => onOpenChange(false)} onConfirm={onConfirm} />
      ) : null}
    </Dialog>
  );
}

function AddItemForm({
  kind,
  onClose,
  onConfirm,
}: {
  kind: "service" | "product";
  onClose: () => void;
  onConfirm: (item: ItemDraft) => Promise<void> | void;
}) {
  const data = useData();
  const [tab, setTab] = React.useState("catalogo");
  const [term, setTerm] = React.useState("");
  const [draft, setDraft] = React.useState<ItemDraft>({
    refId: null,
    description: "",
    quantity: 1,
    unitPrice: 0,
    unitCost: 0,
    discount: 0,
  });
  const [busy, setBusy] = React.useState(false);

  const catalog = React.useMemo(() => {
    const q = normalize(term);
    if (kind === "service") {
      return data.services
        .filter((service) => service.active && (!q || normalize(service.name).includes(q)))
        .map((service) => ({
          id: service.id,
          title: service.name,
          subtitle: service.category ?? "Serviço",
          price: service.default_price,
          cost: 0,
          extra: service.estimated_minutes ? `${service.estimated_minutes} min` : null,
          stock: null as number | null,
        }));
    }
    return data.products
      .filter((product) => product.active && (!q || normalize(`${product.name} ${product.sku ?? ""}`).includes(q)))
      .map((product) => ({
        id: product.id,
        title: product.name,
        subtitle: [product.sku, product.category].filter(Boolean).join(" · ") || "Peça",
        price: product.sale_price,
        cost: product.cost_price,
        extra: null,
        stock: product.stock_quantity,
      }));
  }, [kind, term, data.services, data.products]);

  const total = Math.max(0, draft.quantity * draft.unitPrice - draft.discount);

  async function handleConfirm() {
    if (!draft.description.trim()) {
      toast.error("Informe a descrição do item.");
      return;
    }
    if (draft.quantity <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(draft);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent
      title={kind === "service" ? "Adicionar serviço" : "Adicionar peça"}
      description="Escolha do catálogo ou lance um item avulso."
      size="lg"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="manual">Item avulso</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo">
          <SearchInput
            value={term}
            onChange={setTerm}
            placeholder={kind === "service" ? "Buscar serviço…" : "Buscar peça ou SKU…"}
            autoFocus
          />
          {catalog.length === 0 ? (
            <EmptyState icon={Search} title="Nada encontrado no catálogo" />
          ) : (
            <ul className="mt-2 max-h-[42vh] divide-y divide-ink-800 overflow-y-auto">
              {catalog.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({
                        refId: item.id,
                        description: item.title,
                        quantity: 1,
                        unitPrice: item.price,
                        unitCost: item.cost,
                        discount: 0,
                      });
                      setTab("manual");
                    }}
                    className="flex w-full items-center gap-3 px-1 py-3 text-left transition-colors hover:bg-ink-850"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-800">
                      {kind === "service" ? (
                        <Wrench className="size-4 text-fog-300" />
                      ) : (
                        <Package className="size-4 text-fog-300" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fog-100">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-fog-400">
                        {item.subtitle}
                        {item.extra ? ` · ${item.extra}` : ""}
                      </span>
                    </span>
                    {item.stock != null ? (
                      <Badge tone={item.stock > 0 ? "neutral" : "danger"}>
                        {formatNumber(item.stock)} un.
                      </Badge>
                    ) : null}
                    <span className="tabular shrink-0 text-sm font-semibold text-fog-100">
                      {formatCurrency(item.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="manual">
          <div className="space-y-3">
            <Field label="Descrição" required>
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder={
                  kind === "service" ? "Ex.: Revisão de freios" : "Ex.: Pastilha de freio dianteira"
                }
                autoFocus
              />
            </Field>

            <FormRow columns={3}>
              <Field label="Quantidade">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  className="tabular"
                  value={draft.quantity}
                  onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Valor unitário">
                <CurrencyInput
                  value={draft.unitPrice}
                  onChange={(value) => setDraft({ ...draft, unitPrice: value })}
                />
              </Field>
              <Field label="Desconto no item">
                <CurrencyInput
                  value={draft.discount}
                  onChange={(value) => setDraft({ ...draft, discount: value })}
                />
              </Field>
            </FormRow>

            {kind === "product" ? (
              <Field label="Custo unitário" hint="Usado para calcular a margem do serviço.">
                <CurrencyInput
                  value={draft.unitCost}
                  onChange={(value) => setDraft({ ...draft, unitCost: value })}
                />
              </Field>
            ) : null}

            <div className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3">
              <span className="text-sm text-fog-400">Total do item</span>
              <span className="tabular text-lg font-bold text-fog-100">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => void handleConfirm()} loading={busy}>
          Adicionar à OS
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
