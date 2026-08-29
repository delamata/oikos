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
import { customerSchema, type CustomerInput, type CustomerValues } from "@/lib/validations";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { BR_STATES } from "@/lib/constants";
import type { Customer } from "@/types";

const EMPTY: CustomerInput = {
  name: "",
  document: "",
  phone: "",
  whatsapp: "",
  email: "",
  birth_date: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  notes: "",
  active: true,
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved?: (customer: Customer) => void;
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
  } = useForm<CustomerInput, unknown, CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: EMPTY,
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      customer
        ? {
            name: customer.name,
            document: customer.document ?? "",
            phone: customer.phone ?? "",
            whatsapp: customer.whatsapp ?? "",
            email: customer.email ?? "",
            birth_date: customer.birth_date ?? "",
            address: customer.address ?? "",
            city: customer.city ?? "",
            state: customer.state ?? "",
            zip_code: customer.zip_code ?? "",
            notes: customer.notes ?? "",
            active: customer.active,
          }
        : EMPTY,
    );
  }, [open, customer, reset]);

  async function onSubmit(values: CustomerValues) {
    const now = new Date().toISOString();
    try {
      if (customer) {
        await update("customers", customer.id, { ...values, updated_at: now });
        await audit({
          action: "update",
          entity: "customers",
          entity_id: customer.id,
          summary: `Cliente ${values.name} atualizado`,
          before: { ...customer },
          after: { ...values },
        });
        toast.success("Cliente atualizado.");
        onSaved?.({ ...customer, ...values, updated_at: now });
      } else {
        const row: Customer = { id: newId(), ...values, created_at: now, updated_at: now };
        const saved = await insert("customers", row);
        await audit({
          action: "create",
          entity: "customers",
          entity_id: saved.id,
          summary: `Cliente ${values.name} cadastrado`,
          after: { ...values },
        });
        toast.success("Cliente cadastrado.");
        onSaved?.(saved);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={customer ? "Editar cliente" : "Novo cliente"}
        description="Dados usados nos orçamentos, ordens de serviço e cobranças."
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Nome completo" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Ex.: João da Silva" autoFocus />
          </Field>

          <FormRow>
            <MaskedField
              control={control}
              name="document"
              label="CPF / CNPJ"
              mask="document"
              placeholder="000.000.000-00"
              error={errors.document?.message}
            />
            <Field label="Data de nascimento" error={errors.birth_date?.message}>
              <Input type="date" {...register("birth_date")} />
            </Field>
          </FormRow>

          <FormRow>
            <MaskedField
              control={control}
              name="phone"
              label="Telefone"
              mask="phone"
              inputMode="tel"
              placeholder="(11) 3333-4444"
              error={errors.phone?.message}
            />
            <MaskedField
              control={control}
              name="whatsapp"
              label="WhatsApp"
              mask="phone"
              inputMode="tel"
              placeholder="(11) 99999-8888"
              error={errors.whatsapp?.message}
            />
          </FormRow>

          <Field label="E-mail" error={errors.email?.message}>
            <Input
              type="email"
              inputMode="email"
              {...register("email")}
              placeholder="cliente@email.com"
            />
          </Field>

          <FormRow>
            <MaskedField
              control={control}
              name="zip_code"
              label="CEP"
              mask="zip"
              placeholder="00000-000"
              error={errors.zip_code?.message}
            />
            <Field label="Endereço" error={errors.address?.message}>
              <Input {...register("address")} placeholder="Rua, número, complemento" />
            </Field>
          </FormRow>

          <FormRow>
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
            <Textarea {...register("notes")} placeholder="Preferências, histórico, combinados…" />
          </Field>

          <ToggleField
            label="Cliente ativo"
            description="Clientes inativos não aparecem nas buscas de nova OS."
            checked={watch("active")}
            onChange={(checked) => setValue("active", checked)}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {customer ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
