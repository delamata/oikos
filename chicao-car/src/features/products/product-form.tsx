"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CurrencyField, FormRow, ToggleField } from "@/components/forms/controls";
import { SupplierSelector } from "@/components/forms/selectors";
import { productSchema, type ProductInput, type ProductValues } from "@/lib/validations";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { formatPercent } from "@/lib/utils/format";
import type { Product } from "@/types";

const EMPTY: ProductInput = {
  name: "",
  sku: "",
  description: "",
  category: "",
  supplier_id: "",
  cost_price: 0,
  sale_price: 0,
  stock_quantity: 0,
  minimum_stock: 0,
  active: true,
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}) {
  const { insert, update, audit, insertMany } = useData();
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput, unknown, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            name: product.name,
            sku: product.sku ?? "",
            description: product.description ?? "",
            category: product.category ?? "",
            supplier_id: product.supplier_id ?? "",
            cost_price: product.cost_price,
            sale_price: product.sale_price,
            stock_quantity: product.stock_quantity,
            minimum_stock: product.minimum_stock,
            active: product.active,
          }
        : EMPTY,
    );
  }, [open, product, reset]);

  const cost = Number(watch("cost_price") ?? 0);
  const sale = Number(watch("sale_price") ?? 0);
  const margin = cost > 0 ? ((sale - cost) / cost) * 100 : 0;

  async function onSubmit(values: ProductValues) {
    const now = new Date().toISOString();
    try {
      if (product) {
        await update("products", product.id, { ...values, updated_at: now });
        // ajuste manual de estoque também vira movimentação, para o histórico fechar
        if (values.stock_quantity !== product.stock_quantity) {
          await insertMany("inventory_movements", [
            {
              id: newId(),
              product_id: product.id,
              type: "adjustment",
              quantity: values.stock_quantity - product.stock_quantity,
              unit_cost: values.cost_price,
              work_order_id: null,
              supplier_id: values.supplier_id,
              notes: "Ajuste manual pelo cadastro do produto",
              created_at: now,
            },
          ]);
        }
        await audit({
          action: "update",
          entity: "products",
          entity_id: product.id,
          summary: `Produto ${values.name} atualizado`,
          before: { ...product },
          after: { ...values },
        });
        toast.success("Produto atualizado.");
      } else {
        const row: Product = { id: newId(), ...values, created_at: now, updated_at: now };
        const saved = await insert("products", row);
        if (values.stock_quantity > 0) {
          await insertMany("inventory_movements", [
            {
              id: newId(),
              product_id: saved.id,
              type: "entry",
              quantity: values.stock_quantity,
              unit_cost: values.cost_price,
              work_order_id: null,
              supplier_id: values.supplier_id,
              notes: "Estoque inicial",
              created_at: now,
            },
          ]);
        }
        await audit({
          action: "create",
          entity: "products",
          entity_id: saved.id,
          summary: `Produto ${values.name} cadastrado`,
          after: { ...values },
        });
        toast.success("Produto cadastrado.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogContent
        title={product ? "Editar produto" : "Novo produto ou peça"}
        description="Itens do catálogo entram na OS com preço e custo já preenchidos."
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Nome" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Ex.: Filtro de óleo" autoFocus />
          </Field>

          <FormRow columns={3}>
            <Field label="SKU / código">
              <Input {...register("sku")} placeholder="CC-1001" />
            </Field>
            <Field label="Categoria">
              <Select {...register("category")}>
                <option value="">—</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fornecedor">
              <SupplierSelector
                value={watch("supplier_id") || null}
                onChange={(id) => setValue("supplier_id", id)}
              />
            </Field>
          </FormRow>

          <FormRow>
            <CurrencyField control={control} name="cost_price" label="Preço de custo" />
            <CurrencyField
              control={control}
              name="sale_price"
              label="Preço de venda"
              hint={cost > 0 ? `Margem de ${formatPercent(margin)}` : undefined}
            />
          </FormRow>

          <FormRow>
            <Field label="Estoque atual" error={errors.stock_quantity?.message}>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                className="tabular"
                {...register("stock_quantity", { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Estoque mínimo"
              hint="Abaixo disso o sistema gera alerta."
              error={errors.minimum_stock?.message}
            >
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                className="tabular"
                {...register("minimum_stock", { valueAsNumber: true })}
              />
            </Field>
          </FormRow>

          <Field label="Descrição">
            <Textarea {...register("description")} placeholder="Aplicação, referência do fabricante…" />
          </Field>

          <ToggleField
            label="Produto ativo"
            checked={watch("active")}
            onChange={(checked) => setValue("active", checked)}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {product ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
