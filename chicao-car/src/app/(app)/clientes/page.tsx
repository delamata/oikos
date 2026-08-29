"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { CustomerFormDialog } from "@/features/customers/customer-form";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDocument, formatPhone, normalize } from "@/lib/utils/format";

type Filter = "active" | "inactive" | "all";

export default function CustomersPage() {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "customers:write");

  const [term, setTerm] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("active");
  const [formOpen, setFormOpen] = React.useState(false);
  // ?novo=1 (atalho da home mobile) já abre o cadastro
  const wantsNew = params.get("novo") === "1" && canWrite;

  const rows = React.useMemo(() => {
    const q = normalize(term);
    return data.customers
      .filter((customer) => {
        if (filter === "active" && !customer.active) return false;
        if (filter === "inactive" && customer.active) return false;
        if (!q) return true;
        return (
          normalize(customer.name).includes(q) ||
          (customer.document ?? "").includes(term) ||
          (customer.phone ?? "").includes(term) ||
          (customer.whatsapp ?? "").includes(term) ||
          normalize(customer.city ?? "").includes(q)
        );
      })
      .map((customer) => {
        const orders = data.work_orders.filter(
          (o) => o.customer_id === customer.id && o.status !== "cancelled",
        );
        const vehicles = data.vehicles.filter((v) => v.customer_id === customer.id);
        const spent = orders.reduce((total, order) => total + order.total, 0);
        const lastVisit = orders
          .map((o) => o.opened_at)
          .sort()
          .at(-1);
        const openReceivables = data.revenues
          .filter(
            (r) => r.customer_id === customer.id && r.status !== "paid" && r.status !== "cancelled",
          )
          .reduce((total, r) => total + (r.amount - r.paid_amount), 0);
        return { customer, vehicles: vehicles.length, spent, lastVisit, openReceivables };
      })
      .sort((a, b) => a.customer.name.localeCompare(b.customer.name, "pt-BR"));
  }, [data.customers, data.work_orders, data.vehicles, data.revenues, term, filter]);

  type Row = (typeof rows)[number];

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Cliente",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fog-100">{row.customer.name}</p>
          <p className="truncate text-xs text-fog-400">
            {row.customer.document ? formatDocument(row.customer.document) : "Sem documento"}
          </p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      cell: (row) => (
        <div className="min-w-0">
          <p className="tabular text-sm">{formatPhone(row.customer.phone) || "—"}</p>
          <p className="truncate text-xs text-fog-400">{row.customer.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "city",
      header: "Cidade",
      hideBelow: "lg",
      cell: (row) => row.customer.city ?? "—",
    },
    {
      key: "vehicles",
      header: "Veículos",
      align: "center",
      cell: (row) => <span className="tabular">{row.vehicles}</span>,
    },
    {
      key: "last",
      header: "Última visita",
      hideBelow: "lg",
      cell: (row) => <span className="tabular text-sm">{formatDate(row.lastVisit)}</span>,
    },
    {
      key: "spent",
      header: "Total gasto",
      align: "right",
      cell: (row) => (
        <div>
          <p className="tabular font-semibold text-fog-100">{formatCurrency(row.spent)}</p>
          {row.openReceivables > 0 ? (
            <p className="tabular text-xs text-warn">
              {formatCurrency(row.openReceivables)} em aberto
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "60px",
      cell: (row) =>
        row.customer.whatsapp ? (
          <div onClick={(e) => e.stopPropagation()}>
            <WhatsAppButton
              phone={row.customer.whatsapp}
              message={`Olá, ${row.customer.name.split(" ")[0]}! Aqui é da ${data.settings.company_name}.`}
              iconOnly
              variant="ghost"
            />
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${rows.length} cliente(s) · base ${filter === "all" ? "completa" : filter === "active" ? "ativa" : "inativa"}`}
        actions={
          canWrite ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus /> Novo cliente
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={term}
            onChange={setTerm}
            placeholder="Buscar por nome, CPF/CNPJ, telefone ou cidade…"
            className="flex-1"
          />
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="sm:w-48"
          >
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
            <option value="all">Todos</option>
          </Select>
        </div>
      </PageHeader>

      <Card>
        <DataTable
          data={rows}
          columns={columns}
          loading={data.loading}
          getRowId={(row) => row.customer.id}
          onRowClick={(row) => router.push(`/clientes/${row.customer.id}`)}
          empty={
            <EmptyState
              icon={Users}
              title={term ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              description={
                term
                  ? "Revise o termo buscado ou cadastre um novo cliente."
                  : "Cadastre o primeiro cliente para começar a abrir ordens de serviço."
              }
              action={
                canWrite ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <UserPlus /> Cadastrar cliente
                  </Button>
                ) : null
              }
            />
          }
          mobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium text-fog-100">{row.customer.name}</p>
                {!row.customer.active ? <Badge tone="neutral">Inativo</Badge> : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CardField label="Telefone" value={formatPhone(row.customer.phone) || "—"} />
                <CardField label="Veículos" value={row.vehicles} />
                <CardField label="Total gasto" value={formatCurrency(row.spent)} />
              </div>
            </div>
          )}
        />
      </Card>

      <CustomerFormDialog
        open={formOpen || wantsNew}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open && params.get("novo")) router.replace("/clientes");
        }}
        onSaved={(customer) => router.push(`/clientes/${customer.id}`)}
      />
    </>
  );
}
