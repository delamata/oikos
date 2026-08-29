import { formatCurrency, formatDate, formatPlate } from "@/lib/utils/format";
import type { Customer, Expense, Revenue, Vehicle, WorkOrder, WorkshopSettings } from "@/types";

interface DocumentContext {
  settings: WorkshopSettings;
  order: WorkOrder;
  customer: Customer | null;
  vehicle: Vehicle | null;
  link?: string;
}

const firstName = (name?: string | null) => (name ?? "").split(" ")[0] || "cliente";

export function quoteMessage({ settings, order, customer, vehicle, link }: DocumentContext): string {
  const lines = [
    `Olá, ${firstName(customer?.name)}! Aqui é da *${settings.company_name}*.`,
    "",
    `Segue o orçamento *#${order.order_number}* do seu ${vehicle?.brand ?? "veículo"} ${vehicle?.model ?? ""}${
      vehicle ? ` (${formatPlate(vehicle.plate)})` : ""
    }.`,
    "",
    `Serviços: ${formatCurrency(order.subtotal_services)}`,
    `Peças: ${formatCurrency(order.subtotal_products)}`,
  ];
  if (order.discount > 0) lines.push(`Desconto: -${formatCurrency(order.discount)}`);
  lines.push(`*Total: ${formatCurrency(order.total)}*`);
  if (link) lines.push("", `Orçamento completo: ${link}`);
  lines.push("", "Podemos seguir com o serviço? Qualquer dúvida é só chamar por aqui.");
  return lines.join("\n");
}

export function orderReadyMessage({ settings, order, customer, vehicle }: DocumentContext): string {
  return [
    `Olá, ${firstName(customer?.name)}! Aqui é da *${settings.company_name}*.`,
    "",
    `O serviço da OS *#${order.order_number}*${
      vehicle ? ` (${vehicle.brand ?? ""} ${vehicle.model ?? ""} — ${formatPlate(vehicle.plate)})` : ""
    } foi concluído. 🚗✅`,
    "",
    `Valor total: *${formatCurrency(order.total)}*`,
    settings.pix_key ? `PIX: ${settings.pix_key}` : "",
    "",
    "O veículo já pode ser retirado. Estamos à disposição!",
  ]
    .filter(Boolean)
    .join("\n");
}

export function receiptMessage({ settings, order, customer }: DocumentContext): string {
  return [
    `Olá, ${firstName(customer?.name)}! Recebemos o pagamento da OS *#${order.order_number}*.`,
    "",
    `Valor: *${formatCurrency(order.total)}*`,
    "",
    `Obrigado pela confiança! — ${settings.company_name}`,
  ].join("\n");
}

export function revenueChargeMessage(
  revenue: Revenue,
  customer: Customer | null,
  settings: WorkshopSettings,
): string {
  const remaining = revenue.amount - revenue.paid_amount;
  return [
    `Olá, ${firstName(customer?.name)}! Aqui é da *${settings.company_name}*.`,
    "",
    `Lembrete do pagamento referente a: ${revenue.description}`,
    `Valor em aberto: *${formatCurrency(remaining)}*`,
    `Vencimento: ${formatDate(revenue.due_date)}`,
    settings.pix_key ? `\nPIX: ${settings.pix_key}` : "",
    "\nQualquer dúvida estamos à disposição!",
  ]
    .filter(Boolean)
    .join("\n");
}

export function supplierExpenseMessage(expense: Expense, settings: WorkshopSettings): string {
  return [
    `Olá! Aqui é da *${settings.company_name}*.`,
    "",
    `Sobre o título "${expense.description}" no valor de *${formatCurrency(expense.amount)}*,`,
    `com vencimento em ${formatDate(expense.due_date)}.`,
  ].join("\n");
}

export function reportMessage(title: string, summary: string[], settings: WorkshopSettings): string {
  return [`*${settings.company_name} — ${title}*`, "", ...summary].join("\n");
}
