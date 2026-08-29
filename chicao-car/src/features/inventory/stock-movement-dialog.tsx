"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { FormRow } from "@/components/forms/controls";
import { SupplierSelector } from "@/components/forms/selectors";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { MOVEMENT_TYPE } from "@/lib/constants";
import { formatNumber } from "@/lib/utils/format";
import type { MovementType, Product } from "@/types";

/** Entrada, saída, ajuste ou devolução de estoque de uma peça. */
export function StockMovementDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* montado só quando abre: o `key` garante o formulário zerado a cada produto */}
      {open && product ? (
        <MovementForm key={product.id} product={product} onClose={() => onOpenChange(false)} />
      ) : null}
    </Dialog>
  );
}

function MovementForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const { insert, update, audit } = useData();
  const [type, setType] = React.useState<MovementType>("entry");
  const [quantity, setQuantity] = React.useState(1);
  const [unitCost, setUnitCost] = React.useState(product.cost_price);
  const [supplierId, setSupplierId] = React.useState<string | null>(product.supplier_id);
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const delta =
    type === "entry" || type === "return"
      ? Math.abs(quantity)
      : type === "exit"
        ? -Math.abs(quantity)
        : quantity;
  const nextStock = product.stock_quantity + delta;

  async function handleSave() {
    if (quantity === 0) {
      toast.error("Informe uma quantidade diferente de zero.");
      return;
    }
    if (nextStock < 0) {
      toast.error("A movimentação deixaria o estoque negativo.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await insert("inventory_movements", {
        id: newId(),
        product_id: product.id,
        type,
        quantity: delta,
        unit_cost: unitCost || null,
        work_order_id: null,
        supplier_id: supplierId,
        notes: notes || null,
        created_at: now,
      });
      await update("products", product.id, {
        stock_quantity: nextStock,
        cost_price: type === "entry" && unitCost > 0 ? unitCost : product.cost_price,
        updated_at: now,
      });
      await audit({
        action: "stock_movement",
        entity: "products",
        entity_id: product.id,
        summary: `${MOVEMENT_TYPE[type].label} de ${Math.abs(delta)} un. em ${product.name}`,
        before: { stock_quantity: product.stock_quantity },
        after: { stock_quantity: nextStock },
      });
      toast.success("Estoque atualizado.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível movimentar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent title="Movimentar estoque" description={product.name}>
        <div className="space-y-3">
          <FormRow>
            <Field label="Tipo de movimentação">
              <Select value={type} onChange={(e) => setType(e.target.value as MovementType)}>
                {(Object.keys(MOVEMENT_TYPE) as MovementType[]).map((key) => (
                  <option key={key} value={key}>
                    {MOVEMENT_TYPE[key].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={type === "adjustment" ? "Quantidade (+/-)" : "Quantidade"}
              hint={`Estoque atual: ${formatNumber(product.stock_quantity)} un.`}
            >
              <Input
                type="number"
                inputMode="numeric"
                className="tabular"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </Field>
          </FormRow>

          {type === "entry" ? (
            <FormRow>
              <Field label="Custo unitário">
                <CurrencyInput value={unitCost} onChange={setUnitCost} />
              </Field>
              <Field label="Fornecedor">
                <SupplierSelector value={supplierId} onChange={setSupplierId} />
              </Field>
            </FormRow>
          ) : null}

          <Field label="Observação">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nota fiscal, motivo do ajuste…"
            />
          </Field>

          <div className="rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-sm">
            <span className="text-fog-400">Estoque após a movimentação: </span>
            <span className="tabular font-semibold text-fog-100">{formatNumber(nextStock)} un.</span>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} loading={busy}>
              Registrar movimentação
            </Button>
          </DialogFooter>
      </div>
    </DialogContent>
  );
}
