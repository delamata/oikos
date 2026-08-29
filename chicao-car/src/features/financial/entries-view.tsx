"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Banknote,
  CircleDollarSign,
  MessageCircle,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { EntryStatusBadge } from "@/components/ui/status-badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CardField, DataTable, type Column } from "@/components/tables/data-table";
import {
  DateRangeFilter,
  rangeFromPreset,
  type RangePreset,
} from "@/components/ui/date-range-filter";
import { RevenueFormDialog, ExpenseFormDialog } from "./entry-forms";
import { SettleDialog, type SettleTarget } from "./settle-dialog";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { inPeriod, sum } from "@/lib/domain/financial";
import { whatsappUrl } from "@/services/whatsapp";
import { revenueChargeMessage, supplierExpenseMessage } from "@/services/whatsapp/messages";
import { EXPENSE_CATEGORIES, ENTRY_STATUS_OPTIONS, REVENUE_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatDate, normalize } from "@/lib/utils/format";
import type { Expense, Revenue } from "@/types";
import { isPast, parseISO, startOfToday } from "date-fns";

type Kind = "revenue" | "expense";
type Entry = Revenue | Expense;

/**
 * Tela compartilhada por Receitas, Despesas, Contas a Receber e Contas a Pagar.
 * O que muda entre elas é o tipo de lançamento e o filtro inicial.
 */
