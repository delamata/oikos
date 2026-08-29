"use client";

import * as React from "react";
import { AlertTriangle, ArrowLeftRight, Boxes, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import { ProductFormDialog } from "@/features/products/product-form";
import { StockMovementDialog } from "@/features/inventory/stock-movement-dialog";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatNumber, formatPercent, normalize } from "@/lib/utils/format";
import type { Product } from "@/types";

type StockFilter = "all" | "low" | "out";

export default function ProductsPage() {
  const data = useData();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "products:write");
  const canMove = can(profile?.role, "inventory:write");

  const [term, setTerm] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [movementOpen, setMovementOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Product | null>(null);

  const stats = React.useMemo(() => {
    const active = data.products.filter((product) => product.active);
    return {
      items: active.length,
      stockValue: active.reduce(
        (total, product) => total + product.stock_quantity * product.cost_price,
        0,
      ),
      low: active.filter(
        (product) => product.stock_quantity <= product.minimum_stock && product.stock_quantity > 0,
      ).length,
      out: active.filter((product) => product.stock_quantity === 0).length,
    };
  }, [data.products]);

  const rows = React.useMemo(() => {
    const q = normalize(term);
    return data.products
      .filter((product) => {
        if (category && product.category !== category) return false;
        if (stockFilter === "low" && product.stock_quantity > product.minimum_stock) return false;
        if (stockFilter === "out" && product.stock_quantity > 0) return false;
        return !q || normalize(`${product.name} ${product.sku ?? ""}`).includes(q);
      })
      .map((product) => ({
        product,
        supplier: data.suppliers.find((supplier) => supplier.id === product.supplier_id) ?? null,
        margin:
          product.cost_price > 0
            ? ((product.sale_price - product.cost_price) / product.cost_price) * 100
            : 0,
      }))
      .sort((a, b) => a.product.name.localeCompare(b.product.name, "pt-BR"));
  }, [data.products, data.suppliers, term, category, stockFilter]);

  type Row = (typeof rows)[number];

  function stockBadge(product: Product) {
    if (product.stock_quantity === 0) return <Badge tone="danger">Sem estoque</Badge>;
    if (product.stock_quantity <= product.minimum_stock)
      return <Badge tone="warn">Abaixo do mínimo</Badge>;
    return null;
  }

  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Produto",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fog-100">{row.product.name}</p>
          <p className="truncate text-xs text-fog-400">
            {[row.product.sku, row.product.category].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Fornecedor",
      hideBelow: "xl",
      cell: (row) => row.supplier?.trade_name ?? row.supplier?.company_name ?? "—",
    },
    {
      key: "stock",
      header: "Estoque",
      align: "center",
      cell: (row) => (
        <div className="flex flex-col items-center gap-1">
          <span className="tabular font-semibold text-fog-100">
            {formatNumber(row.product.stock_quantity)}
          </span>
          {stockBadge(row.product)}
        </div>
      ),
    },
    {
      key: "cost",
      header: "Custo",
      align: "right",
      hideBelow: "lg",
      cell: (row) => <span className="tabular">{formatCurrency(row.product.cost_price)}</span>,
    },
    {
      key: "margin",
      header: "Margem",
      align: "right",
      hideBelow: "xl",
      cell: (row) => (
        <span className={row.margin >= 40 ? "tabular text-ok" : "tabular text-fog-300"}>
          {formatPercent(row.margin, 0)}
        </span>
      ),
    },
    {
      key: "price",
      header: "Venda",
      align: "right",
      cell: (row) => (
        <span className="tabular font-semibold text-fog-100">
          {formatCurrency(row.product.sale_price)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canMove ? (
            <Button
              size="icon-sm"
              variant="ghost"
              title="Movimentar estoque"
              onClick={() => {
                setSelected(row.product);
                setMovementOpen(true);
              }}
            >
              <ArrowLeftRight />
              <span className="sr-only">Movimentar estoque</span>
            </Button>
          ) : null}
          {canWrite ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setSelected(row.product);
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
        title="Produtos e peças"
        subtitle={`${rows.length} item(ns) listado(s)`}
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setSelected(null);
                setFormOpen(true);
              }}
            >
              <Plus /> Novo produto
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={term}
            onChange={setTerm}
            placeholder="Buscar por nome ou SKU…"
            className="flex-1"
          />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-52">
            <option value="">Todas as categorias</option>
            {PRODUCT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            className="sm:w-48"
          >
            <option value="all">Todo o estoque</option>
            <option value="low">Abaixo do mínimo</option>
            <option value="out">Sem estoque</option>
          </Select>
        </div>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Itens ativos" value={stats.items} icon={Boxes} />
        <StatCard
          label="Valor em estoque"
          value={formatCurrency(stats.stockValue)}
          hint="Pelo preço de custo"
          tone="info"
        />
        <StatCard
          label="Abaixo do mínimo"
          value={stats.low}
          icon={AlertTriangle}
          tone={stats.low > 0 ? "warn" : "neutral"}
        />
        <StatCard
          label="Sem estoque"
          value={stats.out}
          icon={AlertTriangle}
          tone={stats.out > 0 ? "danger" : "neutral"}
        />
      </div>

      <Card>
        <DataTable
          data={rows}
          columns={columns}
          loading={data.loading}
          getRowId={(row) => row.product.id}
          empty={
            <EmptyState
              icon={Boxes}
              title="Nenhuma peça cadastrada"
              description="Cadastre as peças para controlar estoque e aplicar direto na OS."
              action={
                canWrite ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus /> Cadastrar produto
                  </Button>
                ) : null
              }
            />
          }
          mobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium text-fog-100">{row.product.name}</p>
                {stockBadge(row.product)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CardField label="Estoque" value={formatNumber(row.product.stock_quantity)} />
                <CardField label="Custo" value={formatCurrency(row.product.cost_price)} />
                <CardField label="Venda" value={formatCurrency(row.product.sale_price)} />
              </div>
            </div>
          )}
        />
      </Card>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={selected} />
      <StockMovementDialog open={movementOpen} onOpenChange={setMovementOpen} product={selected} />
    </>
  );
}
