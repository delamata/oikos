"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CurrencyField, FormRow, ToggleField } from "@/components/forms/controls";
import { CustomerSelector, SupplierSelector } from "@/components/forms/selectors";
import {
  expenseSchema,
  revenueSchema,
  type ExpenseInput,
  type ExpenseValues,
  type RevenueInput,
  type RevenueValues,
} from "@/lib/validations";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { EXPENSE_CATEGORIES, REVENUE_CATEGORIES } from "@/lib/constants";
import type { Expense, Revenue } from "@/types";

export function RevenueFormDialog({
  open,
  onOpenChange,
  revenue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenue?: Revenue | null;
}) {
  const { insert, update, audit } = useData();
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RevenueInput, unknown, RevenueValues>({
    resolver: zodResolver(revenueSchema),
    defaultValues: { description: "", amount: 0, due_date: format(new Date(), "yyyy-MM-dd") },
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      revenue
        ? {
            description: revenue.description,
            customer_id: revenue.customer_id ?? "",
            work_order_id: revenue.work_order_id ?? "",
            category: revenue.category ?? "",
            amount: revenue.amount,
            due_date: revenue.due_date,
            notes: revenue.notes ?? "",
          }
        : {
            description: "",
            customer_id: "",
            category: "Serviços",
            amount: 0,
            due_date: format(new Date(), "yyyy-MM-dd"),
            notes: "",
          },
    );
  }, [open, revenue, reset]);

  async function onSubmit(values: RevenueValues) {
    try {
      if (revenue) {
        await update("revenues", revenue.id, values);
        await audit({
          action: "update",
          entity: "revenues",
          entity_id: revenue.id,
          summary: `Receita "${values.description}" atualizada`,
          before: { ...revenue },
          after: { ...values },
        });
        toast.success("Receita atualizada.");
      } else {
        await insert("revenues", {
          id: newId(),
          ...values,
          paid_amount: 0,
          payment_method: null,
          payment_date: null,
          status: "pending",
          created_at: new Date().toISOString(),
        });
        await audit({
          action: "create",
          entity: "revenues",
          summary: `Receita "${values.description}" lançada`,
          after: { ...values },
        });
        toast.success("Receita lançada.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={revenue ? "Editar receita" : "Nova receita"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Descrição" required error={errors.description?.message}>
            <Input {...register("description")} placeholder="Ex.: Venda de peças no balcão" autoFocus />
          </Field>

          <Field label="Cliente">
            <CustomerSelector
              value={watch("customer_id") || null}
              onChange={(id) => setValue("customer_id", id)}
            />
          </Field>

          <FormRow>
            <Field label="Categoria">
              <Select {...register("category")}>
                <option value="">—</option>
                {REVENUE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vencimento" required error={errors.due_date?.message}>
              <Input type="date" {...register("due_date")} />
            </Field>
          </FormRow>

          <CurrencyField
            control={control}
            name="amount"
            label="Valor"
            required
            error={errors.amount?.message}
          />

          <Field label="Observações">
            <Textarea {...register("notes")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {revenue ? "Salvar alterações" : "Lançar receita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}) {
  const { insert, update, audit } = useData();
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput, unknown, ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      due_date: format(new Date(), "yyyy-MM-dd"),
      recurring: false,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      expense
        ? {
            description: expense.description,
            supplier_id: expense.supplier_id ?? "",
            category: expense.category ?? "",
            amount: expense.amount,
            due_date: expense.due_date,
            recurring: expense.recurring,
            notes: expense.notes ?? "",
          }
        : {
            description: "",
            supplier_id: "",
            category: "Peças",
            amount: 0,
            due_date: format(new Date(), "yyyy-MM-dd"),
            recurring: false,
            notes: "",
          },
    );
  }, [open, expense, reset]);

  async function onSubmit(values: ExpenseValues) {
    try {
      if (expense) {
        await update("expenses", expense.id, values);
        await audit({
          action: "update",
          entity: "expenses",
          entity_id: expense.id,
          summary: `Despesa "${values.description}" atualizada`,
          before: { ...expense },
          after: { ...values },
        });
        toast.success("Despesa atualizada.");
      } else {
        await insert("expenses", {
          id: newId(),
          ...values,
          paid_amount: 0,
          payment_method: null,
          payment_date: null,
          status: "pending",
          created_at: new Date().toISOString(),
        });
        await audit({
          action: "create",
          entity: "expenses",
          summary: `Despesa "${values.description}" lançada`,
          after: { ...values },
        });
        toast.success("Despesa lançada.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={expense ? "Editar despesa" : "Nova despesa"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Descrição" required error={errors.description?.message}>
            <Input {...register("description")} placeholder="Ex.: Compra de filtros" autoFocus />
          </Field>

          <Field label="Fornecedor">
            <SupplierSelector
              value={watch("supplier_id") || null}
              onChange={(id) => setValue("supplier_id", id)}
            />
          </Field>

          <FormRow>
            <Field label="Categoria">
              <Select {...register("category")}>
                <option value="">—</option>
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vencimento" required error={errors.due_date?.message}>
              <Input type="date" {...register("due_date")} />
            </Field>
          </FormRow>

          <CurrencyField
            control={control}
            name="amount"
            label="Valor"
            required
            error={errors.amount?.message}
          />

          <ToggleField
            label="Despesa recorrente"
            description="Marque para contas fixas, como aluguel e energia."
            checked={Boolean(watch("recurring"))}
            onChange={(checked) => setValue("recurring", checked)}
          />

          <Field label="Observações">
            <Textarea {...register("notes")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {expense ? "Salvar alterações" : "Lançar despesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
