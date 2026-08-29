import type {
  EntryStatus,
  FuelType,
  MovementType,
  OrderPaymentStatus,
  PaymentMethod,
  UserRole,
  WorkOrderStatus,
} from "@/types";

export type Tone = "neutral" | "info" | "warn" | "ok" | "danger" | "accent" | "violet";

interface Option<T extends string> {
  value: T;
  label: string;
  tone: Tone;
}

export const WORK_ORDER_STATUS: Record<WorkOrderStatus, { label: string; tone: Tone; short: string }> = {
  draft: { label: "Rascunho", tone: "neutral", short: "Rascunho" },
  awaiting_approval: { label: "Aguardando aprovação", tone: "warn", short: "Aguardando" },
  approved: { label: "Aprovada", tone: "info", short: "Aprovada" },
  in_progress: { label: "Em execução", tone: "accent", short: "Em execução" },
  waiting_parts: { label: "Aguardando peças", tone: "violet", short: "Peças" },
  completed: { label: "Concluída", tone: "ok", short: "Concluída" },
  delivered: { label: "Entregue", tone: "ok", short: "Entregue" },
  cancelled: { label: "Cancelada", tone: "danger", short: "Cancelada" },
};

/** Ordem em que os status aparecem na timeline da OS. */
export const WORK_ORDER_FLOW: WorkOrderStatus[] = [
  "draft",
  "awaiting_approval",
  "approved",
  "in_progress",
  "waiting_parts",
  "completed",
  "delivered",
];

export const OPEN_WORK_ORDER_STATUS: WorkOrderStatus[] = [
  "draft",
  "awaiting_approval",
  "approved",
  "in_progress",
  "waiting_parts",
];

/** Status em que o veículo está fisicamente na oficina. */
export const IN_SHOP_STATUS: WorkOrderStatus[] = ["in_progress", "waiting_parts"];

export const WORK_ORDER_STATUS_OPTIONS: Option<WorkOrderStatus>[] = (
  Object.keys(WORK_ORDER_STATUS) as WorkOrderStatus[]
).map((value) => ({ value, label: WORK_ORDER_STATUS[value].label, tone: WORK_ORDER_STATUS[value].tone }));

export const ORDER_PAYMENT_STATUS: Record<OrderPaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: "Não pago", tone: "danger" },
  partial: { label: "Parcial", tone: "warn" },
  paid: { label: "Pago", tone: "ok" },
};

export const ENTRY_STATUS: Record<EntryStatus, { label: string; tone: Tone }> = {
  pending: { label: "Em aberto", tone: "warn" },
  paid: { label: "Quitado", tone: "ok" },
  overdue: { label: "Vencido", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

export const ENTRY_STATUS_OPTIONS: Option<EntryStatus>[] = (
  Object.keys(ENTRY_STATUS) as EntryStatus[]
).map((value) => ({ value, label: ENTRY_STATUS[value].label, tone: ENTRY_STATUS[value].tone }));

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  debit: "Débito",
  credit: "Crédito",
  boleto: "Boleto",
  transfer: "Transferência",
  other: "Outros",
};

export const PAYMENT_METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD) as PaymentMethod[]).map(
  (value) => ({ value, label: PAYMENT_METHOD[value] }),
);

export const USER_ROLE: Record<UserRole, { label: string; description: string }> = {
  admin: { label: "Administrador", description: "Acesso total ao sistema" },
  manager: { label: "Gerente", description: "Operação da oficina e relatórios" },
  mechanic: { label: "Mecânico", description: "Visualiza e atualiza ordens de serviço" },
  financial: { label: "Financeiro", description: "Receitas, despesas, baixas e relatórios" },
};

export const USER_ROLE_OPTIONS = (Object.keys(USER_ROLE) as UserRole[]).map((value) => ({
  value,
  label: USER_ROLE[value].label,
}));

export const MOVEMENT_TYPE: Record<MovementType, { label: string; tone: Tone }> = {
  entry: { label: "Entrada", tone: "ok" },
  exit: { label: "Saída", tone: "danger" },
  adjustment: { label: "Ajuste", tone: "info" },
  return: { label: "Devolução", tone: "warn" },
};

export const FUEL_TYPE: Record<FuelType, string> = {
  flex: "Flex",
  gasoline: "Gasolina",
  ethanol: "Etanol",
  diesel: "Diesel",
  gnv: "GNV",
  hybrid: "Híbrido",
  electric: "Elétrico",
};

export const FUEL_TYPE_OPTIONS = (Object.keys(FUEL_TYPE) as FuelType[]).map((value) => ({
  value,
  label: FUEL_TYPE[value],
}));

export const EXPENSE_CATEGORIES = [
  "Peças",
  "Fornecedores",
  "Aluguel",
  "Água",
  "Energia",
  "Internet",
  "Salários",
  "Impostos",
  "Ferramentas",
  "Manutenção",
  "Marketing",
  "Combustível",
  "Outros",
] as const;

export const REVENUE_CATEGORIES = [
  "Serviços",
  "Peças",
  "Venda de produtos",
  "Guincho",
  "Outros",
] as const;

export const SERVICE_CATEGORIES = [
  "Manutenção preventiva",
  "Freios",
  "Suspensão",
  "Motor",
  "Elétrica",
  "Alinhamento e balanceamento",
  "Ar-condicionado",
  "Diagnóstico",
  "Funilaria",
  "Outros",
] as const;

export const PRODUCT_CATEGORIES = [
  "Lubrificantes",
  "Filtros",
  "Freios",
  "Suspensão",
  "Motor",
  "Elétrica",
  "Pneus",
  "Acessórios",
  "Outros",
] as const;

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
