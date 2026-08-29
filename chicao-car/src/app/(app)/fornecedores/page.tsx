"use client";

import * as React from "react";
import { Building2, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { SupplierFormDialog } from "@/features/suppliers/supplier-form";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { formatCurrency, formatDocument, formatPhone, normalize } from "@/lib/utils/format";
import type { Supplier } from "@/types";

export default function SuppliersPage() {
  const data = useData();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "suppliers:write");

  const [term, setTerm] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Supplier | null>(null);

  const rows = React.useMemo(() => {
    const q = normalize(term);
    return data.suppliers
      .filter(
        (supplier) =>
          !q ||
          normalize(`${supplier.company_name} ${supplier.trade_name ?? ""}`).includes(q) ||
          (supplier.document ?? "").includes(term),
      )
      .map((supplier) => {
        const expenses = data.expenses.filter(
          (expense) => expense.supplier_id === supplier.id && expense.status !== "cancelled",
        );
        return {
          supplier,
          purchases: expenses.reduce((total, expense) => total + expense.amount, 0),
          open: expenses
            .filter((expense) => expense.status !== "paid")
            .reduce((total, expense) => total + (expense.amount - expense.paid_amount), 0),
          products: data.products.filter((product) => product.supplier_id === supplier.id).length,
        };
      })
      .sort((a, b) => b.purchases - a.purchases);
  }, [data.suppliers, data.expenses, data.products, term]);

  type Row = (typeof rows)[number];

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Fornecedor",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fog-100">
            {row.supplier.trade_name ?? row.supplier.company_name}
          </p>
          <p className="truncate text-xs text-fog-400">{row.supplier.company_name}</p>
        </div>
      ),
    },
    {
      key: "document",
      header: "CNPJ",
      hideBelow: "lg",
      cell: (row) => (
        <span className="tabular text-sm">{formatDocument(row.supplier.document) || "—"}</span>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-sm">{row.supplier.contact_name ?? "—"}</p>
          <p className="tabular text-xs text-fog-400">{formatPhone(row.supplier.phone) || "—"}</p>
        </div>
      ),
    },
    {
      key: "products",
      header: "Itens",
      align: "center",
      hideBelow: "xl",
      cell: (row) => <span className="tabular">{row.products}</span>,
    },
    {
      key: "purchases",
      header: "Compras",
      align: "right",
      cell: (row) => (
        <div>
          <p className="tabular font-semibold">{formatCurrency(row.purchases)}</p>
          {row.open > 0 ? (
            <p className="tabular text-xs text-warn">{formatCurrency(row.open)} em aberto</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {row.supplier.whatsapp ? (
            <WhatsAppButton
              phone={row.supplier.whatsapp}
              message={`Olá! Aqui é da ${data.settings.company_name}.`}
              iconOnly
              variant="ghost"
            />
          ) : null}
          {canWrite ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setEditing(row.supplier);
                setFormOpen(true);
              }}
            >
              <Pencil />
              <span className="sr-only">Editar</span>
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Fornecedores"
        subtitle={`${rows.length} fornecedor(es)`}
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Novo fornecedor
            </Button>
          ) : null
        }
      >
        <SearchInput value={term} onChange={setTerm} placeholder="Buscar por nome ou CNPJ…" />
      </PageHeader>

      <Card>
        <DataTable
          data={rows}
          columns={columns}
          loading={data.loading}
          getRowId={(row) => row.supplier.id}
          empty={
            <EmptyState
              icon={Building2}
              title="Nenhum fornecedor cadastrado"
              description="Cadastre os fornecedores para vincular compras de peças e contas a pagar."
              action={
                canWrite ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus /> Cadastrar fornecedor
                  </Button>
                ) : null
              }
            />
          }
          mobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium text-fog-100">
                  {row.supplier.trade_name ?? row.supplier.company_name}
                </p>
                {!row.supplier.active ? <Badge tone="neutral">Inativo</Badge> : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CardField label="Contato" value={formatPhone(row.supplier.phone) || "—"} />
                <CardField label="Itens" value={row.products} />
                <CardField label="Compras" value={formatCurrency(row.purchases)} />
              </div>
            </div>
          )}
        />
      </Card>

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editing} />
    </>
  );
}
