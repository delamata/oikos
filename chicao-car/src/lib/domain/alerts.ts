import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { Expense, Product, Revenue, WorkOrder } from "@/types";
import type { Tone } from "@/lib/constants";

export interface Alert {
  id: string;
  kind:
    | "expense_due"
    | "expense_overdue"
    | "revenue_overdue"
    | "order_awaiting_approval"
    | "order_completed"
    | "low_stock";
  title: string;
  description: string;
  tone: Tone;
  href: string;
  /** Quanto maior, mais urgente. Usado para ordenar a lista. */
  weight: number;
}

const DUE_SOON_DAYS = 5;

export function buildAlerts(
  data: {
    revenues: Revenue[];
    expenses: Expense[];
    work_orders: WorkOrder[];
    products: Product[];
  },
  today = new Date(),
): Alert[] {
  const alerts: Alert[] = [];
  const reference = startOfDay(today);

  for (const expense of data.expenses) {
    if (expense.status === "paid" || expense.status === "cancelled") continue;
    const days = differenceInCalendarDays(parseISO(expense.due_date), reference);
    if (days < 0) {
      alerts.push({
        id: `exp-late-${expense.id}`,
        kind: "expense_overdue",
        title: "Conta a pagar vencida",
        description: `${expense.description} · ${Math.abs(days)} dia(s) em atraso`,
        tone: "danger",
        href: "/financeiro/contas-a-pagar",
        weight: 100 + Math.abs(days),
      });
    } else if (days <= DUE_SOON_DAYS) {
      alerts.push({
        id: `exp-soon-${expense.id}`,
        kind: "expense_due",
        title: days === 0 ? "Conta vence hoje" : `Conta vence em ${days} dia(s)`,
        description: expense.description,
        tone: "warn",
        href: "/financeiro/contas-a-pagar",
        weight: 60 - days,
      });
    }
  }

  for (const revenue of data.revenues) {
    if (revenue.status === "paid" || revenue.status === "cancelled") continue;
    const days = differenceInCalendarDays(parseISO(revenue.due_date), reference);
    if (days < 0) {
      alerts.push({
        id: `rev-late-${revenue.id}`,
        kind: "revenue_overdue",
        title: "Recebimento em atraso",
        description: `${revenue.description} · ${Math.abs(days)} dia(s)`,
        tone: "danger",
        href: "/financeiro/contas-a-receber",
        weight: 90 + Math.abs(days),
      });
    }
  }

  for (const order of data.work_orders) {
    if (order.status === "awaiting_approval") {
      alerts.push({
        id: `os-appr-${order.id}`,
        kind: "order_awaiting_approval",
        title: `OS #${order.order_number} aguardando aprovação`,
        description: "O cliente ainda não respondeu ao orçamento.",
        tone: "warn",
        href: `/ordens/${order.id}`,
        weight: 70,
      });
    }
    if (order.status === "completed") {
      alerts.push({
        id: `os-done-${order.id}`,
        kind: "order_completed",
        title: `OS #${order.order_number} concluída`,
        description: "Pronta para pagamento e entrega do veículo.",
        tone: "ok",
        href: `/ordens/${order.id}`,
        weight: 50,
      });
    }
  }

  for (const product of data.products) {
    if (!product.active) continue;
    if (product.stock_quantity <= product.minimum_stock) {
      alerts.push({
        id: `stock-${product.id}`,
        kind: "low_stock",
        title: "Estoque abaixo do mínimo",
        description: `${product.name} · ${product.stock_quantity} un. (mín. ${product.minimum_stock})`,
        tone: product.stock_quantity === 0 ? "danger" : "warn",
        href: "/produtos",
        weight: product.stock_quantity === 0 ? 85 : 40,
      });
    }
  }

  return alerts.sort((a, b) => b.weight - a.weight);
}
