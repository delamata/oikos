"use client";

import * as React from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { maskDocument, maskPhone, maskPlate, maskZip } from "@/lib/utils/masks";

const MASKS = {
  document: maskDocument,
  phone: maskPhone,
  zip: maskZip,
  plate: maskPlate,
} as const;

/** Campo de texto com máscara brasileira, ligado ao react-hook-form. */
export function MaskedField<T extends FieldValues, TOut = T>({
  control,
  name,
  label,
  mask,
  required,
  placeholder,
  error,
  inputMode = "numeric",
  className,
}: {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
  label: string;
  mask: keyof typeof MASKS;
  required?: boolean;
  placeholder?: string;
  error?: string;
  inputMode?: "numeric" | "text" | "tel";
  className?: string;
}) {
  return (
    <Field label={label} required={required} error={error} className={className}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            {...field}
            value={(field.value as string) ?? ""}
            onChange={(e) => field.onChange(MASKS[mask](e.target.value))}
            inputMode={inputMode}
            placeholder={placeholder}
            autoCapitalize={mask === "plate" ? "characters" : undefined}
          />
        )}
      />
    </Field>
  );
}

/** Campo de moeda ligado ao react-hook-form (guarda `number`). */
export function CurrencyField<T extends FieldValues, TOut = T>({
  control,
  name,
  label,
  required,
  error,
  hint,
  className,
}: {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Field label={label} required={required} error={error} hint={hint} className={className}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <CurrencyInput value={Number(field.value ?? 0)} onChange={field.onChange} />
        )}
      />
    </Field>
  );
}

export function SelectField({
  label,
  required,
  error,
  hint,
  className,
  placeholder = "Selecione…",
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label} required={required} error={error} hint={hint} className={className}>
      <Select {...props}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Linha de formulário responsiva: empilha no celular, colunas no desktop. */
export function FormRow({
  columns = 2,
  children,
}: {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  const cls = {
    1: "grid gap-3",
    2: "grid gap-3 sm:grid-cols-2",
    3: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid gap-3 grid-cols-2 lg:grid-cols-4",
  }[columns];
  return <div className={cls}>{children}</div>;
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fog-100">{label}</span>
        {description ? <span className="block text-xs text-fog-400">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-[#f0a73c]"
      />
    </label>
  );
}
