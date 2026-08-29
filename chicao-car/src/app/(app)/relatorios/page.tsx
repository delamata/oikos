"use client";

import * as React from "react";
import { format } from "date-fns";
import { BarChart3, FileDown, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { ShareButton } from "@/components/ui/share-button";
import { CustomerSelector, SupplierSelector } from "@/components/forms/selectors";
import {
  DateRangeFilter,
  rangeFromPreset,
  type RangePreset,
} from "@/components/ui/date-range-filter";
import { cn } from "@/lib/utils/cn";
import { useData } from "@/lib/data/provider";
import { savePdf } from "@/services/pdf/document";
import { reportMessage } from "@/services/whatsapp/messages";
import {
  PAYMENT_METHOD_FILTER_OPTIONS,
  REPORTS,
  REPORT_GROUPS,
  findReport,
  type ReportFilters,
} from "@/features/reports/registry";
import {
  ENTRY_STATUS_OPTIONS,
  EXPENSE_CATEGORIES,
  REVENUE_CATEGORIES,
  WORK_ORDER_STATUS_OPTIONS,
} from "@/lib/constants";
import { formatDate, formatPlate } from "@/lib/utils/format";

export default function ReportsPage() {
  const data = useData();
  const [reportId, setReportId] = React.useState(REPORTS[0].id);
  const [preset, setPreset] = React.useState<RangePreset>("month");
  const [range, setRange] = React.useState(() => rangeFromPreset("month"));
  const [customerId, setCustomerId] = React.useState("");
  const [supplierId, setSupplierId] = React.useState("");
  const [vehicleId, setVehicleId] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [granularity, setGranularity] = React.useState<ReportFilters["granularity"]>("day");

  const report = findReport(reportId) ?? REPORTS[0];
  const filters = React.useMemo<ReportFilters>(
    () => ({ range, customerId, supplierId, vehicleId, status, category, method, granularity }),
    [range, customerId, supplierId, vehicleId, status, category, method, granularity],
  );

  const result = React.useMemo(() => report.build(data, filters), [report, data, filters]);

  const uses = (key: string) => report.filters.includes(key as never);
  const isExpenseReport = report.id.includes("despesa") || report.group === "Fornecedores";
  const isOrderReport = report.group === "Oficina";

  const periodLabel = `${formatDate(range.from)} a ${formatDate(range.to)}`;

  const printUrl = React.useMemo(() => {
    const params = new URLSearchParams({
      id: report.id,
      from: format(range.from, "yyyy-MM-dd"),
      to: format(range.to, "yyyy-MM-dd"),
      granularity,
    });
    if (customerId) params.set("customer", customerId);
    if (supplierId) params.set("supplier", supplierId);
    if (vehicleId) params.set("vehicle", vehicleId);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (method) params.set("method", method);
    return `/imprimir/relatorio?${params.toString()}`;
  }, [report.id, range, customerId, supplierId, vehicleId, status, category, method, granularity]);

  function downloadPdf() {
    savePdf({
      settings: data.settings,
      title: report.name,
      reference: periodLabel,
      tables: [
        {
          head: result.columns.map((column) => column.header),
          body: result.rows,
          align: result.columns.map((column) => column.align ?? "left"),
        },
      ],
      totals: result.totals,
      fileName: `relatorio-${report.id}.pdf`,
    });
  }

  const shareText = reportMessage(
    `${report.name} (${periodLabel})`,
    result.summary,
    data.settings,
  );

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Central de relatórios financeiros, comerciais, de oficina e de fornecedores"
        actions={
          <>
            <Button variant="secondary" asChild>
              <a href={printUrl} target="_blank" rel="noopener noreferrer">
                <Printer /> Imprimir
              </a>
            </Button>
            <Button variant="secondary" onClick={downloadPdf}>
              <FileDown /> PDF
            </Button>
            <ShareButton
              onPrint={() => window.open(printUrl, "_blank")}
              onPdf={downloadPdf}
              whatsapp={{ phone: null, message: shareText }}
              email={{
                to: data.settings.email ?? "",
                subject: `${data.settings.company_name} — ${report.name}`,
                text: [`${report.name} · ${periodLabel}`, "", ...result.summary].join("\n"),
              }}
            />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        {/* seletor de relatório */}
        <Card className="h-fit">
          <CardHeader title="Relatório" />
          <CardBody className="space-y-4">
            {REPORT_GROUPS.map((group) => (
              <div key={group}>
                <p className="label-caps mb-1.5">{group}</p>
                <ul className="space-y-0.5">
                  {REPORTS.filter((item) => item.group === group).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setReportId(item.id)}
                        className={cn(
                          "w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                          item.id === reportId
                            ? "bg-amber-brand/10 font-medium text-amber-brand"
                            : "text-fog-300 hover:bg-ink-800 hover:text-fog-100",
                        )}
                      >
                        {item.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Filtros" subtitle={report.description} />
            <CardBody className="space-y-3">
              {uses("period") ? (
                <DateRangeFilter
                  preset={preset}
                  range={range}
                  onChange={(nextPreset, nextRange) => {
                    setPreset(nextPreset);
                    setRange(nextRange);
                  }}
                />
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {uses("customer") ? (
                  <Field label="Cliente">
                    <CustomerSelector value={customerId || null} onChange={setCustomerId} />
                  </Field>
                ) : null}
                {uses("supplier") ? (
                  <Field label="Fornecedor">
                    <SupplierSelector value={supplierId || null} onChange={setSupplierId} />
                  </Field>
                ) : null}
                {uses("vehicle") ? (
                  <Field label="Veículo">
                    <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                      <option value="">Todos os veículos</option>
                      {data.vehicles
                        .filter((vehicle) => !customerId || vehicle.customer_id === customerId)
                        .map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {formatPlate(vehicle.plate)} — {vehicle.brand} {vehicle.model}
                          </option>
                        ))}
                    </Select>
                  </Field>
                ) : null}
                {uses("status") ? (
                  <Field label="Situação">
                    <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="">Todas</option>
                      {(isOrderReport ? WORK_ORDER_STATUS_OPTIONS : ENTRY_STATUS_OPTIONS).map(
                        (option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ),
                      )}
                    </Select>
                  </Field>
                ) : null}
                {uses("category") ? (
                  <Field label="Categoria">
                    <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">Todas</option>
                      {(isExpenseReport ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                {uses("method") ? (
                  <Field label="Forma de pagamento">
                    <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                      <option value="">Todas</option>
                      {PAYMENT_METHOD_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                {uses("granularity") ? (
                  <Field label="Agrupar por">
                    <Select
                      value={granularity}
                      onChange={(e) =>
                        setGranularity(e.target.value as ReportFilters["granularity"])
                      }
                    >
                      <option value="day">Dia</option>
                      <option value="week">Semana</option>
                      <option value="month">Mês</option>
                    </Select>
                  </Field>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={report.name}
              subtitle={`${periodLabel} · ${result.rows.length} linha(s)`}
            />
            {result.rows.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="Sem dados para os filtros escolhidos"
                description="Amplie o período ou remova algum filtro."
              />
            ) : (
              <>
                <div className="scroll-x">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-ink-700">
                        {result.columns.map((column) => (
                          <th
                            key={column.header}
                            className="label-caps px-4 py-2.5 whitespace-nowrap"
                            style={{ textAlign: column.align ?? "left" }}
                          >
                            {column.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-800">
                      {result.rows.map((row, index) => (
                        <tr key={index} className="hover:bg-ink-850">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className={cn(
                                "px-4 py-2.5 text-fog-200",
                                result.columns[cellIndex]?.align === "right" && "tabular",
                              )}
                              style={{ textAlign: result.columns[cellIndex]?.align ?? "left" }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {result.totals?.length ? (
                  <div className="flex flex-wrap justify-end gap-x-8 gap-y-2 border-t border-ink-700 px-4 py-3.5">
                    {result.totals.map(([label, value]) => (
                      <div key={label} className="text-right">
                        <p className="label-caps">{label}</p>
                        <p className="tabular text-lg font-bold text-fog-100">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
