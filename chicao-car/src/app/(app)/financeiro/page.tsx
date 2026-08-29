"use client";

import * as React from "react";
import Link from "next/link";
import { subMonths } from "date-fns";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EntryStatusBadge } from "@/components/ui/status-badge";
import {
  DateRangeFilter,
  rangeFromPreset,
  type RangePreset,
} from "@/components/ui/date-range-filter";
import { DonutChart, RevenueExpenseChart } from "@/components/dashboard/charts";
import { useData } from "@/lib/data/provider";
import {
  buildMonthlySeries,
  inPeriod,
  summarizeFinancials,
  sum,
} from "@/lib/domain/financial";
import { PAYMENT_METHOD } from "@/lib/constants";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils/format";

export default function FinancialOverviewPage() {
  const data = useData();
  const [preset, setPreset] = React.useState<RangePreset>("month");
  const [range, setRange] = React.useState(() => rangeFromPreset("month"));

  const view = React.useMemo(() => {
    const summary = summarizeFinancials(data.revenues, data.expenses, range);

    const months = Array.from({ length: 6 }, (_, i) => subMonths(range.to, 5 - i));
    const series = buildMonthlySeries(
      data.revenues,
      data.expenses,
      data.work_orders
        .filter((order) => order.status !== "cancelled")
        .map((order) => ({ date: order.opened_at, total: order.total })),
      months,
    );

    const methodTotals = new Map<string, number>();
    for (const payment of data.payments) {
      if (!payment.revenue_id || !inPeriod(payment.paid_at, range)) continue;
      const label = PAYMENT_METHOD[payment.payment_method];
      methodTotals.set(label, (methodTotals.get(label) ?? 0) + payment.amount);
    }

    const expenseByCategory = new Map<string, number>();
    for (const expense of data.expenses) {
      if (expense.status === "cancelled" || !inPeriod(expense.due_date, range)) continue;
      const label = expense.category ?? "Outros";
      expenseByCategory.set(label, (expenseByCategory.get(label) ?? 0) + expense.amount);
    }

    const upcomingReceivables = data.revenues
      .filter((revenue) => revenue.status !== "paid" && revenue.status !== "cancelled")
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 6);
    const upcomingPayables = data.expenses
      .filter((expense) => expense.status !== "paid" && expense.status !== "cancelled")
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 6);

    const margin =
      summary.revenueAccrued > 0 ? (summary.result / summary.revenueAccrued) * 100 : 0;

    return {
      summary,
      series,
      margin,
      methodData: [...methodTotals.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      categoryData: [...expenseByCategory.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7),
      upcomingReceivables,
      upcomingPayables,
      cashIn: sum(
        data.revenues
          .filter((r) => r.status !== "cancelled" && inPeriod(r.payment_date, range))
          .map((r) => r.paid_amount),
      ),
    };
  }, [data.revenues, data.expenses, data.payments, data.work_orders, range]);

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Resumo do período, contas em aberto e composição do resultado"
      >
        <DateRangeFilter
          preset={preset}
          range={range}
          onChange={(nextPreset, nextRange) => {
            setPreset(nextPreset);
            setRange(nextRange);
          }}
        />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Receitas"
          value={formatCurrency(view.summary.revenueAccrued)}
          hint={`Recebido ${formatCurrency(view.summary.revenueReceived)}`}
          icon={ArrowUpRight}
          tone="ok"
          href="/financeiro/receitas"
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(view.summary.expenseAccrued)}
          hint={`Pago ${formatCurrency(view.summary.expensePaid)}`}
          icon={ArrowDownRight}
          tone="danger"
          href="/financeiro/despesas"
        />
        <StatCard
          label="Resultado"
          value={formatCurrency(view.summary.result)}
          hint={`Margem de ${formatPercent(view.margin)}`}
          icon={TrendingUp}
          tone={view.summary.result >= 0 ? "ok" : "danger"}
        />
        <StatCard
          label="Saldo de caixa do período"
          value={formatCurrency(view.summary.cashResult)}
          hint="Entradas menos saídas efetivas"
          icon={PiggyBank}
          tone="info"
          href="/financeiro/fluxo-de-caixa"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Contas a receber"
          value={formatCurrency(view.summary.receivable)}
          hint="Total em aberto"
          icon={Receipt}
          tone="warn"
          href="/financeiro/contas-a-receber"
        />
        <StatCard
          label="Contas a pagar"
          value={formatCurrency(view.summary.payable)}
          hint="Total em aberto"
          icon={Wallet}
          tone="warn"
          href="/financeiro/contas-a-pagar"
        />
        <StatCard
          label="Inadimplência"
          value={formatPercent(view.summary.defaultRate)}
          hint={`${formatCurrency(view.summary.receivableOverdue)} vencido`}
          icon={AlertTriangle}
          tone={view.summary.receivableOverdue > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Entrou no caixa"
          value={formatCurrency(view.cashIn)}
          hint="Recebimentos no período"
          icon={Banknote}
          tone="ok"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Receita x Despesa" subtitle="Últimos 6 meses por competência" />
          <CardBody className="pl-1 sm:pl-2">
            <RevenueExpenseChart data={view.series} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Despesas por categoria" subtitle="No período selecionado" />
          <CardBody>
            {view.categoryData.length ? (
              <DonutChart data={view.categoryData} />
            ) : (
              <EmptyState title="Nenhuma despesa no período" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Formas de pagamento" subtitle="Recebimentos do período" />
          <CardBody>
            {view.methodData.length ? (
              <DonutChart data={view.methodData} />
            ) : (
              <EmptyState title="Nenhum recebimento no período" />
            )}
          </CardBody>
        </Card>

        <div className="grid gap-4">
          <UpcomingCard
            title="Próximos recebimentos"
            href="/financeiro/contas-a-receber"
            entries={view.upcomingReceivables}
          />
          <UpcomingCard
            title="Próximos pagamentos"
            href="/financeiro/contas-a-pagar"
            entries={view.upcomingPayables}
          />
        </div>
      </div>
    </>
  );
}

function UpcomingCard({
  title,
  href,
  entries,
}: {
  title: string;
  href: string;
  entries: { id: string; description: string; due_date: string; amount: number; paid_amount: number; status: "pending" | "paid" | "overdue" | "cancelled" }[];
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <Link href={href} className="text-sm font-medium text-amber-brand hover:underline">
            Ver todos
          </Link>
        }
      />
      {entries.length === 0 ? (
        <EmptyState title="Nada em aberto" />
      ) : (
        <ul className="divide-y divide-ink-800">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fog-100">{entry.description}</p>
                <p className="tabular text-xs text-fog-400">Vence em {formatDate(entry.due_date)}</p>
              </div>
              <EntryStatusBadge status={entry.status} />
              <span className="tabular shrink-0 text-sm font-semibold text-fog-100">
                {formatCurrency(entry.amount - entry.paid_amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
