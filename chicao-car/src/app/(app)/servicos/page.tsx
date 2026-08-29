"use client";

import * as React from "react";
import { Pencil, Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { ServiceFormDialog } from "@/features/services/service-form";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatNumber, normalize } from "@/lib/utils/format";
import type { Service } from "@/types";

export default function ServicesPage() {
  const data = useData();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "services:write");

  const [term, setTerm] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Service | null>(null);

  const rows = React.useMemo(() => {
    const q = normalize(term);
    return data.services
      .filter((service) => {
        if (category && service.category !== category) return false;
        return !q || normalize(`${service.name} ${service.description ?? ""}`).includes(q);
      })
      .map((service) => {
        const items = data.work_order_services.filter((item) => item.service_id === service.id);
        return {
          service,
          sold: items.reduce((total, item) => total + item.quantity, 0),
          revenue: items.reduce((total, item) => total + item.total, 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [data.services, data.work_order_services, term, category]);

  type Row = (typeof rows)[number];

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Serviço",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fog-100">{row.service.name}</p>
          <p className="truncate text-xs text-fog-400">{row.service.category ?? "Sem categoria"}</p>
        </div>
      ),
    },
    {
      key: "time",
      header: "Tempo",
      align: "center",
      hideBelow: "lg",
      cell: (row) =>
        row.service.estimated_minutes ? (
          <span className="tabular">{row.service.estimated_minutes} min</span>
        ) : (
          "—"
        ),
    },
    {
      key: "sold",
      header: "Executados",
      align: "center",
      hideBelow: "lg",
      cell: (row) => <span className="tabular">{formatNumber(row.sold)}</span>,
    },
    {
      key: "revenue",
      header: "Faturamento",
      align: "right",
      hideBelow: "xl",
      cell: (row) => <span className="tabular">{formatCurrency(row.revenue)}</span>,
    },
    {
      key: "price",
      header: "Preço",
      align: "right",
      cell: (row) => (
        <span className="tabular font-semibold text-fog-100">
          {formatCurrency(row.service.default_price)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        canWrite ? (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(row.service);
              setFormOpen(true);
            }}
          >
            <Pencil />
            <span className="sr-only">Editar</span>
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Serviços"
        subtitle={`${rows.length} serviço(s) no catálogo`}
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Novo serviço
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={term} onChange={setTerm} placeholder="Buscar serviço…" className="flex-1" />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="sm:w-64"
          >
            <option value="">Todas as categorias</option>
            {SERVICE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
      </PageHeader>

      <Card>
        <DataTable
          data={rows}
          columns={columns}
          loading={data.loading}
          getRowId={(row) => row.service.id}
          empty={
            <EmptyState
              icon={Wrench}
              title="Nenhum serviço no catálogo"
              description="Cadastre os serviços mais executados para montar a OS em segundos."
              action={
                canWrite ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus /> Cadastrar serviço
                  </Button>
                ) : null
              }
            />
          }
          mobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium text-fog-100">{row.service.name}</p>
                {!row.service.active ? <Badge tone="neutral">Inativo</Badge> : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CardField label="Preço" value={formatCurrency(row.service.default_price)} />
                <CardField
                  label="Tempo"
                  value={row.service.estimated_minutes ? `${row.service.estimated_minutes} min` : "—"}
                />
                <CardField label="Executados" value={formatNumber(row.sold)} />
              </div>
            </div>
          )}
        />
      </Card>

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} service={editing} />
    </>
  );
}
