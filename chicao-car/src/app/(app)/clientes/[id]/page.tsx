"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Car,
  ClipboardList,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Trash2,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { EntryStatusBadge, WorkOrderStatusBadge } from "@/components/ui/status-badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { CustomerFormDialog } from "@/features/customers/customer-form";
import { VehicleFormDialog } from "@/features/vehicles/vehicle-form";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { OPEN_WORK_ORDER_STATUS } from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  formatDocument,
  formatPhone,
  formatPlate,
  formatZip,
} from "@/lib/utils/format";
import type { Revenue, Vehicle, WorkOrder } from "@/types";
import { toast } from "sonner";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useData();
  const { profile } = useAuth();
  const { confirm, dialog } = useConfirm();

  const canWrite = can(profile?.role, "customers:write");
  const canSeeFinancial = can(profile?.role, "financial:read");

  const [editOpen, setEditOpen] = React.useState(false);
  const [vehicleOpen, setVehicleOpen] = React.useState(false);
  const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(null);

  const customer = data.customers.find((c) => c.id === id) ?? null;

  const summary = React.useMemo(() => {
    if (!customer) return null;
    const vehicles = data.vehicles.filter((v) => v.customer_id === customer.id);
    const orders = data.work_orders
      .filter((o) => o.customer_id === customer.id)
      .sort((a, b) => b.order_number - a.order_number);
    const valid = orders.filter((o) => o.status !== "cancelled");
    const revenues = data.revenues
      .filter((r) => r.customer_id === customer.id && r.status !== "cancelled")
      .sort((a, b) => b.due_date.localeCompare(a.due_date));
    return {
      vehicles,
      orders,
      spent: valid.reduce((total, order) => total + order.total, 0),
      lastVisit: valid.map((o) => o.opened_at).sort().at(-1),
      open: orders.filter((o) => OPEN_WORK_ORDER_STATUS.includes(o.status)),
      done: valid.filter((o) => o.status === "delivered"),
      revenues,
      pending: revenues
        .filter((r) => r.status !== "paid")
        .reduce((total, r) => total + (r.amount - r.paid_amount), 0),
    };
  }, [customer, data.vehicles, data.work_orders, data.revenues]);

  if (data.loading) return <LoadingState />;
  if (!customer || !summary) {
    return (
      <EmptyState
        icon={User}
        title="Cliente não encontrado"
        description="O registro pode ter sido removido."
        action={
          <Button asChild variant="secondary">
            <Link href="/clientes">Voltar para clientes</Link>
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
    { key: "date", header: "Abertura", cell: (order) => formatDate(order.opened_at) },
    {
      key: "vehicle",
      header: "Veículo",
      hideBelow: "lg",
      cell: (order) => {
        const vehicle = data.vehicles.find((v) => v.id === order.vehicle_id);
        return vehicle ? `${formatPlate(vehicle.plate)} · ${vehicle.model ?? ""}` : "—";
      },
    },
    { key: "status", header: "Status", cell: (order) => <WorkOrderStatusBadge status={order.status} short /> },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (order) => <span className="tabular font-semibold">{formatCurrency(order.total)}</span>,
    },
  ];

  const revenueColumns: Column<Revenue>[] = [
    { key: "description", header: "Descrição", cell: (revenue) => revenue.description },
    { key: "due", header: "Vencimento", cell: (revenue) => formatDate(revenue.due_date) },
    { key: "status", header: "Situação", cell: (revenue) => <EntryStatusBadge status={revenue.status} /> },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      cell: (revenue) => (
        <div>
          <p className="tabular font-semibold">{formatCurrency(revenue.amount)}</p>
          {revenue.paid_amount > 0 && revenue.paid_amount < revenue.amount ? (
            <p className="tabular text-xs text-ok">Pago {formatCurrency(revenue.paid_amount)}</p>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        backHref="/clientes"
        title={customer.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {customer.document ? <span>{formatDocument(customer.document)}</span> : null}
            <span>Cliente desde {formatDate(customer.created_at)}</span>
            {!customer.active ? <Badge tone="neutral">Inativo</Badge> : null}
          </span>
        }
        actions={
          <>
            {customer.whatsapp ? (
              <WhatsAppButton
                phone={customer.whatsapp}
                message={`Olá, ${customer.name.split(" ")[0]}! Aqui é da ${data.settings.company_name}.`}
              />
            ) : null}
            {canWrite ? (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil /> Editar
              </Button>
            ) : null}
            {can(profile?.role, "work_orders:write") ? (
              <Button asChild>
                <Link href={`/ordens/nova?cliente=${customer.id}`}>
                  <Plus /> Nova OS
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total gasto" value={formatCurrency(summary.spent)} hint={`${summary.orders.length} OS no histórico`} tone="ok" />
        <StatCard label="Última visita" value={formatDate(summary.lastVisit)} hint={summary.lastVisit ? "Data de abertura da OS" : "Sem atendimentos"} tone="info" />
        <StatCard label="OS em aberto" value={summary.open.length} hint={`${summary.done.length} entregues`} tone="accent" />
        {canSeeFinancial ? (
          <StatCard
            label="Pagamentos pendentes"
            value={formatCurrency(summary.pending)}
            hint={summary.pending > 0 ? "Em aberto com a oficina" : "Nenhuma pendência"}
            tone={summary.pending > 0 ? "warn" : "neutral"}
          />
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Dados cadastrais" />
            <CardBody className="space-y-3 text-sm">
              <InfoLine icon={Phone} label="Telefone" value={formatPhone(customer.phone) || "—"} />
              <InfoLine icon={Phone} label="WhatsApp" value={formatPhone(customer.whatsapp) || "—"} />
              <InfoLine icon={Mail} label="E-mail" value={customer.email ?? "—"} />
              <InfoLine
                icon={MapPin}
                label="Endereço"
                value={
                  [customer.address, customer.city, customer.state, formatZip(customer.zip_code)]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              {customer.birth_date ? (
                <InfoLine icon={User} label="Nascimento" value={formatDate(customer.birth_date)} />
              ) : null}
              {customer.notes ? (
                <p className="rounded-xl border border-ink-700 bg-ink-850 p-3 text-[13px] leading-relaxed text-fog-300">
                  {customer.notes}
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`Veículos (${summary.vehicles.length})`}
              action={
                canWrite ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingVehicle(null);
                      setVehicleOpen(true);
                    }}
                  >
                    <Plus /> Adicionar
                  </Button>
                ) : null
              }
            />
            {summary.vehicles.length === 0 ? (
              <EmptyState icon={Car} title="Nenhum veículo" description="Cadastre o veículo para abrir uma OS." />
            ) : (
              <ul className="divide-y divide-ink-800">
                {summary.vehicles.map((vehicle) => (
                  <li key={vehicle.id}>
                    <Link
                      href={`/veiculos/${vehicle.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-850 sm:px-5"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-800">
                        <Car className="size-4 text-fog-300" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="tabular block text-sm font-semibold text-fog-100">
                          {formatPlate(vehicle.plate)}
                        </span>
                        <span className="block truncate text-xs text-fog-400">
                          {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Histórico de ordens de serviço" />
            <DataTable
              data={summary.orders}
              columns={orderColumns}
              getRowId={(order) => order.id}
              onRowClick={(order) => router.push(`/ordens/${order.id}`)}
              empty={
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhuma OS registrada"
                  description="O histórico aparece aqui assim que o primeiro atendimento for aberto."
                />
              }
              mobileCard={(order) => (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular font-semibold text-fog-100">#{order.order_number}</span>
                    <WorkOrderStatusBadge status={order.status} short />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CardField label="Abertura" value={formatDate(order.opened_at)} />
                    <CardField label="Total" value={formatCurrency(order.total)} />
                  </div>
                </div>
              )}
            />
          </Card>

          {canSeeFinancial ? (
            <Card>
              <CardHeader title="Financeiro do cliente" subtitle="Receitas lançadas para este cliente" />
              <DataTable
                data={summary.revenues.slice(0, 12)}
                columns={revenueColumns}
                getRowId={(revenue) => revenue.id}
                empty={<EmptyState icon={Receipt} title="Nenhum lançamento financeiro" />}
                mobileCard={(revenue) => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium text-fog-100">
                        {revenue.description}
                      </span>
                      <EntryStatusBadge status={revenue.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <CardField label="Vencimento" value={formatDate(revenue.due_date)} />
                      <CardField label="Valor" value={formatCurrency(revenue.amount)} />
                    </div>
                  </div>
                )}
              />
            </Card>
          ) : null}

          {canWrite ? (
            <div className="flex justify-end">
              <Button
                variant="danger"
                onClick={() =>
                  confirm({
                    title: "Inativar cliente?",
                    description:
                      "O cliente deixa de aparecer nas buscas, mas todo o histórico de OS e financeiro é preservado.",
                    confirmLabel: "Inativar",
                    onConfirm: async () => {
                      await data.update("customers", customer.id, {
                        active: false,
                        updated_at: new Date().toISOString(),
                      });
                      await data.audit({
                        action: "deactivate",
                        entity: "customers",
                        entity_id: customer.id,
                        summary: `Cliente ${customer.name} inativado`,
                      });
                      toast.success("Cliente inativado.");
                    },
                  })
                }
              >
                <Trash2 /> Inativar cliente
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <VehicleFormDialog
        open={vehicleOpen}
        onOpenChange={setVehicleOpen}
        vehicle={editingVehicle}
        customerId={customer.id}
      />
      {dialog}
    </>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-fog-400" />
      <div className="min-w-0">
        <p className="text-[11px] tracking-wide text-fog-400 uppercase">{label}</p>
        <p className="break-words text-fog-100">{value}</p>
      </div>
    </div>
  );
}
