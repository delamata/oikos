"use client";

import * as React from "react";
import Link from "next/link";
import {
  endOfMonth,
  endOfToday,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfToday,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, TONE_CLASS } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCards } from "@/components/ui/skeleton";
import { WorkOrderStatusBadge } from "@/components/ui/status-badge";
import {
  DonutChart,
  HorizontalBarChart,
  RevenueExpenseChart,
  TrendAreaChart,
} from "@/components/dashboard/charts";
import { MobileShortcuts } from "@/components/dashboard/mobile-shortcuts";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { buildAlerts } from "@/lib/domain/alerts";
import {
  buildMonthlySeries,
  inPeriod,
  summarizeFinancials,
  sum,
} from "@/lib/domain/financial";
import {
  IN_SHOP_STATUS,
  OPEN_WORK_ORDER_STATUS,
  PAYMENT_METHOD,
  WORK_ORDER_STATUS,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatPlate, initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function DashboardPage() {
  const data = useData();
  const { profile } = useAuth();
  const [monthRef, setMonthRef] = React.useState(() => format(new Date(), "yyyy-MM"));

  const showFinancial = can(profile?.role, "financial:read");

  const month = React.useMemo(() => {
    const parsed = parseISO(`${monthRef}-01`);
    const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return { from: startOfMonth(base), to: endOfMonth(base), date: base };
  }, [monthRef]);

  const view = React.useMemo(() => {
    const today = { from: startOfToday(), to: endOfToday() };
    const financial = summarizeFinancials(data.revenues, data.expenses, month);
    const todayFinancial = summarizeFinancials(data.revenues, data.expenses, today);

    const monthOrders = data.work_orders.filter(
      (o) => o.status !== "cancelled" && inPeriod(o.opened_at, month),
    );
    const openOrders = data.work_orders.filter((o) => OPEN_WORK_ORDER_STATUS.includes(o.status));
    const inShop = data.work_orders.filter((o) => IN_SHOP_STATUS.includes(o.status));
    const awaiting = data.work_orders.filter((o) => o.status === "awaiting_approval");
    const completedToday = data.work_orders.filter(
      (o) => o.completed_at && isSameDay(parseISO(o.completed_at), new Date()),
    );

    const billed = sum(monthOrders.map((o) => o.total));
    const ticket = monthOrders.length ? billed / monthOrders.length : 0;
    const customersServed = new Set(monthOrders.map((o) => o.customer_id)).size;

    // últimos 12 meses
    const months = Array.from({ length: 12 }, (_, i) => subMonths(month.date, 11 - i));
    const series = buildMonthlySeries(
      data.revenues,
      data.expenses,
      data.work_orders
        .filter((o) => o.status !== "cancelled")
        .map((o) => ({ date: o.opened_at, total: o.total })),
      months,
    );

    // status das OS (mês)
    const statusCount = new Map<string, number>();
    for (const order of data.work_orders.filter((o) => inPeriod(o.opened_at, month))) {
      const label = WORK_ORDER_STATUS[order.status].label;
      statusCount.set(label, (statusCount.get(label) ?? 0) + 1);
    }

    // serviços mais vendidos (mês)
    const monthOrderIds = new Set(monthOrders.map((o) => o.id));
    const serviceTotals = new Map<string, number>();
    for (const item of data.work_order_services) {
      if (!monthOrderIds.has(item.work_order_id)) continue;
      serviceTotals.set(item.description, (serviceTotals.get(item.description) ?? 0) + item.total);
    }

    // clientes com maior faturamento (mês)
    const customerTotals = new Map<string, number>();
    for (const order of monthOrders) {
      customerTotals.set(order.customer_id, (customerTotals.get(order.customer_id) ?? 0) + order.total);
    }

    // formas de pagamento (mês)
    const methodTotals = new Map<string, number>();
    for (const payment of data.payments) {
      if (!payment.revenue_id || !inPeriod(payment.paid_at, month)) continue;
      const label = PAYMENT_METHOD[payment.payment_method];
      methodTotals.set(label, (methodTotals.get(label) ?? 0) + payment.amount);
    }

    return {
      financial,
      todayFinancial,
      todayBilled: sum(
        data.work_orders
          .filter((o) => o.status !== "cancelled" && inPeriod(o.opened_at, today))
          .map((o) => o.total),
      ),
      billed,
      ticket,
      customersServed,
      monthOrders,
      openOrders,
      inShop,
      awaiting,
      completedToday,
      series,
      statusData: [...statusCount.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      topServices: [...serviceTotals.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7),
      topCustomers: [...customerTotals.entries()]
        .map(([customerId, value]) => ({
          label: data.customers.find((c) => c.id === customerId)?.name ?? "—",
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7),
      methodData: [...methodTotals.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [data, month]);

  const alerts = React.useMemo(
    () =>
      buildAlerts({
        revenues: data.revenues,
        expenses: data.expenses,
        work_orders: data.work_orders,
        products: data.products,
      }).slice(0, 6),
    [data.revenues, data.expenses, data.work_orders, data.products],
  );

  const recentOrders = React.useMemo(
    () => [...data.work_orders].sort((a, b) => b.order_number - a.order_number).slice(0, 8),
    [data.work_orders],
  );

  const monthLabel = format(month.date, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle={`Visão geral da oficina · ${monthLabel}`}
        actions={
          <label className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2">
            <CalendarClock className="size-4 shrink-0 text-fog-400" />
            <span className="hidden text-xs font-medium text-fog-400 sm:block">
              Mês de referência
            </span>
            <input
              type="month"
              value={monthRef}
              onChange={(e) => setMonthRef(e.target.value)}
              className="tabular bg-transparent text-sm text-fog-100 focus:outline-none"
            />
          </label>
        }
      />

      <MobileShortcuts />

      {data.loading ? (
        <div className="space-y-3">
          <SkeletonCards count={8} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* ---------- KPIs ---------- */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Faturamento hoje"
              value={formatCurrency(view.todayBilled)}
              hint={`${view.todayFinancial.revenueReceived > 0 ? `Recebido ${formatCurrency(view.todayFinancial.revenueReceived)}` : "Nada recebido ainda"}`}
              icon={Banknote}
              tone="accent"
            />
            <StatCard
              label="Faturamento do mês"
              value={formatCurrency(view.billed)}
              hint={`${view.monthOrders.length} OS · ticket ${formatCurrency(view.ticket)}`}
              icon={ArrowUpRight}
              tone="ok"
            />
            {showFinancial ? (
              <>
                <StatCard
                  label="Despesas do mês"
                  value={formatCurrency(view.financial.expenseAccrued)}
                  hint={`Pago ${formatCurrency(view.financial.expensePaid)}`}
                  icon={ArrowDownRight}
                  tone="danger"
                  href="/financeiro/despesas"
                />
                <StatCard
                  label="Resultado do mês"
                  value={formatCurrency(view.financial.result)}
                  hint={view.financial.result >= 0 ? "Lucro no período" : "Prejuízo no período"}
                  icon={TrendingUp}
                  tone={view.financial.result >= 0 ? "ok" : "danger"}
                  href="/financeiro"
                />
              </>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {showFinancial ? (
              <>
                <StatCard
                  label="Contas a receber"
                  value={formatCurrency(view.financial.receivable)}
                  hint={
                    view.financial.receivableOverdue > 0
                      ? `${formatCurrency(view.financial.receivableOverdue)} vencido`
                      : "Nenhum atraso"
                  }
                  icon={Receipt}
                  tone={view.financial.receivableOverdue > 0 ? "warn" : "info"}
                  href="/financeiro/contas-a-receber"
                />
                <StatCard
                  label="Contas a pagar"
                  value={formatCurrency(view.financial.payable)}
                  hint={
                    view.financial.payableOverdue > 0
                      ? `${formatCurrency(view.financial.payableOverdue)} vencido`
                      : "Nenhum atraso"
                  }
                  icon={Wallet}
                  tone={view.financial.payableOverdue > 0 ? "danger" : "info"}
                  href="/financeiro/contas-a-pagar"
                />
              </>
            ) : null}
            <StatCard
              label="OS abertas"
              value={view.openOrders.length}
              hint="Em andamento na oficina"
              icon={ClipboardList}
              tone="accent"
              href="/ordens?status=abertas"
            />
            <StatCard
              label="Veículos em manutenção"
              value={view.inShop.length}
              hint="No pátio agora"
              icon={Car}
              tone="violet"
              href="/ordens?status=in_progress"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Aguardando aprovação"
              value={view.awaiting.length}
              hint="Orçamentos enviados"
              icon={Clock}
              tone="warn"
              href="/ordens?status=awaiting_approval"
            />
            <StatCard
              label="Concluídas hoje"
              value={view.completedToday.length}
              hint="Prontas para entrega"
              icon={CheckCircle2}
              tone="ok"
              href="/ordens?status=completed"
            />
            <StatCard
              label="Ticket médio"
              value={formatCurrency(view.ticket)}
              hint={`Base: ${view.monthOrders.length} OS do mês`}
              icon={FileText}
              tone="info"
            />
            <StatCard
              label="Clientes atendidos"
              value={view.customersServed}
              hint="No mês de referência"
              icon={Users}
              tone="neutral"
              href="/clientes"
            />
          </div>

          {/* ---------- Gráfico principal + alertas ---------- */}
          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader
                title="Receita x Despesa — últimos 12 meses"
                subtitle="Valores por competência (data de vencimento)"
              />
              <CardBody className="pl-1 sm:pl-2">
                <RevenueExpenseChart data={view.series} height={280} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Alertas"
                action={
                  alerts.length ? (
                    <Badge tone={alerts.some((a) => a.tone === "danger") ? "danger" : "warn"}>
                      {alerts.length}
                    </Badge>
                  ) : null
                }
              />
              {alerts.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Tudo em dia"
                  description="Nenhuma pendência financeira ou operacional no momento."
                />
              ) : (
                <ul className="divide-y divide-ink-800">
                  {alerts.map((alert) => (
                    <li key={alert.id}>
                      <Link
                        href={alert.href}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-ink-850 sm:px-5"
                      >
                        <span
                          className={cn(
                            "mt-1 grid size-7 shrink-0 place-items-center rounded-lg border",
                            TONE_CLASS[alert.tone],
                          )}
                        >
                          <AlertTriangle className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-fog-100">
                            {alert.title}
                          </span>
                          <span className="block text-xs text-fog-400">{alert.description}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* ---------- Gráficos secundários ---------- */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Serviços mais vendidos" subtitle={monthLabel} />
              <CardBody>
                {view.topServices.length ? (
                  <HorizontalBarChart data={view.topServices} />
                ) : (
                  <EmptyState title="Sem serviços no período" />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Status das ordens de serviço" subtitle={monthLabel} />
              <CardBody>
                {view.statusData.length ? (
                  <DonutChart data={view.statusData} currency={false} />
                ) : (
                  <EmptyState title="Nenhuma OS no período" />
                )}
              </CardBody>
            </Card>

            {showFinancial ? (
              <Card>
                <CardHeader title="Formas de pagamento" subtitle={`Recebido em ${monthLabel}`} />
                <CardBody>
                  {view.methodData.length ? (
                    <DonutChart data={view.methodData} />
                  ) : (
                    <EmptyState title="Nenhum recebimento no período" />
                  )}
                </CardBody>
              </Card>
            ) : null}

            <Card>
              <CardHeader title="Clientes com maior faturamento" subtitle={monthLabel} />
              <CardBody>
                {view.topCustomers.length ? (
                  <HorizontalBarChart data={view.topCustomers} color="#5aa9f0" />
                ) : (
                  <EmptyState title="Sem faturamento no período" />
                )}
              </CardBody>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader
                title="Evolução do ticket médio"
                subtitle="Valor médio por ordem de serviço nos últimos 12 meses"
              />
              <CardBody className="pl-1 sm:pl-2">
                <TrendAreaChart data={view.series} dataKey="ticket" name="Ticket médio" />
              </CardBody>
            </Card>
          </div>

          {/* ---------- Últimas OS ---------- */}
          <Card>
            <CardHeader
              title="Últimas ordens de serviço"
              action={
                <Link href="/ordens" className="text-sm font-medium text-amber-brand hover:underline">
                  Ver todas
                </Link>
              }
            />
            {recentOrders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma ordem de serviço ainda"
                description="Abra a primeira OS para começar a registrar os atendimentos."
              />
            ) : (
              <ul className="divide-y divide-ink-800">
                {recentOrders.map((order) => {
                  const customer = data.customers.find((c) => c.id === order.customer_id);
                  const vehicle = data.vehicles.find((v) => v.id === order.vehicle_id);
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/ordens/${order.id}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-850 sm:px-5"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-800 text-[11px] font-bold text-fog-300">
                          {initials(customer?.name ?? "?")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fog-100">
                            OS #{order.order_number} · {customer?.name ?? "—"}
                          </span>
                          <span className="block truncate text-xs text-fog-400">
                            {vehicle
                              ? `${formatPlate(vehicle.plate)} · ${vehicle.brand ?? ""} ${vehicle.model ?? ""}`
                              : "Sem veículo"}{" "}
                            · {formatDate(order.opened_at)}
                          </span>
                        </span>
                        <span className="hidden sm:block">
                          <WorkOrderStatusBadge status={order.status} short />
                        </span>
                        <span className="tabular shrink-0 text-sm font-semibold text-fog-100">
                          {formatCurrency(order.total)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
