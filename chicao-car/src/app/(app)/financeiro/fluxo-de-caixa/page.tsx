"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { TrendAreaChart } from "@/components/dashboard/charts";
import {
  DateRangeFilter,
  rangeFromPreset,
  type RangePreset,
} from "@/components/ui/date-range-filter";
import { useData } from "@/lib/data/provider";
import { balanceUntil, buildCashFlow, sum, type Granularity } from "@/lib/domain/financial";
import { formatCurrency } from "@/lib/utils/format";

export default function CashFlowPage() {
  const data = useData();
  const [preset, setPreset] = React.useState<RangePreset>("30d");
  const [range, setRange] = React.useState(() => rangeFromPreset("30d"));
  const [granularity, setGranularity] = React.useState<Granularity>("day");

  const view = React.useMemo(() => {
    const opening = balanceUntil(data.revenues, data.expenses, range.from);
    const buckets = buildCashFlow(data.revenues, data.expenses, range, granularity, opening);
    return {
      opening,
      buckets,
      inflow: sum(buckets.map((b) => b.inflow)),
      outflow: sum(buckets.map((b) => b.outflow)),
      closing: buckets.at(-1)?.balance ?? opening,
    };
  }, [data.revenues, data.expenses, range, granularity]);

  type Bucket = (typeof view.buckets)[number];

  const columns: Column<Bucket>[] = [
    { key: "label", header: "Período", cell: (bucket) => <span className="tabular">{bucket.label}</span> },
    {
      key: "inflow",
      header: "Entradas",
      align: "right",
      cell: (bucket) => (
        <span className={bucket.inflow > 0 ? "tabular text-ok" : "tabular text-fog-400"}>
          {formatCurrency(bucket.inflow)}
        </span>
      ),
    },
    {
      key: "outflow",
      header: "Saídas",
      align: "right",
      cell: (bucket) => (
        <span className={bucket.outflow > 0 ? "tabular text-danger" : "tabular text-fog-400"}>
          {formatCurrency(bucket.outflow)}
        </span>
      ),
    },
    {
      key: "net",
      header: "Resultado",
      align: "right",
      hideBelow: "lg",
      cell: (bucket) => (
        <span className={bucket.net >= 0 ? "tabular text-fog-200" : "tabular text-danger"}>
          {formatCurrency(bucket.net)}
        </span>
      ),
    },
    {
      key: "balance",
      header: "Saldo acumulado",
      align: "right",
      cell: (bucket) => (
        <span className="tabular font-semibold text-fog-100">{formatCurrency(bucket.balance)}</span>
      ),
    },
  ];

  const chartData = view.buckets.map((bucket) => ({ label: bucket.label, balance: bucket.balance }));

  return (
    <>
      <PageHeader
        title="Fluxo de caixa"
        subtitle="Entradas e saídas efetivas, com saldo acumulado no período"
      >
        <div className="flex flex-col gap-2 lg:flex-row">
          <DateRangeFilter
            preset={preset}
            range={range}
            onChange={(nextPreset, nextRange) => {
              setPreset(nextPreset);
              setRange(nextRange);
            }}
            className="flex-1"
          />
          <Select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
            className="lg:w-44"
          >
            <option value="day">Por dia</option>
            <option value="week">Por semana</option>
            <option value="month">Por mês</option>
          </Select>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Saldo inicial" value={formatCurrency(view.opening)} tone="neutral" />
        <StatCard
          label="Entradas"
          value={formatCurrency(view.inflow)}
          icon={ArrowUpRight}
          tone="ok"
        />
        <StatCard
          label="Saídas"
          value={formatCurrency(view.outflow)}
          icon={ArrowDownRight}
          tone="danger"
        />
        <StatCard
          label="Saldo final"
          value={formatCurrency(view.closing)}
          icon={Wallet}
          tone={view.closing >= 0 ? "info" : "danger"}
        />
      </div>

      <Card className="mt-4">
        <CardHeader title="Evolução do saldo" subtitle="Saldo acumulado ao longo do período" />
        <CardBody className="pl-1 sm:pl-2">
          {chartData.length > 1 ? (
            <TrendAreaChart data={chartData} dataKey="balance" name="Saldo" color="#3fbf87" />
          ) : (
            <EmptyState title="Período curto demais para o gráfico" />
          )}
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Movimentação" />
        <DataTable
          data={view.buckets}
          columns={columns}
          getRowId={(bucket) => bucket.key}
          empty={<EmptyState icon={Wallet} title="Sem movimentação no período" />}
          mobileCard={(bucket) => (
            <div className="space-y-2">
              <p className="tabular font-medium text-fog-100">{bucket.label}</p>
              <div className="grid grid-cols-3 gap-2">
                <CardField label="Entradas" value={formatCurrency(bucket.inflow)} />
                <CardField label="Saídas" value={formatCurrency(bucket.outflow)} />
                <CardField label="Saldo" value={formatCurrency(bucket.balance)} />
              </div>
            </div>
          )}
        />
      </Card>
    </>
  );
}
