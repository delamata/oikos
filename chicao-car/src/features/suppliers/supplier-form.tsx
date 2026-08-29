"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormRow, MaskedField, ToggleField } from "@/components/forms/controls";
import { supplierSchema, type SupplierInput, type SupplierValues } from "@/lib/validations";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { BR_STATES } from "@/lib/constants";
import type { Supplier } from "@/types";

const EMPTY: SupplierInput = {
  company_name: "",
  trade_name: "",
  document: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  state: "",
  notes: "",
  active: true,
};

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
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
  } = useForm<SupplierInput, unknown, SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: EMPTY,
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      supplier
        ? {
            company_name: supplier.company_name,
            trade_name: supplier.trade_name ?? "",
            document: supplier.document ?? "",
            contact_name: supplier.contact_name ?? "",
            phone: supplier.phone ?? "",
            whatsapp: supplier.whatsapp ?? "",
            email: supplier.email ?? "",
            address: supplier.address ?? "",
            city: supplier.city ?? "",
            state: supplier.state ?? "",
            notes: supplier.notes ?? "",
            active: supplier.active,
          }
        : EMPTY,
    );
  }, [open, supplier, reset]);

  async function onSubmit(values: SupplierValues) {
    const now = new Date().toISOString();
    try {
      if (supplier) {
        await update("suppliers", supplier.id, { ...values, updated_at: now });
        await audit({
          action: "update",
          entity: "suppliers",
          entity_id: supplier.id,
          summary: `Fornecedor ${values.company_name} atualizado`,
          before: { ...supplier },
          after: { ...values },
        });
        toast.success("Fornecedor atualizado.");
      } else {
        await insert("suppliers", { id: newId(), ...values, created_at: now, updated_at: now });
        await audit({
          action: "create",
          entity: "suppliers",
          summary: `Fornecedor ${values.company_name} cadastrado`,
          after: { ...values },
        });
        toast.success("Fornecedor cadastrado.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={supplier ? "Editar fornecedor" : "Novo fornecedor"}
        description="Usado nas compras de peças e nas contas a pagar."
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormRow>
            <Field label="Razão social" required error={errors.company_name?.message}>
              <Input {...register("company_name")} autoFocus />
            </Field>
            <Field label="Nome fantasia">
              <Input {...register("trade_name")} />
            </Field>
          </FormRow>

          <FormRow>
            <MaskedField
              control={control}
              name="document"
              label="CNPJ / CPF"
              mask="document"
              error={errors.document?.message}
            />
            <Field label="Pessoa de contato">
              <Input {...register("contact_name")} />
            </Field>
          </FormRow>

          <FormRow>
            <MaskedField
              control={control}
              name="phone"
              label="Telefone"
              mask="phone"
              inputMode="tel"
              error={errors.phone?.message}
            />
            <MaskedField
              control={control}
              name="whatsapp"
              label="WhatsApp"
              mask="phone"
              inputMode="tel"
              error={errors.whatsapp?.message}
            />
          </FormRow>

          <Field label="E-mail" error={errors.email?.message}>
            <Input type="email" inputMode="email" {...register("email")} />
          </Field>

          <FormRow columns={3}>
            <Field label="Endereço" className="sm:col-span-2 lg:col-span-1">
              <Input {...register("address")} />
            </Field>
            <Field label="Cidade">
              <Input {...register("city")} />
            </Field>
            <Field label="Estado">
              <Select {...register("state")}>
                <option value="">—</option>
                {BR_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </Select>
            </Field>
          </FormRow>

          <Field label="Observações">
            <Textarea {...register("notes")} placeholder="Prazo de entrega, condições de pagamento…" />
          </Field>

          <ToggleField
            label="Fornecedor ativo"
            checked={watch("active")}
            onChange={(checked) => setValue("active", checked)}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {supplier ? "Salvar alterações" : "Cadastrar fornecedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
