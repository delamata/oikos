"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { endOfDay, startOfDay } from "date-fns";
import { PrintLayout } from "@/components/print/print-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useData } from "@/lib/data/provider";
import { findReport, type ReportFilters } from "@/features/reports/registry";
import { formatDate } from "@/lib/utils/format";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportPrint />
    </Suspense>
  );
}

function ReportPrint() {
  const params = useSearchParams();
  const data = useData();

  const report = findReport(params.get("id") ?? "");
  if (data.loading) return <LoadingState />;
  if (!report) return <EmptyState title="Relatório não encontrado" />;

  const from = params.get("from");
  const to = params.get("to");
  const filters: ReportFilters = {
    range: {
      from: from ? startOfDay(new Date(`${from}T12:00`)) : startOfDay(new Date()),
      to: to ? endOfDay(new Date(`${to}T12:00`)) : endOfDay(new Date()),
    },
    customerId: params.get("customer") ?? "",
    supplierId: params.get("supplier") ?? "",
    vehicleId: params.get("vehicle") ?? "",
    status: params.get("status") ?? "",
    category: params.get("category") ?? "",
    method: params.get("method") ?? "",
    granularity: (params.get("granularity") as ReportFilters["granularity"]) ?? "day",
  };

  const result = report.build(data, filters);

  return (
    <PrintLayout
      settings={data.settings}
      title={report.name}
      reference={`${formatDate(filters.range.from)} a ${formatDate(filters.range.to)}`}
      blocks={[
        {
          title: "Parâmetros do relatório",
          rows: [
            ["Relatório", report.name],
            ["Período", `${formatDate(filters.range.from)} a ${formatDate(filters.range.to)}`],
            [
              "Cliente",
              data.customers.find((c) => c.id === filters.customerId)?.name ?? "Todos",
            ],
            [
              "Fornecedor",
              data.suppliers.find((s) => s.id === filters.supplierId)?.company_name ?? "Todos",
            ],
          ],
        },
      ]}
      tables={[
        {
          head: result.columns.map((column) => column.header),
          rows: result.rows,
          align: result.columns.map((column) => column.align ?? "left"),
        },
      ]}
      totals={result.totals}
    />
  );
}