export function FinancialEntriesView({
  kind,
  mode,
  title,
  subtitle,
}: {
  kind: Kind;
  /** `all` lista tudo do período; `open` mostra só o que está em aberto. */
  mode: "all" | "open";
  title: string;
  subtitle: string;
}) {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();
  const { profile } = useAuth();
  const canWrite = can(profile?.role, "financial:write");
  const { confirm, dialog } = useConfirm();

  const [preset, setPreset] = React.useState<RangePreset>(mode === "open" ? "year" : "month");
  const [range, setRange] = React.useState(() =>
    rangeFromPreset(mode === "open" ? "year" : "month"),
  );
  const [term, setTerm] = React.useState("");
  const [status, setStatus] = React.useState(mode === "open" ? "pending" : "");
  const [category, setCategory] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Entry | null>(null);
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [settleTarget, setSettleTarget] = React.useState<SettleTarget | null>(null);
  // atalho ?nova=1 vindo da home mobile
  const wantsNew = params.get("nova") === "1" && canWrite && !editing;

  const source: Entry[] = kind === "revenue" ? data.revenues : data.expenses;
  const categories = kind === "revenue" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
  const today = startOfToday();

  /** Vencido é derivado da data — evita depender de rotina de atualização diária. */
  const effectiveStatus = React.useCallback(
    (entry: Entry) => {
      if (entry.status === "paid" || entry.status === "cancelled") return entry.status;
      return isPast(parseISO(entry.due_date)) && parseISO(entry.due_date) < today
        ? ("overdue" as const)
        : ("pending" as const);
    },
    [today],
  );

  const rows = React.useMemo(() => {
    const q = normalize(term);
    return source
      .filter((entry) => {
        if (!inPeriod(entry.due_date, range)) return false;
        const current = effectiveStatus(entry);
        if (mode === "open" && (current === "paid" || current === "cancelled")) return false;
        if (status === "pending" && current !== "pending" && current !== "overdue") return false;
        if (status && status !== "pending" && current !== status) return false;
        if (category && entry.category !== category) return false;
        return !q || normalize(entry.description).includes(q);
      })
      .map((entry) => ({
        entry,
        current: effectiveStatus(entry),
        party:
          kind === "revenue"
            ? (data.customers.find((c) => c.id === (entry as Revenue).customer_id)?.name ?? null)
            : (() => {
                const supplier = data.suppliers.find(
                  (s) => s.id === (entry as Expense).supplier_id,
                );
                return supplier ? (supplier.trade_name ?? supplier.company_name) : null;
              })(),
      }))
      .sort((a, b) => a.entry.due_date.localeCompare(b.entry.due_date));
  }, [source, term, range, status, category, mode, kind, data.customers, data.suppliers, effectiveStatus]);

  const stats = React.useMemo(() => {
    const inRange = source.filter(
      (entry) => inPeriod(entry.due_date, range) && entry.status !== "cancelled",
    );
    const open = inRange.filter((entry) => entry.status !== "paid");
    return {
      total: sum(inRange.map((entry) => entry.amount)),
      settled: sum(inRange.map((entry) => entry.paid_amount)),
      open: sum(open.map((entry) => entry.amount - entry.paid_amount)),
      overdue: sum(
        open
          .filter((entry) => effectiveStatus(entry) === "overdue")
          .map((entry) => entry.amount - entry.paid_amount),
      ),
    };
  }, [source, range, effectiveStatus]);

  type Row = (typeof rows)[number];

  const columns: Column<Row>[] = [
    {
      key: "description",
      header: "Descrição",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fog-100">{row.entry.description}</p>
          <p className="truncate text-xs text-fog-400">
            {[row.party, row.entry.category].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "due",
      header: "Vencimento",
      cell: (row) => <span className="tabular text-sm">{formatDate(row.entry.due_date)}</span>,
    },
    {
      key: "paid",
      header: "Baixado",
      align: "right",
      hideBelow: "lg",
      cell: (row) => (
        <span className="tabular text-sm text-fog-300">{formatCurrency(row.entry.paid_amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Situação",
      cell: (row) => <EntryStatusBadge status={row.current} />,
    },
    {
      key: "amount",
      header: "Valor",
      align: "right",
      cell: (row) => (
        <span className="tabular font-semibold text-fog-100">
          {formatCurrency(row.entry.amount)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "150px",
      cell: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canWrite && row.current !== "paid" && row.current !== "cancelled" ? (
            <Button
              size="icon-sm"
              variant="ghost"
              title="Dar baixa"
              onClick={() => {
                setSettleTarget(
                  kind === "revenue"
                    ? { kind: "revenue", entry: row.entry as Revenue }
                    : { kind: "expense", entry: row.entry as Expense },
                );
                setSettleOpen(true);
              }}
            >
              <CircleDollarSign />
              <span className="sr-only">Dar baixa</span>
            </Button>
          ) : null}
          <Button
            size="icon-sm"
            variant="ghost"
            title="Cobrar pelo WhatsApp"
            onClick={() => {
              const phone =
                kind === "revenue"
                  ? (data.customers.find((c) => c.id === (row.entry as Revenue).customer_id)
                      ?.whatsapp ?? null)
                  : (data.suppliers.find((s) => s.id === (row.entry as Expense).supplier_id)
                      ?.whatsapp ?? null);
              const message =
                kind === "revenue"
                  ? revenueChargeMessage(
                      row.entry as Revenue,
                      data.customers.find((c) => c.id === (row.entry as Revenue).customer_id) ??
                        null,
                      data.settings,
                    )
                  : supplierExpenseMessage(row.entry as Expense, data.settings);
              window.open(whatsappUrl(phone, message), "_blank", "noopener");
            }}
          >
            <MessageCircle />
            <span className="sr-only">WhatsApp</span>
          </Button>
          {canWrite ? (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                title="Editar"
                onClick={() => {
                  setEditing(row.entry);
                  setFormOpen(true);
                }}
              >
                <Pencil />
                <span className="sr-only">Editar</span>
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-danger"
                title="Cancelar lançamento"
                onClick={() =>
                  confirm({
                    title: "Cancelar este lançamento?",
                    description:
                      "Ele deixa de contar nos totais, mas continua visível no histórico e na auditoria.",
                    confirmLabel: "Cancelar lançamento",
                    onConfirm: async () => {
                      await data.update(kind === "revenue" ? "revenues" : "expenses", row.entry.id, {
                        status: "cancelled",
                      });
                      await data.audit({
                        action: "cancel",
                        entity: kind === "revenue" ? "revenues" : "expenses",
                        entity_id: row.entry.id,
                        summary: `Lançamento cancelado: ${row.entry.description}`,
                        before: { status: row.entry.status },
                        after: { status: "cancelled" },
                      });
                      toast.success("Lançamento cancelado.");
                    },
                  })
                }
              >
                <Trash2 />
                <span className="sr-only">Cancelar lançamento</span>
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const isRevenue = kind === "revenue";

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus /> {isRevenue ? "Nova receita" : "Nova despesa"}
            </Button>
          ) : null
        }
      >
        <div className="space-y-2">
          <DateRangeFilter
            preset={preset}
            range={range}
            onChange={(nextPreset, nextRange) => {
              setPreset(nextPreset);
              setRange(nextRange);
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              value={term}
              onChange={setTerm}
              placeholder="Buscar por descrição…"
              className="flex-1"
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
              <option value="">Todas as situações</option>
              {ENTRY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="sm:w-52"
            >
              <option value="">Todas as categorias</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={isRevenue ? "Receitas no período" : "Despesas no período"}
          value={formatCurrency(stats.total)}
          icon={Receipt}
          tone={isRevenue ? "ok" : "danger"}
        />
        <StatCard
          label={isRevenue ? "Já recebido" : "Já pago"}
          value={formatCurrency(stats.settled)}
          icon={Banknote}
          tone="info"
        />
        <StatCard label="Em aberto" value={formatCurrency(stats.open)} tone="warn" />
        <StatCard
          label="Vencido"
          value={formatCurrency(stats.overdue)}
          tone={stats.overdue > 0 ? "danger" : "neutral"}
        />
      </div>

      <Card>
        <DataTable
          data={rows}
          columns={columns}
          loading={data.loading}
          getRowId={(row) => row.entry.id}
          empty={
            <EmptyState
              icon={Receipt}
              title="Nenhum lançamento no período"
              description="Ajuste o período ou lance um novo registro."
              action={
                canWrite ? (
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus /> {isRevenue ? "Nova receita" : "Nova despesa"}
                  </Button>
                ) : null
              }
            />
          }
          mobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium text-fog-100">{row.entry.description}</p>
                <EntryStatusBadge status={row.current} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CardField label="Vencimento" value={formatDate(row.entry.due_date)} />
                <CardField label="Valor" value={formatCurrency(row.entry.amount)} />
                <CardField label="Baixado" value={formatCurrency(row.entry.paid_amount)} />
              </div>
              {canWrite && row.current !== "paid" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  block
                  onClick={(e) => {
                    e.stopPropagation();
                    setSettleTarget(
                      kind === "revenue"
                        ? { kind: "revenue", entry: row.entry as Revenue }
                        : { kind: "expense", entry: row.entry as Expense },
                    );
                    setSettleOpen(true);
                  }}
                >
                  <CircleDollarSign /> Dar baixa
                </Button>
              ) : null}
            </div>
          )}
        />
      </Card>

      {isRevenue ? (
        <RevenueFormDialog
          open={formOpen || wantsNew}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open && wantsNew) router.replace("/financeiro/receitas");
          }}
          revenue={editing as Revenue | null}
        />
      ) : (
        <ExpenseFormDialog
          open={formOpen || wantsNew}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open && wantsNew) router.replace("/financeiro/despesas");
          }}
          expense={editing as Expense | null}
        />
      )}
      <SettleDialog open={settleOpen} onOpenChange={setSettleOpen} target={settleTarget} />
      {dialog}
    </>
  );
}
