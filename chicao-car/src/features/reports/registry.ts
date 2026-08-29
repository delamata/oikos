import { eachMonthOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Snapshot } from "@/lib/data/snapshot";
import type { DateRange } from "@/components/ui/date-range-filter";
import {
  balanceUntil,
  buildCashFlow,
  inPeriod,
  summarizeFinancials,
  sum,
} from "@/lib/domain/financial";
import {
  ENTRY_STATUS,
  PAYMENT_METHOD,
  WORK_ORDER_STATUS,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatPlate,
} from "@/lib/utils/format";

export type FilterKey =
  | "period"
  | "customer"
  | "supplier"
  | "vehicle"
  | "status"
  | "category"
  | "method"
  | "granularity";

export interface ReportFilters {
  range: DateRange;
  customerId: string;
  supplierId: string;
  vehicleId: string;
  status: string;
  category: string;
  method: string;
  granularity: "day" | "week" | "month";
}

export type Align = "left" | "right" | "center";

export interface ReportResult {
  columns: { header: string; align?: Align }[];
  rows: (string | number)[][];
  totals?: [string, string][];
  /** Linhas curtas usadas no resumo enviado por WhatsApp/e-mail. */
  summary: string[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  group: "Financeiros" | "Comerciais" | "Oficina" | "Fornecedores";
  filters: FilterKey[];
  build: (data: Snapshot, filters: ReportFilters) => ReportResult;
}

const MONEY: Align = "right";

function monthsIn(range: DateRange) {
  return eachMonthOfInterval({ start: startOfMonth(range.from), end: range.to });
}

function validOrders(data: Snapshot, filters: ReportFilters) {
  return data.work_orders.filter((order) => {
    if (order.status === "cancelled") return false;
    if (!inPeriod(order.opened_at, filters.range)) return false;
    if (filters.customerId && order.customer_id !== filters.customerId) return false;
    if (filters.vehicleId && order.vehicle_id !== filters.vehicleId) return false;
    return true;
  });
}

export const REPORTS: ReportDefinition[] = [
  // ------------------------------------------------------------- FINANCEIROS
  {
    id: "receitas",
    name: "Receitas",
    description: "Todos os lançamentos de receita no período, por vencimento.",
    group: "Financeiros",
    filters: ["period", "customer", "status", "category", "method"],
    build(data, filters) {
      const rows = data.revenues
        .filter((revenue) => {
          if (!inPeriod(revenue.due_date, filters.range)) return false;
          if (filters.customerId && revenue.customer_id !== filters.customerId) return false;
          if (filters.status && revenue.status !== filters.status) return false;
          if (filters.category && revenue.category !== filters.category) return false;
          if (filters.method && revenue.payment_method !== filters.method) return false;
          return true;
        })
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      return {
        columns: [
          { header: "Vencimento" },
          { header: "Descrição" },
          { header: "Cliente" },
          { header: "Categoria" },
          { header: "Situação" },
          { header: "Recebido", align: MONEY },
          { header: "Valor", align: MONEY },
        ],
        rows: rows.map((revenue) => [
          formatDate(revenue.due_date),
          revenue.description,
          data.customers.find((c) => c.id === revenue.customer_id)?.name ?? "—",
          revenue.category ?? "—",
          ENTRY_STATUS[revenue.status].label,
          formatCurrency(revenue.paid_amount),
          formatCurrency(revenue.amount),
        ]),
        totals: [
          ["Lançamentos", String(rows.length)],
          ["Recebido", formatCurrency(sum(rows.map((r) => r.paid_amount)))],
          ["Total", formatCurrency(sum(rows.map((r) => r.amount)))],
        ],
        summary: [
          `${rows.length} lançamento(s)`,
          `Total: ${formatCurrency(sum(rows.map((r) => r.amount)))}`,
          `Recebido: ${formatCurrency(sum(rows.map((r) => r.paid_amount)))}`,
        ],
      };
    },
  },
  {
    id: "despesas",
    name: "Despesas",
    description: "Todos os lançamentos de despesa no período, por vencimento.",
    group: "Financeiros",
    filters: ["period", "supplier", "status", "category", "method"],
    build(data, filters) {
      const rows = data.expenses
        .filter((expense) => {
          if (!inPeriod(expense.due_date, filters.range)) return false;
          if (filters.supplierId && expense.supplier_id !== filters.supplierId) return false;
          if (filters.status && expense.status !== filters.status) return false;
          if (filters.category && expense.category !== filters.category) return false;
          if (filters.method && expense.payment_method !== filters.method) return false;
          return true;
        })
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      return {
        columns: [
          { header: "Vencimento" },
          { header: "Descrição" },
          { header: "Fornecedor" },
          { header: "Categoria" },
          { header: "Situação" },
          { header: "Pago", align: MONEY },
          { header: "Valor", align: MONEY },
        ],
        rows: rows.map((expense) => {
          const supplier = data.suppliers.find((s) => s.id === expense.supplier_id);
          return [
            formatDate(expense.due_date),
            expense.description,
            supplier ? (supplier.trade_name ?? supplier.company_name) : "—",
            expense.category ?? "—",
            ENTRY_STATUS[expense.status].label,
            formatCurrency(expense.paid_amount),
            formatCurrency(expense.amount),
          ];
        }),
        totals: [
          ["Lançamentos", String(rows.length)],
          ["Pago", formatCurrency(sum(rows.map((e) => e.paid_amount)))],
          ["Total", formatCurrency(sum(rows.map((e) => e.amount)))],
        ],
        summary: [
          `${rows.length} lançamento(s)`,
          `Total: ${formatCurrency(sum(rows.map((e) => e.amount)))}`,
        ],
      };
    },
  },
  {
    id: "receitas-x-despesas",
    name: "Receitas x Despesas",
    description: "Comparativo mensal entre entradas e saídas por competência.",
    group: "Financeiros",
    filters: ["period"],
    build(data, filters) {
      const months = monthsIn(filters.range);
      const rows = months.map((month) => {
        const period = { from: startOfMonth(month), to: endOfMonth(month) };
        const revenue = sum(
          data.revenues
            .filter((r) => r.status !== "cancelled" && inPeriod(r.due_date, period))
            .map((r) => r.amount),
        );
        const expense = sum(
          data.expenses
            .filter((e) => e.status !== "cancelled" && inPeriod(e.due_date, period))
            .map((e) => e.amount),
        );
        return { month, revenue, expense, result: revenue - expense };
      });

      return {
        columns: [
          { header: "Mês" },
          { header: "Receitas", align: MONEY },
          { header: "Despesas", align: MONEY },
          { header: "Resultado", align: MONEY },
          { header: "Margem", align: MONEY },
        ],
        rows: rows.map((row) => [
          format(row.month, "MMMM 'de' yyyy", { locale: ptBR }),
          formatCurrency(row.revenue),
          formatCurrency(row.expense),
          formatCurrency(row.result),
          row.revenue > 0 ? formatPercent((row.result / row.revenue) * 100) : "—",
        ]),
        totals: [
          ["Receitas", formatCurrency(sum(rows.map((r) => r.revenue)))],
          ["Despesas", formatCurrency(sum(rows.map((r) => r.expense)))],
          ["Resultado", formatCurrency(sum(rows.map((r) => r.result)))],
        ],
        summary: [
          `Receitas: ${formatCurrency(sum(rows.map((r) => r.revenue)))}`,
          `Despesas: ${formatCurrency(sum(rows.map((r) => r.expense)))}`,
          `Resultado: ${formatCurrency(sum(rows.map((r) => r.result)))}`,
        ],
      };
    },
  },
  {
    id: "fluxo-de-caixa",
    name: "Fluxo de caixa",
    description: "Entradas, saídas e saldo acumulado por dia, semana ou mês.",
    group: "Financeiros",
    filters: ["period", "granularity"],
    build(data, filters) {
      const opening = balanceUntil(data.revenues, data.expenses, filters.range.from);
      const buckets = buildCashFlow(
        data.revenues,
        data.expenses,
        filters.range,
        filters.granularity,
        opening,
      );
      return {
        columns: [
          { header: "Período" },
          { header: "Entradas", align: MONEY },
          { header: "Saídas", align: MONEY },
          { header: "Resultado", align: MONEY },
          { header: "Saldo", align: MONEY },
        ],
        rows: buckets.map((bucket) => [
          bucket.label,
          formatCurrency(bucket.inflow),
          formatCurrency(bucket.outflow),
          formatCurrency(bucket.net),
          formatCurrency(bucket.balance),
        ]),
        totals: [
          ["Saldo inicial", formatCurrency(opening)],
          ["Entradas", formatCurrency(sum(buckets.map((b) => b.inflow)))],
          ["Saídas", formatCurrency(sum(buckets.map((b) => b.outflow)))],
          ["Saldo final", formatCurrency(buckets.at(-1)?.balance ?? opening)],
        ],
        summary: [
          `Entradas: ${formatCurrency(sum(buckets.map((b) => b.inflow)))}`,
          `Saídas: ${formatCurrency(sum(buckets.map((b) => b.outflow)))}`,
          `Saldo final: ${formatCurrency(buckets.at(-1)?.balance ?? opening)}`,
        ],
      };
    },
  },
  {
    id: "contas-a-receber",
    name: "Contas a receber",
    description: "Títulos em aberto com vencimento no período.",
    group: "Financeiros",
    filters: ["period", "customer"],
    build(data, filters) {
      const rows = data.revenues
        .filter(
          (revenue) =>
            revenue.status !== "paid" &&
            revenue.status !== "cancelled" &&
            inPeriod(revenue.due_date, filters.range) &&
            (!filters.customerId || revenue.customer_id === filters.customerId),
        )
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      return {
        columns: [
          { header: "Vencimento" },
          { header: "Cliente" },
          { header: "Descrição" },
          { header: "Situação" },
          { header: "Em aberto", align: MONEY },
        ],
        rows: rows.map((revenue) => [
          formatDate(revenue.due_date),
          data.customers.find((c) => c.id === revenue.customer_id)?.name ?? "—",
          revenue.description,
          ENTRY_STATUS[revenue.status].label,
          formatCurrency(revenue.amount - revenue.paid_amount),
        ]),
        totals: [
          ["Títulos", String(rows.length)],
          ["Total em aberto", formatCurrency(sum(rows.map((r) => r.amount - r.paid_amount)))],
        ],
        summary: [
          `${rows.length} título(s) em aberto`,
          `Total: ${formatCurrency(sum(rows.map((r) => r.amount - r.paid_amount)))}`,
        ],
      };
    },
  },
  {
    id: "contas-a-pagar",
    name: "Contas a pagar",
    description: "Títulos em aberto com vencimento no período.",
    group: "Financeiros",
    filters: ["period", "supplier"],
    build(data, filters) {
      const rows = data.expenses
        .filter(
          (expense) =>
            expense.status !== "paid" &&
            expense.status !== "cancelled" &&
            inPeriod(expense.due_date, filters.range) &&
            (!filters.supplierId || expense.supplier_id === filters.supplierId),
        )
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      return {
        columns: [
          { header: "Vencimento" },
          { header: "Fornecedor" },
          { header: "Descrição" },
          { header: "Situação" },
          { header: "Em aberto", align: MONEY },
        ],
        rows: rows.map((expense) => {
          const supplier = data.suppliers.find((s) => s.id === expense.supplier_id);
          return [
            formatDate(expense.due_date),
            supplier ? (supplier.trade_name ?? supplier.company_name) : "—",
            expense.description,
            ENTRY_STATUS[expense.status].label,
            formatCurrency(expense.amount - expense.paid_amount),
          ];
        }),
        totals: [
          ["Títulos", String(rows.length)],
          ["Total em aberto", formatCurrency(sum(rows.map((e) => e.amount - e.paid_amount)))],
        ],
        summary: [
          `${rows.length} título(s) em aberto`,
          `Total: ${formatCurrency(sum(rows.map((e) => e.amount - e.paid_amount)))}`,
        ],
      };
    },
  },
  {
    id: "resultado-por-periodo",
    name: "Resultado do período",
    description: "Fechamento consolidado: receitas, despesas, caixa e inadimplência.",
    group: "Financeiros",
    filters: ["period"],
    build(data, filters) {
      const summary = summarizeFinancials(data.revenues, data.expenses, filters.range);
      const rows: (string | number)[][] = [
        ["Receitas por competência", formatCurrency(summary.revenueAccrued)],
        ["Receitas recebidas", formatCurrency(summary.revenueReceived)],
        ["Despesas por competência", formatCurrency(summary.expenseAccrued)],
        ["Despesas pagas", formatCurrency(summary.expensePaid)],
        ["Resultado (competência)", formatCurrency(summary.result)],
        ["Resultado de caixa", formatCurrency(summary.cashResult)],
        ["Contas a receber em aberto", formatCurrency(summary.receivable)],
        ["Contas a receber vencidas", formatCurrency(summary.receivableOverdue)],
        ["Contas a pagar em aberto", formatCurrency(summary.payable)],
        ["Contas a pagar vencidas", formatCurrency(summary.payableOverdue)],
        ["Inadimplência", formatPercent(summary.defaultRate)],
      ];
      return {
        columns: [{ header: "Indicador" }, { header: "Valor", align: MONEY }],
        rows,
        summary: [
          `Receitas: ${formatCurrency(summary.revenueAccrued)}`,
          `Despesas: ${formatCurrency(summary.expenseAccrued)}`,
          `Resultado: ${formatCurrency(summary.result)}`,
        ],
      };
    },
  },

  // -------------------------------------------------------------- COMERCIAIS
  {
    id: "faturamento-por-cliente",
    name: "Faturamento por cliente",
    description: "Quanto cada cliente gerou de OS no período.",
    group: "Comerciais",
    filters: ["period", "customer"],
    build(data, filters) {
      const orders = validOrders(data, filters);
      const map = new Map<string, { total: number; count: number }>();
      for (const order of orders) {
        const current = map.get(order.customer_id) ?? { total: 0, count: 0 };
        map.set(order.customer_id, {
          total: current.total + order.total,
          count: current.count + 1,
        });
      }
      const rows = [...map.entries()]
        .map(([customerId, info]) => ({
          name: data.customers.find((c) => c.id === customerId)?.name ?? "—",
          ...info,
        }))
        .sort((a, b) => b.total - a.total);

      return {
        columns: [
          { header: "Cliente" },
          { header: "OS", align: "center" as Align },
          { header: "Ticket médio", align: MONEY },
          { header: "Total", align: MONEY },
        ],
        rows: rows.map((row) => [
          row.name,
          row.count,
          formatCurrency(row.total / row.count),
          formatCurrency(row.total),
        ]),
        totals: [
          ["Clientes", String(rows.length)],
          ["Total", formatCurrency(sum(rows.map((r) => r.total)))],
        ],
        summary: [
          `${rows.length} cliente(s) atendidos`,
          `Faturamento: ${formatCurrency(sum(rows.map((r) => r.total)))}`,
        ],
      };
    },
  },
  {
    id: "faturamento-por-veiculo",
    name: "Faturamento por veículo",
    description: "Quanto cada veículo gerou em serviços e peças.",
    group: "Comerciais",
    filters: ["period", "customer", "vehicle"],
    build(data, filters) {
      const orders = validOrders(data, filters);
      const map = new Map<string, { total: number; count: number }>();
      for (const order of orders) {
        const current = map.get(order.vehicle_id) ?? { total: 0, count: 0 };
        map.set(order.vehicle_id, {
          total: current.total + order.total,
          count: current.count + 1,
        });
      }
      const rows = [...map.entries()]
        .map(([vehicleId, info]) => {
          const vehicle = data.vehicles.find((v) => v.id === vehicleId);
          const owner = data.customers.find((c) => c.id === vehicle?.customer_id);
          return {
            plate: vehicle ? formatPlate(vehicle.plate) : "—",
            model: vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : "—",
            owner: owner?.name ?? "—",
            ...info,
          };
        })
        .sort((a, b) => b.total - a.total);

      return {
        columns: [
          { header: "Placa" },
          { header: "Veículo" },
          { header: "Proprietário" },
          { header: "OS", align: "center" as Align },
          { header: "Total", align: MONEY },
        ],
        rows: rows.map((row) => [row.plate, row.model, row.owner, row.count, formatCurrency(row.total)]),
        totals: [["Total", formatCurrency(sum(rows.map((r) => r.total)))]],
        summary: [`${rows.length} veículo(s)`, `Total: ${formatCurrency(sum(rows.map((r) => r.total)))}`],
      };
    },
  },
  {
    id: "faturamento-por-servico",
    name: "Faturamento por serviço",
    description: "Serviços mais executados e quanto representam em receita.",
    group: "Comerciais",
    filters: ["period", "customer"],
    build(data, filters) {
      const orders = validOrders(data, filters);
      const ids = new Set(orders.map((order) => order.id));
      const map = new Map<string, { quantity: number; total: number }>();
      for (const item of data.work_order_services) {
        if (!ids.has(item.work_order_id)) continue;
        const current = map.get(item.description) ?? { quantity: 0, total: 0 };
        map.set(item.description, {
          quantity: current.quantity + item.quantity,
          total: current.total + item.total,
        });
      }
      const rows = [...map.entries()]
        .map(([name, info]) => ({ name, ...info }))
        .sort((a, b) => b.total - a.total);

      return {
        columns: [
          { header: "Serviço" },
          { header: "Qtd.", align: "center" as Align },
          { header: "Ticket médio", align: MONEY },
          { header: "Total", align: MONEY },
        ],
        rows: rows.map((row) => [
          row.name,
          formatNumber(row.quantity),
          formatCurrency(row.total / row.quantity),
          formatCurrency(row.total),
        ]),
        totals: [["Total em serviços", formatCurrency(sum(rows.map((r) => r.total)))]],
        summary: [
          `Serviço mais vendido: ${rows[0]?.name ?? "—"}`,
          `Total: ${formatCurrency(sum(rows.map((r) => r.total)))}`,
        ],
      };
    },
  },
  {
    id: "faturamento-por-produto",
    name: "Faturamento por produto",
    description: "Peças mais aplicadas, com receita e margem estimada.",
    group: "Comerciais",
    filters: ["period", "customer"],
    build(data, filters) {
      const orders = validOrders(data, filters);
      const ids = new Set(orders.map((order) => order.id));
      const map = new Map<string, { quantity: number; total: number; cost: number }>();
      for (const item of data.work_order_products) {
        if (!ids.has(item.work_order_id)) continue;
        const current = map.get(item.description) ?? { quantity: 0, total: 0, cost: 0 };
        map.set(item.description, {
          quantity: current.quantity + item.quantity,
          total: current.total + item.total,
          cost: current.cost + item.unit_cost * item.quantity,
        });
      }
      const rows = [...map.entries()]
        .map(([name, info]) => ({ name, ...info }))
        .sort((a, b) => b.total - a.total);

      return {
        columns: [
          { header: "Produto" },
          { header: "Qtd.", align: "center" as Align },
          { header: "Custo", align: MONEY },
          { header: "Margem", align: MONEY },
          { header: "Total", align: MONEY },
        ],
        rows: rows.map((row) => [
          row.name,
          formatNumber(row.quantity),
          formatCurrency(row.cost),
          formatCurrency(row.total - row.cost),
          formatCurrency(row.total),
        ]),
        totals: [
          ["Custo total", formatCurrency(sum(rows.map((r) => r.cost)))],
          ["Margem", formatCurrency(sum(rows.map((r) => r.total - r.cost)))],
          ["Total", formatCurrency(sum(rows.map((r) => r.total)))],
        ],
        summary: [`Total em peças: ${formatCurrency(sum(rows.map((r) => r.total)))}`],
      };
    },
  },
  {
    id: "ticket-medio",
    name: "Ticket médio",
    description: "Evolução mensal do valor médio por ordem de serviço.",
    group: "Comerciais",
    filters: ["period"],
    build(data, filters) {
      const months = monthsIn(filters.range);
      const rows = months.map((month) => {
        const period = { from: startOfMonth(month), to: endOfMonth(month) };
        const orders = data.work_orders.filter(
          (order) => order.status !== "cancelled" && inPeriod(order.opened_at, period),
        );
        const total = sum(orders.map((order) => order.total));
        return {
          label: format(month, "MMMM 'de' yyyy", { locale: ptBR }),
          count: orders.length,
          total,
          ticket: orders.length ? total / orders.length : 0,
        };
      });

      return {
        columns: [
          { header: "Mês" },
          { header: "OS", align: "center" as Align },
          { header: "Faturamento", align: MONEY },
          { header: "Ticket médio", align: MONEY },
        ],
        rows: rows.map((row) => [
          row.label,
          row.count,
          formatCurrency(row.total),
          formatCurrency(row.ticket),
        ]),
        totals: [
          ["OS no período", String(sum(rows.map((r) => r.count)))],
          [
            "Ticket médio geral",
            formatCurrency(
              sum(rows.map((r) => r.total)) / Math.max(1, sum(rows.map((r) => r.count))),
            ),
          ],
        ],
        summary: [
          `Ticket médio: ${formatCurrency(
            sum(rows.map((r) => r.total)) / Math.max(1, sum(rows.map((r) => r.count))),
          )}`,
        ],
      };
    },
  },

  // ----------------------------------------------------------------- OFICINA
  {
    id: "ordens-de-servico",
    name: "Ordens de serviço",
    description: "Lista completa das OS abertas no período.",
    group: "Oficina",
    filters: ["period", "customer", "vehicle", "status"],
    build(data, filters) {
      const rows = data.work_orders
        .filter((order) => {
          if (!inPeriod(order.opened_at, filters.range)) return false;
          if (filters.customerId && order.customer_id !== filters.customerId) return false;
          if (filters.vehicleId && order.vehicle_id !== filters.vehicleId) return false;
          if (filters.status && order.status !== filters.status) return false;
          return true;
        })
        .sort((a, b) => b.order_number - a.order_number);

      return {
        columns: [
          { header: "OS" },
          { header: "Abertura" },
          { header: "Cliente" },
          { header: "Veículo" },
          { header: "Status" },
          { header: "Total", align: MONEY },
        ],
        rows: rows.map((order) => {
          const vehicle = data.vehicles.find((v) => v.id === order.vehicle_id);
          return [
            `#${order.order_number}`,
            formatDate(order.opened_at),
            data.customers.find((c) => c.id === order.customer_id)?.name ?? "—",
            vehicle ? formatPlate(vehicle.plate) : "—",
            WORK_ORDER_STATUS[order.status].label,
            formatCurrency(order.total),
          ];
        }),
        totals: [
          ["OS", String(rows.length)],
          [
            "Total",
            formatCurrency(
              sum(rows.filter((o) => o.status !== "cancelled").map((order) => order.total)),
            ),
          ],
        ],
        summary: [`${rows.length} OS no período`],
      };
    },
  },
  {
    id: "os-por-status",
    name: "OS por status",
    description: "Distribuição das ordens de serviço por situação.",
    group: "Oficina",
    filters: ["period"],
    build(data, filters) {
      const orders = data.work_orders.filter((order) =>
        inPeriod(order.opened_at, filters.range),
      );
      const map = new Map<string, { count: number; total: number }>();
      for (const order of orders) {
        const label = WORK_ORDER_STATUS[order.status].label;
        const current = map.get(label) ?? { count: 0, total: 0 };
        map.set(label, { count: current.count + 1, total: current.total + order.total });
      }
      const rows = [...map.entries()].sort((a, b) => b[1].count - a[1].count);

      return {
        columns: [
          { header: "Status" },
          { header: "Quantidade", align: "center" as Align },
          { header: "Participação", align: MONEY },
          { header: "Valor", align: MONEY },
        ],
        rows: rows.map(([label, info]) => [
          label,
          info.count,
          formatPercent(orders.length ? (info.count / orders.length) * 100 : 0, 0),
          formatCurrency(info.total),
        ]),
        totals: [["Total de OS", String(orders.length)]],
        summary: [`${orders.length} OS no período`],
      };
    },
  },
  {
    id: "os-por-mecanico",
    name: "OS por mecânico",
    description: "Produção de cada mecânico no período.",
    group: "Oficina",
    filters: ["period"],
    build(data, filters) {
      const orders = data.work_orders.filter(
        (order) => order.status !== "cancelled" && inPeriod(order.opened_at, filters.range),
      );
      const map = new Map<string, { count: number; total: number }>();
      for (const order of orders) {
        const key = order.mechanic_id ?? "—";
        const current = map.get(key) ?? { count: 0, total: 0 };
        map.set(key, { count: current.count + 1, total: current.total + order.total });
      }
      const rows = [...map.entries()]
        .map(([mechanicId, info]) => ({
          name: data.profiles.find((p) => p.id === mechanicId)?.name ?? "Não atribuído",
          ...info,
        }))
        .sort((a, b) => b.total - a.total);

      return {
        columns: [
          { header: "Mecânico" },
          { header: "OS", align: "center" as Align },
          { header: "Ticket médio", align: MONEY },
          { header: "Total", align: MONEY },
        ],
        rows: rows.map((row) => [
          row.name,
          row.count,
          formatCurrency(row.total / Math.max(1, row.count)),
          formatCurrency(row.total),
        ]),
        totals: [["Total", formatCurrency(sum(rows.map((r) => r.total)))]],
        summary: [`${orders.length} OS distribuídas entre ${rows.length} mecânico(s)`],
      };
    },
  },
  {
    id: "veiculos-atendidos",
    name: "Veículos atendidos",
    description: "Veículos que passaram pela oficina no período.",
    group: "Oficina",
    filters: ["period", "customer"],
    build(data, filters) {
      const orders = validOrders(data, filters);
      const map = new Map<string, { count: number; last: string; km: number | null }>();
      for (const order of orders) {
        const current = map.get(order.vehicle_id);
        map.set(order.vehicle_id, {
          count: (current?.count ?? 0) + 1,
          last: current && current.last > order.opened_at ? current.last : order.opened_at,
          km: order.current_mileage ?? current?.km ?? null,
        });
      }
      const rows = [...map.entries()]
        .map(([vehicleId, info]) => {
          const vehicle = data.vehicles.find((v) => v.id === vehicleId);
          return {
            plate: vehicle ? formatPlate(vehicle.plate) : "—",
            model: vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() : "—",
            owner: data.customers.find((c) => c.id === vehicle?.customer_id)?.name ?? "—",
            ...info,
          };
        })
        .sort((a, b) => b.last.localeCompare(a.last));

      return {
        columns: [
          { header: "Placa" },
          { header: "Veículo" },
          { header: "Proprietário" },
          { header: "Visitas", align: "center" as Align },
          { header: "KM" , align: MONEY },
          { header: "Última visita" },
        ],
        rows: rows.map((row) => [
          row.plate,
          row.model,
          row.owner,
          row.count,
          row.km ? formatNumber(row.km) : "—",
          formatDate(row.last),
        ]),
        totals: [["Veículos", String(rows.length)]],
        summary: [`${rows.length} veículo(s) atendidos`],
      };
    },
  },
  {
    id: "historico-manutencao",
    name: "Histórico de manutenção",
    description: "Serviços e peças aplicados, item a item. Ideal filtrando por veículo.",
    group: "Oficina",
    filters: ["period", "customer", "vehicle"],
    build(data, filters) {
      const orders = validOrders(data, filters);
      const rows: (string | number)[][] = [];
      for (const order of orders.sort((a, b) => b.opened_at.localeCompare(a.opened_at))) {
        const vehicle = data.vehicles.find((v) => v.id === order.vehicle_id);
        for (const item of data.work_order_services.filter((s) => s.work_order_id === order.id)) {
          rows.push([
            formatDate(order.opened_at),
            `#${order.order_number}`,
            vehicle ? formatPlate(vehicle.plate) : "—",
            "Serviço",
            item.description,
            item.quantity,
            formatCurrency(item.total),
          ]);
        }
        for (const item of data.work_order_products.filter((p) => p.work_order_id === order.id)) {
          rows.push([
            formatDate(order.opened_at),
            `#${order.order_number}`,
            vehicle ? formatPlate(vehicle.plate) : "—",
            "Peça",
            item.description,
            item.quantity,
            formatCurrency(item.total),
          ]);
        }
      }

      return {
        columns: [
          { header: "Data" },
          { header: "OS" },
          { header: "Placa" },
          { header: "Tipo" },
          { header: "Descrição" },
          { header: "Qtd.", align: "center" as Align },
          { header: "Valor", align: MONEY },
        ],
        rows,
        totals: [["Itens", String(rows.length)]],
        summary: [`${rows.length} item(ns) no histórico`],
      };
    },
  },

  // ------------------------------------------------------------ FORNECEDORES
  {
    id: "compras-por-fornecedor",
    name: "Compras por fornecedor",
    description: "Volume comprado de cada fornecedor no período.",
    group: "Fornecedores",
    filters: ["period", "supplier"],
    build(data, filters) {
      const expenses = data.expenses.filter(
        (expense) =>
          expense.status !== "cancelled" &&
          expense.supplier_id &&
          inPeriod(expense.due_date, filters.range) &&
          (!filters.supplierId || expense.supplier_id === filters.supplierId),
      );
      const map = new Map<string, { total: number; paid: number; count: number }>();
      for (const expense of expenses) {
        const key = expense.supplier_id as string;
        const current = map.get(key) ?? { total: 0, paid: 0, count: 0 };
        map.set(key, {
          total: current.total + expense.amount,
          paid: current.paid + expense.paid_amount,
          count: current.count + 1,
        });
      }
      const rows = [...map.entries()]
        .map(([supplierId, info]) => {
          const supplier = data.suppliers.find((s) => s.id === supplierId);
          return {
            name: supplier ? (supplier.trade_name ?? supplier.company_name) : "—",
            ...info,
          };
        })
        .sort((a, b) => b.total - a.total);

      return {
        columns: [
          { header: "Fornecedor" },
          { header: "Títulos", align: "center" as Align },
          { header: "Pago", align: MONEY },
          { header: "Em aberto", align: MONEY },
          { header: "Total", align: MONEY },
        ],
        rows: rows.map((row) => [
          row.name,
          row.count,
          formatCurrency(row.paid),
          formatCurrency(row.total - row.paid),
          formatCurrency(row.total),
        ]),
        totals: [["Total comprado", formatCurrency(sum(rows.map((r) => r.total)))]],
        summary: [`Total comprado: ${formatCurrency(sum(rows.map((r) => r.total)))}`],
      };
    },
  },
  {
    id: "despesas-por-fornecedor",
    name: "Despesas por fornecedor",
    description: "Lançamento a lançamento, agrupado por fornecedor.",
    group: "Fornecedores",
    filters: ["period", "supplier", "status"],
    build(data, filters) {
      const rows = data.expenses
        .filter(
          (expense) =>
            expense.supplier_id &&
            inPeriod(expense.due_date, filters.range) &&
            (!filters.supplierId || expense.supplier_id === filters.supplierId) &&
            (!filters.status || expense.status === filters.status),
        )
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      return {
        columns: [
          { header: "Fornecedor" },
          { header: "Vencimento" },
          { header: "Descrição" },
          { header: "Situação" },
          { header: "Valor", align: MONEY },
        ],
        rows: rows.map((expense) => {
          const supplier = data.suppliers.find((s) => s.id === expense.supplier_id);
          return [
            supplier ? (supplier.trade_name ?? supplier.company_name) : "—",
            formatDate(expense.due_date),
            expense.description,
            ENTRY_STATUS[expense.status].label,
            formatCurrency(expense.amount),
          ];
        }),
        totals: [["Total", formatCurrency(sum(rows.map((e) => e.amount)))]],
        summary: [`Total: ${formatCurrency(sum(rows.map((e) => e.amount)))}`],
      };
    },
  },
];

export function findReport(id: string): ReportDefinition | undefined {
  return REPORTS.find((report) => report.id === id);
}

export const REPORT_GROUPS = ["Financeiros", "Comerciais", "Oficina", "Fornecedores"] as const;

export const PAYMENT_METHOD_FILTER_OPTIONS = Object.entries(PAYMENT_METHOD).map(
  ([value, label]) => ({ value, label }),
);
