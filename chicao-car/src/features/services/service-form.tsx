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
import { serviceSchema, type ServiceInput, type ServiceValues } from "@/lib/validations";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import type { Service } from "@/types";

const EMPTY: ServiceInput = {
  name: "",
  description: "",
  category: "",
  default_price: 0,
  estimated_minutes: "",
  active: true,
};

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
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
  } = useForm<ServiceInput, unknown, ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: EMPTY,
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      service
        ? {
            name: service.name,
            description: service.description ?? "",
            category: service.category ?? "",
            default_price: service.default_price,
            estimated_minutes: service.estimated_minutes ?? "",
            active: service.active,
          }
        : EMPTY,
    );
  }, [open, service, reset]);

  async function onSubmit(values: ServiceValues) {
    try {
      if (service) {
        await update("services", service.id, values);
        await audit({
          action: "update",
          entity: "services",
          entity_id: service.id,
          summary: `Serviço ${values.name} atualizado`,
          before: { ...service },
          after: { ...values },
        });
        toast.success("Serviço atualizado.");
      } else {
        await insert("services", { id: newId(), ...values, created_at: new Date().toISOString() });
        await audit({
          action: "create",
          entity: "services",
          summary: `Serviço ${values.name} cadastrado`,
          after: { ...values },
        });
        toast.success("Serviço cadastrado.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={service ? "Editar serviço" : "Novo serviço"}
        description="Serviços do catálogo entram na OS com preço e tempo já preenchidos."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Nome do serviço" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Ex.: Troca de óleo e filtro" autoFocus />
          </Field>

          <FormRow>
            <Field label="Categoria">
              <Select {...register("category")}>
                <option value="">—</option>
                {SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tempo estimado (minutos)" error={errors.estimated_minutes?.message}>
              <Input
                inputMode="numeric"
                {...register("estimated_minutes")}
                placeholder="45"
                className="tabular"
              />
            </Field>
          </FormRow>

          <CurrencyField
            control={control}
            name="default_price"
            label="Preço padrão"
            required
            error={errors.default_price?.message}
            hint="Pode ser alterado item a item dentro da OS."
          />

          <Field label="Descrição">
            <Textarea {...register("description")} placeholder="O que está incluso neste serviço…" />
          </Field>

          <ToggleField
            label="Serviço ativo"
            checked={watch("active")}
            onChange={(checked) => setValue("active", checked)}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {service ? "Salvar alterações" : "Cadastrar serviço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
