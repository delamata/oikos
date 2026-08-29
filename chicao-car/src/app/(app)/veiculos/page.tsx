"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Car, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { VehicleFormDialog } from "@/features/vehicles/vehicle-form";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { FUEL_TYPE } from "@/lib/constants";
import { formatCurrency, formatDate, formatMileage, formatPlate, normalize } from "@/lib/utils/format";

export default function VehiclesPage() {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "vehicles:write");

  const [term, setTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const wantsNew = params.get("novo") === "1" && canWrite;

  const rows = React.useMemo(() => {
    const q = normalize(term);
    const plateQuery = term.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return data.vehicles
      .map((vehicle) => {
        const owner = data.customers.find((c) => c.id === vehicle.customer_id) ?? null;
        const orders = data.work_orders.filter(
          (o) => o.vehicle_id === vehicle.id && o.status !== "cancelled",
        );
        return {
          vehicle,
          owner,
          orders: orders.length,
          spent: orders.reduce((total, order) => total + order.total, 0),
          lastService: orders.map((o) => o.opened_at).sort().at(-1),
        };
      })
      .filter((row) => {
        if (!q) return true;
        return (
          row.vehicle.plate.includes(plateQuery) ||
          normalize(`${row.vehicle.brand ?? ""} ${row.vehicle.model ?? ""}`).includes(q) ||
          normalize(row.owner?.name ?? "").includes(q)
        );
      })
      .sort((a, b) => (b.lastService ?? "").localeCompare(a.lastService ?? ""));
  }, [data.vehicles, data.customers, data.work_orders, term]);

  type Row = (typeof rows)[number];

  const columns: Column<Row>[] = [
    {
      key: "plate",
      header: "Placa",
      cell: (row) => (
        <span className="tabular font-semibold text-fog-100">{formatPlate(row.vehicle.plate)}</span>
      ),
    },
    {
      key: "vehicle",
      header: "Veículo",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-fog-100">
            {[row.vehicle.brand, row.vehicle.model].filter(Boolean).join(" ") || "—"}
          </p>
          <p className="truncate text-xs text-fog-400">
            {[row.vehicle.version, row.vehicle.year].filter(Boolean).join(" · ")}
          </p>
        </div>
      ),
    },
    { key: "owner", header: "Proprietário", cell: (row) => row.owner?.name ?? "—" },
    {
      key: "fuel",
      header: "Combustível",
      hideBelow: "xl",
      cell: (row) => (row.vehicle.fuel_type ? FUEL_TYPE[row.vehicle.fuel_type] : "—"),
    },
    {
      key: "mileage",
      header: "KM",
      align: "right",
      hideBelow: "lg",
      cell: (row) => <span className="tabular">{formatMileage(row.vehicle.mileage)}</span>,
    },
    {
      key: "last",
      header: "Última visita",
      hideBelow: "lg",
      cell: (row) => <span className="tabular">{formatDate(row.lastService)}</span>,
    },
    {
      key: "spent",
      header: "Gasto acumulado",
      align: "right",
      cell: (row) => <span className="tabular font-semibold">{formatCurrency(row.spent)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Veículos"
        subtitle={`${rows.length} veículo(s) na base`}
        actions={
          canWrite ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus /> Novo veículo
            </Button>
          ) : null
        }
      >
        <SearchInput
          value={term}
          onChange={setTerm}
          placeholder="Buscar por placa, modelo ou proprietário…"
        />
      </PageHeader>

      <Card>
        <DataTable
          data={rows}
          columns={columns}
          loading={data.loading}
          getRowId={(row) => row.vehicle.id}
          onRowClick={(row) => router.push(`/veiculos/${row.vehicle.id}`)}
          empty={
            <EmptyState
              icon={Car}
              title={term ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado"}
              description="A placa é a forma mais rápida de localizar um atendimento."
              action={
                canWrite ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus /> Cadastrar veículo
                  </Button>
                ) : null
              }
            />
          }
          mobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular font-semibold text-fog-100">
                  {formatPlate(row.vehicle.plate)}
                </span>
                <span className="truncate text-xs text-fog-400">
                  {[row.vehicle.brand, row.vehicle.model].filter(Boolean).join(" ")}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CardField label="Dono" value={row.owner?.name ?? "—"} />
                <CardField label="KM" value={formatMileage(row.vehicle.mileage)} />
                <CardField label="Gasto" value={formatCurrency(row.spent)} />
              </div>
            </div>
          )}
        />
      </Card>

      <VehicleFormDialog
        open={formOpen || wantsNew}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open && wantsNew) router.replace("/veiculos");
        }}
        onSaved={(vehicle) => router.push(`/veiculos/${vehicle.id}`)}
      />
    </>
  );
}
