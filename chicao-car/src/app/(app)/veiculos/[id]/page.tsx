"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Car,
  ClipboardList,
  Gauge,
  Package,
  Pencil,
  Plus,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { WorkOrderStatusBadge } from "@/components/ui/status-badge";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { TrendAreaChart } from "@/components/dashboard/charts";
import { VehicleFormDialog } from "@/features/vehicles/vehicle-form";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { FUEL_TYPE } from "@/lib/constants";
import { buildRecommendations } from "@/lib/domain/maintenance";
import {
  formatCurrency,
  formatDate,
  formatMileage,
  formatNumber,
  formatPlate,
} from "@/lib/utils/format";
import type { WorkOrder } from "@/types";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useData();
  const { profile } = useAuth();
  const [editOpen, setEditOpen] = React.useState(false);

  const vehicle = data.vehicles.find((v) => v.id === id) ?? null;

  const view = React.useMemo(() => {
    if (!vehicle) return null;
    const owner = data.customers.find((c) => c.id === vehicle.customer_id) ?? null;
    const orders = data.work_orders
      .filter((o) => o.vehicle_id === vehicle.id)
      .sort((a, b) => b.order_number - a.order_number);
    const valid = orders.filter((o) => o.status !== "cancelled");
    const orderIds = new Set(valid.map((o) => o.id));
    const services = data.work_order_services.filter((s) => orderIds.has(s.work_order_id));
    const products = data.work_order_products.filter((p) => orderIds.has(p.work_order_id));

    const mileageHistory = [...valid]
      .filter((order) => order.current_mileage != null)
      .sort((a, b) => a.opened_at.localeCompare(b.opened_at))
      .map((order) => ({
        label: formatDate(order.opened_at),
        km: order.current_mileage ?? 0,
      }));

    return {
      owner,
      orders,
      valid,
      services,
      products,
      mileageHistory,
      spent: valid.reduce((total, order) => total + order.total, 0),
      lastVisit: valid.map((o) => o.opened_at).sort().at(-1),
      recommendations: buildRecommendations(vehicle, valid, data.work_order_services),
    };
  }, [vehicle, data.customers, data.work_orders, data.work_order_services, data.work_order_products]);

  if (data.loading) return <LoadingState />;
  if (!vehicle || !view) {
    return (
      <EmptyState
        icon={Car}
        title="Veículo não encontrado"
        action={
          <Button asChild variant="secondary">
            <Link href="/veiculos">Voltar para veículos</Link>
          </Button>
        }
      />
    );
  }

  const orderColumns: Column<WorkOrder>[] = [
    {
      key: "number",
      header: "OS",
      cell: (order) => <span className="tabular font-semibold">#{order.order_number}</span>,
    },
    { key: "date", header: "Data", cell: (order) => formatDate(order.opened_at) },
    {
      key: "km",
      header: "KM",
      align: "right",
      hideBelow: "lg",
      cell: (order) => <span className="tabular">{formatMileage(order.current_mileage)}</span>,
    },
    {
      key: "complaint",
      header: "Reclamação",
      hideBelow: "xl",
      cell: (order) => (
        <span className="line-clamp-1 text-fog-300">{order.customer_complaint ?? "—"}</span>
      ),
    },
    { key: "status", header: "Status", cell: (order) => <WorkOrderStatusBadge status={order.status} short /> },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (order) => <span className="tabular font-semibold">{formatCurrency(order.total)}</span>,
    },
  ];

  const serviceCounts = new Map<string, { count: number; total: number; last: string }>();
  for (const item of view.services) {
    const order = view.valid.find((o) => o.id === item.work_order_id);
    const previous = serviceCounts.get(item.description);
    serviceCounts.set(item.description, {
      count: (previous?.count ?? 0) + item.quantity,
      total: (previous?.total ?? 0) + item.total,
      last:
        previous && previous.last > (order?.opened_at ?? "")
          ? previous.last
          : (order?.opened_at ?? ""),
    });
  }

  const partCounts = new Map<string, { count: number; total: number; last: string }>();
  for (const item of view.products) {
    const order = view.valid.find((o) => o.id === item.work_order_id);
    const previous = partCounts.get(item.description);
    partCounts.set(item.description, {
      count: (previous?.count ?? 0) + item.quantity,
      total: (previous?.total ?? 0) + item.total,
      last:
        previous && previous.last > (order?.opened_at ?? "")
          ? previous.last
          : (order?.opened_at ?? ""),
    });
  }

  return (
    <>
      <PageHeader
        backHref="/veiculos"
        title={
          <span className="tabular flex flex-wrap items-center gap-3">
            {formatPlate(vehicle.plate)}
            <span className="font-sans text-base font-medium text-fog-300">
              {[vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ")}
            </span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {view.owner ? (
              <Link href={`/clientes/${view.owner.id}`} className="text-amber-brand hover:underline">
                {view.owner.name}
              </Link>
            ) : (
              "Sem proprietário"
            )}
            {vehicle.year ? <span>{vehicle.year}{vehicle.model_year ? `/${vehicle.model_year}` : ""}</span> : null}
            {vehicle.color ? <span>{vehicle.color}</span> : null}
            {vehicle.fuel_type ? <span>{FUEL_TYPE[vehicle.fuel_type]}</span> : null}
          </span>
        }
        actions={
          <>
            {can(profile?.role, "vehicles:write") ? (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil /> Editar
              </Button>
            ) : null}
            {can(profile?.role, "work_orders:write") ? (
              <Button asChild>
                <Link href={`/ordens/nova?veiculo=${vehicle.id}`}>
                  <Plus /> Nova OS
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="KM atual" value={formatMileage(vehicle.mileage)} icon={Gauge} tone="info" />
        <StatCard label="Última manutenção" value={formatDate(view.lastVisit)} icon={Wrench} tone="accent" />
        <StatCard label="Atendimentos" value={view.valid.length} icon={ClipboardList} hint="OS não canceladas" />
        <StatCard label="Gasto acumulado" value={formatCurrency(view.spent)} icon={Package} tone="ok" />
      </div>

      {view.recommendations.length > 0 ? (
        <Card className="mt-4 border-warn/30">
          <CardHeader title="Próximas recomendações" subtitle="Baseadas no histórico do veículo" />
          <CardBody className="grid gap-2.5 sm:grid-cols-2">
            {view.recommendations.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-ink-700 bg-ink-850 p-3"
              >
                <AlertTriangle
                  className={item.urgency === "due" ? "mt-0.5 size-4 shrink-0 text-danger" : "mt-0.5 size-4 shrink-0 text-warn"}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fog-100">{item.title}</p>
                  <p className="text-xs text-fog-400">{item.detail}</p>
                </div>
                <Badge tone={item.urgency === "due" ? "danger" : "warn"} className="ml-auto shrink-0">
                  {item.urgency === "due" ? "Vencida" : "Em breve"}
                </Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader title="Prontuário — ordens de serviço" />
          <DataTable
            data={view.orders}
            columns={orderColumns}
            getRowId={(order) => order.id}
            onRowClick={(order) => router.push(`/ordens/${order.id}`)}
            empty={<EmptyState icon={ClipboardList} title="Nenhum atendimento registrado" />}
            mobileCard={(order) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="tabular font-semibold text-fog-100">#{order.order_number}</span>
                  <WorkOrderStatusBadge status={order.status} short />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <CardField label="Data" value={formatDate(order.opened_at)} />
                  <CardField label="KM" value={formatMileage(order.current_mileage)} />
                  <CardField label="Total" value={formatCurrency(order.total)} />
                </div>
              </div>
            )}
          />
        </Card>

        <Card>
          <CardHeader title="Serviços realizados" subtitle="Consolidado por tipo de serviço" />
          {serviceCounts.size === 0 ? (
            <EmptyState icon={Wrench} title="Nenhum serviço registrado" />
          ) : (
            <ul className="divide-y divide-ink-800">
              {[...serviceCounts.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([name, info]) => (
                  <li key={name} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fog-100">{name}</p>
                      <p className="text-xs text-fog-400">
                        {formatNumber(info.count)}× · última em {formatDate(info.last)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold text-fog-100">
                      {formatCurrency(info.total)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Peças substituídas" />
          {partCounts.size === 0 ? (
            <EmptyState icon={Package} title="Nenhuma peça registrada" />
          ) : (
            <ul className="divide-y divide-ink-800">
              {[...partCounts.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([name, info]) => (
                  <li key={name} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fog-100">{name}</p>
                      <p className="text-xs text-fog-400">
                        {formatNumber(info.count)} un. · última em {formatDate(info.last)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold text-fog-100">
                      {formatCurrency(info.total)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        {view.mileageHistory.length > 1 ? (
          <Card className="xl:col-span-2">
            <CardHeader title="Histórico de quilometragem" subtitle="KM registrada em cada passagem pela oficina" />
            <CardBody className="pl-1 sm:pl-2">
              <TrendAreaChart
                data={view.mileageHistory}
                dataKey="km"
                name="Quilometragem"
                currency={false}
                color="#5aa9f0"
              />
            </CardBody>
          </Card>
        ) : null}
      </div>

      <VehicleFormDialog open={editOpen} onOpenChange={setEditOpen} vehicle={vehicle} />
    </>
  );
}
