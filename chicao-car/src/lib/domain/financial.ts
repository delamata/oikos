import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Expense, Payment, Revenue } from "@/types";

export interface Period {
  from: Date;
  to: Date;
}

export type Granularity = "day" | "week" | "month";

export function inPeriod(dateISO: string | null | undefined, period: Period): boolean {
  if (!dateISO) return false;
  const date = parseISO(dateISO);
  return isWithinInterval(date, { start: startOfDay(period.from), end: endOfDay(period.to) });
}

export interface FinancialSummary {
  revenueAccrued: number;
  revenueReceived: number;
  expenseAccrued: number;
  expensePaid: number;
  result: number;
  cashResult: number;
  receivable: number;
  receivableOverdue: number;
  payable: number;
  payableOverdue: number;
  defaultRate: number;
}

export function summarizeFinancials(
  revenues: Revenue[],
  expenses: Expense[],
  period: Period,
  today = new Date(),
): FinancialSummary {
  const active = revenues.filter((r) => r.status !== "cancelled");
  const activeExpenses = expenses.filter((e) => e.status !== "cancelled");

  const revenueAccrued = sum(
    active.filter((r) => inPeriod(r.due_date, period)).map((r) => r.amount),
  );
  const revenueReceived = sum(
    active.filter((r) => inPeriod(r.payment_date, period)).map((r) => r.paid_amount),
  );
  const expenseAccrued = sum(
    activeExpenses.filter((e) => inPeriod(e.due_date, period)).map((e) => e.amount),
  );
  const expensePaid = sum(
    activeExpenses.filter((e) => inPeriod(e.payment_date, period)).map((e) => e.paid_amount),
  );

  const openRevenues = active.filter((r) => r.status !== "paid");
  const openExpenses = activeExpenses.filter((e) => e.status !== "paid");
  const receivable = sum(openRevenues.map((r) => r.amount - r.paid_amount));
  const payable = sum(openExpenses.map((e) => e.amount - e.paid_amount));
  const receivableOverdue = sum(
    openRevenues
      .filter((r) => parseISO(r.due_date) < startOfDay(today))
      .map((r) => r.amount - r.paid_amount),
  );
  const payableOverdue = sum(
    openExpenses
      .filter((e) => parseISO(e.due_date) < startOfDay(today))
      .map((e) => e.amount - e.paid_amount),
  );

  const billed = sum(active.map((r) => r.amount));

  return {
    revenueAccrued,
    revenueReceived,
    expenseAccrued,
    expensePaid,
    result: round(revenueAccrued - expenseAccrued),
    cashResult: round(revenueReceived - expensePaid),
    receivable,
    receivableOverdue,
    payable,
    payableOverdue,
    defaultRate: billed > 0 ? (receivableOverdue / billed) * 100 : 0,
  };
}

export interface CashFlowBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

/** Fluxo de caixa por dia, semana ou mês, com saldo acumulado no período. */
export function buildCashFlow(
  revenues: Revenue[],
  expenses: Expense[],
  period: Period,
  granularity: Granularity,
  openingBalance = 0,
): CashFlowBucket[] {
  const interval = { start: startOfDay(period.from), end: endOfDay(period.to) };

  const starts =
    granularity === "day"
      ? eachDayOfInterval(interval)
      : granularity === "week"
        ? eachWeekOfInterval(interval, { weekStartsOn: 1 })
        : eachMonthOfInterval(interval);

  let balance = openingBalance;

  return starts.map((start) => {
    const end =
      granularity === "day"
        ? endOfDay(start)
        : granularity === "week"
          ? endOfWeek(start, { weekStartsOn: 1 })
          : endOfMonth(start);
    const bucketPeriod = { from: start, to: end };

    const inflow = sum(
      revenues
        .filter((r) => r.status !== "cancelled" && inPeriod(r.payment_date, bucketPeriod))
        .map((r) => r.paid_amount),
    );
    const outflow = sum(
      expenses
        .filter((e) => e.status !== "cancelled" && inPeriod(e.payment_date, bucketPeriod))
        .map((e) => e.paid_amount),
    );
    balance = round(balance + inflow - outflow);

    return {
      key: format(start, "yyyy-MM-dd"),
      label:
        granularity === "day"
          ? format(start, "dd/MM")
          : granularity === "week"
            ? `${format(start, "dd/MM")} – ${format(end, "dd/MM")}`
            : format(start, "MMM/yy", { locale: ptBR }),
      start,
      end,
      inflow,
      outflow,
      net: round(inflow - outflow),
      balance,
    };
  });
}

export interface MonthSeriesPoint {
  key: string;
  label: string;
  revenue: number;
  expense: number;
  result: number;
  orders: number;
  ticket: number;
}

export function buildMonthlySeries(
  revenues: Revenue[],
  expenses: Expense[],
  orderTotals: { date: string; total: number }[],
  months: Date[],
): MonthSeriesPoint[] {
  return months.map((monthDate) => {
    const period = { from: startOfMonth(monthDate), to: endOfMonth(monthDate) };
    const revenue = sum(
      revenues
        .filter((r) => r.status !== "cancelled" && inPeriod(r.due_date, period))
        .map((r) => r.amount),
    );
    const expense = sum(
      expenses
        .filter((e) => e.status !== "cancelled" && inPeriod(e.due_date, period))
        .map((e) => e.amount),
    );
    const monthOrders = orderTotals.filter((o) => inPeriod(o.date, period));
    const ordersTotal = sum(monthOrders.map((o) => o.total));

    return {
      key: format(monthDate, "yyyy-MM"),
      label: format(monthDate, "MMM/yy", { locale: ptBR }),
      revenue,
      expense,
      result: round(revenue - expense),
      orders: monthOrders.length,
      ticket: monthOrders.length ? round(ordersTotal / monthOrders.length) : 0,
    };
  });
}

/** Saldo em caixa acumulado até (exclusive) a data informada. */
export function balanceUntil(revenues: Revenue[], expenses: Expense[], until: Date): number {
  const start = startOfDay(until);
  const received = sum(
    revenues
      .filter((r) => r.payment_date && parseISO(r.payment_date) < start && r.status !== "cancelled")
      .map((r) => r.paid_amount),
  );
  const paid = sum(
    expenses
      .filter((e) => e.payment_date && parseISO(e.payment_date) < start && e.status !== "cancelled")
      .map((e) => e.paid_amount),
  );
  return round(received - paid);
}

export function paymentsByMethod(payments: Payment[], period: Period) {
  const map = new Map<string, number>();
  for (const payment of payments) {
    if (!payment.revenue_id) continue;
    if (!inPeriod(payment.paid_at, period)) continue;
    map.set(payment.payment_method, round((map.get(payment.payment_method) ?? 0) + payment.amount));
  }
  return map;
}

export function sum(values: number[]): number {
  return round(values.reduce((total, value) => total + value, 0));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
