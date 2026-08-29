import { z } from "zod";
import { onlyDigits } from "@/lib/utils/format";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === "" || value === undefined || value === null) return null;
    const parsed = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  });

/** CPF (11) ou CNPJ (14). Aceita vazio — nem todo cliente de balcão informa. */
const documentSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || [11, 14].includes(onlyDigits(value).length),
    "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
  )
  .transform((value) => (value && value.length > 0 ? value : null));

const phoneSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || [10, 11].includes(onlyDigits(value).length),
    "Telefone deve ter DDD + 8 ou 9 dígitos.",
  )
  .transform((value) => (value && value.length > 0 ? value : null));

const emailSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "E-mail inválido.")
  .transform((value) => (value && value.length > 0 ? value : null));

export const customerSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo do cliente."),
  document: documentSchema,
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: emailSchema,
  birth_date: optionalText,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  zip_code: optionalText,
  notes: optionalText,
  active: z.boolean(),
});
export type CustomerInput = z.input<typeof customerSchema>;
export type CustomerValues = z.output<typeof customerSchema>;

export const vehicleSchema = z.object({
  customer_id: z.string().min(1, "Selecione o proprietário do veículo."),
  plate: z
    .string()
    .trim()
    .min(7, "Placa incompleta.")
    .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .refine(
      (value) => /^[A-Z]{3}\d{4}$/.test(value) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(value),
      "Use o padrão ABC-1234 ou ABC1D23.",
    ),
  brand: optionalText,
  model: optionalText,
  version: optionalText,
  year: optionalNumber,
  model_year: optionalNumber,
  color: optionalText,
  fuel_type: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  mileage: optionalNumber,
  chassis: optionalText,
  renavam: optionalText,
  notes: optionalText,
});
export type VehicleInput = z.input<typeof vehicleSchema>;
export type VehicleValues = z.output<typeof vehicleSchema>;

export const supplierSchema = z.object({
  company_name: z.string().trim().min(3, "Informe a razão social."),
  trade_name: optionalText,
  document: documentSchema,
  contact_name: optionalText,
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: emailSchema,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  notes: optionalText,
  active: z.boolean(),
});
export type SupplierInput = z.input<typeof supplierSchema>;
export type SupplierValues = z.output<typeof supplierSchema>;

export const serviceSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do serviço."),
  description: optionalText,
  category: optionalText,
  default_price: z.number().min(0, "O preço não pode ser negativo."),
  estimated_minutes: optionalNumber,
  active: z.boolean(),
});
export type ServiceInput = z.input<typeof serviceSchema>;
export type ServiceValues = z.output<typeof serviceSchema>;

export const productSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da peça ou produto."),
  sku: optionalText,
  description: optionalText,
  category: optionalText,
  supplier_id: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  cost_price: z.number().min(0),
  sale_price: z.number().min(0),
  stock_quantity: z.number().min(0),
  minimum_stock: z.number().min(0),
  active: z.boolean(),
});
export type ProductInput = z.input<typeof productSchema>;
export type ProductValues = z.output<typeof productSchema>;

export const revenueSchema = z.object({
  description: z.string().trim().min(3, "Descreva a receita."),
  customer_id: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  work_order_id: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  category: optionalText,
  amount: z.number().gt(0, "O valor deve ser maior que zero."),
  due_date: z.string().min(1, "Informe o vencimento."),
  notes: optionalText,
});
export type RevenueInput = z.input<typeof revenueSchema>;
export type RevenueValues = z.output<typeof revenueSchema>;

export const expenseSchema = z.object({
  description: z.string().trim().min(3, "Descreva a despesa."),
  supplier_id: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  category: optionalText,
  amount: z.number().gt(0, "O valor deve ser maior que zero."),
  due_date: z.string().min(1, "Informe o vencimento."),
  recurring: z.boolean(),
  notes: optionalText,
});
export type ExpenseInput = z.input<typeof expenseSchema>;
export type ExpenseValues = z.output<typeof expenseSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome do usuário."),
  email: z.string().trim().email("E-mail inválido."),
  role: z.enum(["admin", "manager", "mechanic", "financial"]),
  phone: phoneSchema,
  active: z.boolean(),
});
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

export const settingsSchema = z.object({
  company_name: z.string().trim().min(2, "Informe o nome da oficina."),
  document: documentSchema,
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: emailSchema,
  address: optionalText,
  city: optionalText,
  state: optionalText,
  zip_code: optionalText,
  logo_url: optionalText,
  bank_details: optionalText,
  pix_key: optionalText,
  quote_terms: optionalText,
  order_terms: optionalText,
  document_footer: optionalText,
  quote_valid_days: z.number().min(1).max(90),
});
export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsValues = z.output<typeof settingsSchema>;
