"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { FormRow, MaskedField, ToggleField } from "@/components/forms/controls";
import { profileSchema, type ProfileInput, type ProfileValues } from "@/lib/validations";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { USER_ROLE, USER_ROLE_OPTIONS } from "@/lib/constants";
import type { Profile, UserRole } from "@/types";

export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: Profile | null;
}) {
  const { insert, update, audit, mode } = useData();
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "", role: "mechanic", phone: "", active: true },
  });

  React.useEffect(() => {
    if (!open) return;
    reset(
      user
        ? {
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone ?? "",
            active: user.active,
          }
        : { name: "", email: "", role: "mechanic", phone: "", active: true },
    );
  }, [open, user, reset]);

  const role = watch("role") as UserRole;

  async function onSubmit(values: ProfileValues) {
    try {
      if (user) {
        await update("profiles", user.id, values);
        await audit({
          action: "update",
          entity: "profiles",
          entity_id: user.id,
          summary: `Usuário ${values.name} atualizado (${USER_ROLE[values.role].label})`,
          before: { role: user.role, active: user.active },
          after: { role: values.role, active: values.active },
        });
        toast.success("Usuário atualizado.");
      } else {
        await insert("profiles", {
          id: newId(),
          ...values,
          created_at: new Date().toISOString(),
        });
        await audit({
          action: "create",
          entity: "profiles",
          summary: `Usuário ${values.name} cadastrado como ${USER_ROLE[values.role].label}`,
        });
        toast.success(
          mode === "supabase"
            ? "Perfil criado. Envie o convite de acesso pelo painel do Supabase."
            : "Usuário cadastrado.",
        );
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={user ? "Editar usuário" : "Novo usuário"}
        description="O perfil define o que a pessoa enxerga e pode alterar no sistema."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Field label="Nome" required error={errors.name?.message}>
            <Input {...register("name")} autoFocus />
          </Field>

          <FormRow>
            <Field label="E-mail" required error={errors.email?.message}>
              <Input type="email" inputMode="email" {...register("email")} />
            </Field>
            <MaskedField
              control={control}
              name="phone"
              label="Telefone"
              mask="phone"
              inputMode="tel"
              error={errors.phone?.message}
            />
          </FormRow>

          <Field label="Perfil de acesso" required hint={USER_ROLE[role]?.description}>
            <Select {...register("role")}>
              {USER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <ToggleField
            label="Usuário ativo"
            description="Usuários inativos não conseguem entrar no sistema."
            checked={watch("active")}
            onChange={(checked) => setValue("active", checked)}
          />

          {mode === "supabase" && !user ? (
            <p className="rounded-xl border border-info/30 bg-info/8 px-3.5 py-3 text-xs leading-relaxed text-info">
              O login em si é criado pelo Supabase Auth. Depois de salvar, convide este e-mail em
              Authentication → Users; o perfil aqui cadastrado será vinculado automaticamente.
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {user ? "Salvar alterações" : "Cadastrar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
