"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormRow, MaskedField, SelectField } from "@/components/forms/controls";
import { CustomerSelector } from "@/components/forms/selectors";
import { vehicleSchema, type VehicleInput, type VehicleValues } from "@/lib/validations";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { FUEL_TYPE_OPTIONS } from "@/lib/constants";
import type { FuelType, Vehicle } from "@/types";

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  customerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle | null;
  customerId?: string | null;
  onSaved?: (vehicle: Vehicle) => void;
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
  } = useForm<VehicleInput, unknown, VehicleValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { customer_id: customerId ?? "", plate: "" },
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      vehicle
        ? {
            customer_id: vehicle.customer_id,
            plate: vehicle.plate,
            brand: vehicle.brand ?? "",
            model: vehicle.model ?? "",
            version: vehicle.version ?? "",
            year: vehicle.year ?? "",
            model_year: vehicle.model_year ?? "",
            color: vehicle.color ?? "",
            fuel_type: vehicle.fuel_type ?? "",
            mileage: vehicle.mileage ?? "",
            chassis: vehicle.chassis ?? "",
            renavam: vehicle.renavam ?? "",
            notes: vehicle.notes ?? "",
          }
        : { customer_id: customerId ?? "", plate: "" },
    );
  }, [open, vehicle, customerId, reset]);

  async function onSubmit(values: VehicleValues) {
    const now = new Date().toISOString();
    const payload = { ...values, fuel_type: (values.fuel_type as FuelType | null) ?? null };
    try {
      if (vehicle) {
        await update("vehicles", vehicle.id, { ...payload, updated_at: now });
        await audit({
          action: "update",
          entity: "vehicles",
          entity_id: vehicle.id,
          summary: `Veículo ${values.plate} atualizado`,
          before: { ...vehicle },
          after: { ...payload },
        });
        toast.success("Veículo atualizado.");
        onSaved?.({ ...vehicle, ...payload, updated_at: now });
      } else {
        const row: Vehicle = { id: newId(), ...payload, created_at: now, updated_at: now };
        const saved = await insert("vehicles", row);
        await audit({
          action: "create",
          entity: "vehicles",
          entity_id: saved.id,
          summary: `Veículo ${values.plate} cadastrado`,
          after: { ...payload },
        });
        toast.success("Veículo cadastrado.");
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
        title={vehicle ? "Editar veículo" : "Novo veículo"}
        description="A placa é a chave de busca mais usada no balcão."
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Proprietário" required error={errors.customer_id?.message}>
            <CustomerSelector
              value={watch("customer_id") || null}
              onChange={(id) => setValue("customer_id", id, { shouldValidate: true })}
            />
          </Field>

          <FormRow>
            <MaskedField
              control={control}
              name="plate"
              label="Placa"
              mask="plate"
              inputMode="text"
              required
              placeholder="ABC-1234 ou ABC1D23"
              error={errors.plate?.message}
            />
            <Field label="Quilometragem atual" error={errors.mileage?.message}>
              <Input
                inputMode="numeric"
                {...register("mileage")}
                placeholder="Ex.: 78500"
                className="tabular"
              />
            </Field>
          </FormRow>

          <FormRow>
            <Field label="Marca">
              <Input {...register("brand")} placeholder="Ex.: Volkswagen" />
            </Field>
            <Field label="Modelo">
              <Input {...register("model")} placeholder="Ex.: Gol" />
            </Field>
          </FormRow>

          <FormRow>
            <Field label="Versão">
              <Input {...register("version")} placeholder="Ex.: 1.6 MSI Comfortline" />
            </Field>
            <Field label="Cor">
              <Input {...register("color")} placeholder="Ex.: Prata" />
            </Field>
          </FormRow>

          <FormRow columns={3}>
            <Field label="Ano fabricação">
              <Input inputMode="numeric" {...register("year")} placeholder="2019" className="tabular" />
            </Field>
            <Field label="Ano modelo">
              <Input
                inputMode="numeric"
                {...register("model_year")}
                placeholder="2020"
                className="tabular"
              />
            </Field>
            <SelectField
              label="Combustível"
              options={FUEL_TYPE_OPTIONS}
              {...register("fuel_type")}
            />
          </FormRow>

          <FormRow>
            <Field label="Chassi">
              <Input {...register("chassis")} placeholder="17 caracteres" />
            </Field>
            <Field label="Renavam">
              <Input inputMode="numeric" {...register("renavam")} />
            </Field>
          </FormRow>

          <Field label="Observações">
            <Textarea {...register("notes")} placeholder="Detalhes do veículo, avarias, combinados…" />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {vehicle ? "Salvar alterações" : "Cadastrar veículo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
