"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { PaymentStatusBadge, WorkOrderStatusBadge } from "@/components/ui/status-badge";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import {
  IN_SHOP_STATUS,
  OPEN_WORK_ORDER_STATUS,
  WORK_ORDER_STATUS_OPTIONS,
} from "@/lib/constants";
import { formatCurrency, formatDate, formatPlate, normalize } from "@/lib/utils/format";
import type { WorkOrderStatus } from "@/types";

export default function WorkOrdersPage() {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "work_orders:write");

  const [term, setTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(params.get("status") ?? "abertas");
  const [mechanic, setMechanic] = React.useState("");

  const rows = React.useMemo(() => {
    const q = normalize(term);
    const plateQuery = term.toUpperCase().replace(/[^A-Z0-9]/g, "");

    return data.work_orders
      .map((order) => ({
        order,
        customer: data.customers.find((c) => c.id === order.customer_id) ?? null,
        vehicle: data.vehicles.find((v) => v.id === order.vehicle_id) ?? null,
        mechanic: data.profiles.find((p) => p.id === order.mechanic_id) ?? null,
      }))
      .filter(({ order, customer, vehicle }) => {
        if (statusFilter === "abertas" && !OPEN_WORK_ORDER_STATUS.includes(order.status)) return false;
        if (statusFilter === "patio" && !IN_SHOP_STATUS.includes(order.status)) return false;
        if (
          statusFilter !== "abertas" &&
          statusFilter !== "patio" &&
          statusFilter !== "todas" &&
          order.status !== statusFilter
        ) {
          return false;
        }
        if (mechanic && order.mechanic_id !== mechanic) return false;
        if (!q) return true;
        return (
          String(order.order_number).includes(term.replace(/\D/g, "")) ||
          normalize(customer?.name ?? "").includes(q) ||
          (plateQuery.length >= 2 && (vehicle?.plate ?? "").includes(plateQuery)) ||
          normalize(`${vehicle?.brand ?? ""} ${vehicle?.model ?? ""}`).includes(q)
        );
      })
      .sort((a, b) => b.order.order_number - a.order.order_number);
  }, [data.work_orders, data.customers, data.vehicles, data.profiles, term, statusFilter, mechanic]);

  const stats = React.useMemo(() => {
    const open = data.work_orders.filter((o) => OPEN_WORK_ORDER_STATUS.includes(o.status));
    return {
      open: open.length,
      awaiting: data.work_orders.filter((o) => o.status === "awaiting_approval").length,
      inShop: data.work_orders.filter((o) => IN_SHOP_STATUS.includes(o.status)).length,
      openValue: open.reduce((total, order) => total + order.total, 0),
    };
  }, [data.work_orders]);

  type Row = (typeof rows)[number];

  const columns: Column<Row>[] = [
    {
      key: "number",
      header: "OS",
      width: "84px",
      cell: (row) => (
        <span className="tabular font-semibold text-fog-100">#{row.order.order_number}</span>
      ),
    },
    {
      key: "customer",
      header: "Cliente / veículo",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-fog-100">{row.customer?.name ?? "—"}</p>
          <p className="tabular truncate text-xs text-fog-400">
            {row.vehicle
              ? `${formatPlate(row.vehicle.plate)} · ${row.vehicle.brand ?? ""} ${row.vehicle.model ?? ""}`
              : "—"}
          </p>
        </div>
      ),
    },
    {
      key: "opened",
      header: "Abertura",
      hideBelow: "lg",
      cell: (row) => <span className="tabular text-sm">{formatDate(row.order.opened_at)}</span>,
    },
    {
      key: "mechanic",
      header: "Mecânico",
      hideBelow: "xl",
      cell: (row) => row.mechanic?.name ?? "—",
    },
    { key: "status", header: "Status", cell: (row) => <WorkOrderStatusBadge status={row.order.status} /> },
    {
      key: "payment",
      header: "Pagamento",
      hideBelow: "lg",
      cell: (row) => <PaymentStatusBadge status={row.order.payment_status} />,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => (
        <span className="tabular font-semibold text-fog-100">{formatCurrency(row.order.total)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Ordens de Serviço"
        subtitle={`${rows.length} OS listada(s)`}
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/ordens/nova">
                <Plus /> Nova OS
              </Link>
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-2 lg:flex-row">
          <SearchInput
            value={term}
            onChange={setTerm}
            placeholder="Buscar por número, cliente ou placa…"
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              router.replace(`/ordens?status=${e.target.value}`);
            }}
            className="lg:w-56"
          >
            <option value="abertas">Em aberto</option>
            <option value="patio">No pátio</option>
            <option value="todas">Todas</option>
            {WORK_ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={mechanic}
            onChange={(e) => setMechanic(e.target.value)}
            className="lg:w-52"
          >
            <option value="">Todos os mecânicos</option>
            {data.profiles
              .filter((p) => p.role === "mechanic")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </div>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="OS em aberto" value={stats.open} tone="accent" />
        <StatCard label="Aguardando aprovação" value={stats.awaiting} tone="warn" />
        <StatCard label="No pátio" value={stats.inShop} tone="violet" />
        <StatCard
          label="Valor em aberto"
          value={formatCurrency(stats.openValue)}
          hint="Soma das OS não finalizadas"
          tone="info"
        />
      </div>

      <Card>
        <DataTable
          data={rows}
          columns={columns}
          loading={data.loading}
          getRowId={(row) => row.order.id}
          onRowClick={(row) => router.push(`/ordens/${row.order.id}`)}
          empty={
            <EmptyState
              icon={ClipboardList}
              title={term ? "Nenhuma OS encontrada" : "Nenhuma ordem de serviço"}
              description={
                term
                  ? "Ajuste os filtros ou o termo de busca."
                  : "Abra a primeira OS para começar a registrar os atendimentos da oficina."
              }
              action={
                canWrite ? (
                  <Button asChild>
                    <Link href="/ordens/nova">
                      <Plus /> Abrir nova OS
                    </Link>
                  </Button>
                ) : null
              }
            />
          }
          mobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular font-semibold text-fog-100">
                  #{row.order.order_number}
                </span>
                <WorkOrderStatusBadge status={row.order.status} short />
              </div>
              <p className="truncate text-sm text-fog-200">{row.customer?.name ?? "—"}</p>
              <div className="grid grid-cols-3 gap-2">
                <CardField
                  label="Placa"
                  value={row.vehicle ? formatPlate(row.vehicle.plate) : "—"}
                />
                <CardField label="Abertura" value={formatDate(row.order.opened_at)} />
                <CardField label="Total" value={formatCurrency(row.order.total)} />
              </div>
            </div>
          )}
        />
      </Card>
    </>
  );
}
