import type {
  AuditLog,
  Customer,
  Expense,
  InventoryMovement,
  Payment,
  Product,
  Profile,
  Revenue,
  Service,
  Supplier,
  Vehicle,
  WorkOrder,
  WorkOrderProduct,
  WorkOrderService,
  WorkshopSettings,
} from "@/types";

/** Estado completo da oficina em memória. */
export interface Snapshot {
  profiles: Profile[];
  customers: Customer[];
  vehicles: Vehicle[];
  suppliers: Supplier[];
  services: Service[];
  products: Product[];
  work_orders: WorkOrder[];
  work_order_services: WorkOrderService[];
  work_order_products: WorkOrderProduct[];
  revenues: Revenue[];
  expenses: Expense[];
  payments: Payment[];
  inventory_movements: InventoryMovement[];
  audit_logs: AuditLog[];
  settings: WorkshopSettings;
}

export type TableName = Exclude<keyof Snapshot, "settings">;
export type RowOf<T extends TableName> = Snapshot[T][number];

export const TABLES: TableName[] = [
  "profiles",
  "customers",
  "vehicles",
  "suppliers",
  "services",
  "products",
  "work_orders",
  "work_order_services",
  "work_order_products",
  "revenues",
  "expenses",
  "payments",
  "inventory_movements",
  "audit_logs",
];

export const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export const DEFAULT_SETTINGS: WorkshopSettings = {
  id: SETTINGS_ID,
  company_name: "Chicão Car",
  document: null,
  phone: null,
  whatsapp: null,
  email: null,
  address: null,
  city: null,
  state: null,
  zip_code: null,
  logo_url: null,
  bank_details: null,
  pix_key: null,
  quote_terms:
    "Orçamento sujeito a alteração após desmontagem e diagnóstico completo. Peças sob encomenda podem alterar o prazo de entrega.",
  order_terms:
    "Garantia de 90 dias sobre os serviços executados, conforme o Código de Defesa do Consumidor.",
  document_footer: "Chicão Car — Oficina Mecânica · Obrigado pela preferência!",
  quote_valid_days: 7,
  updated_at: new Date().toISOString(),
};

export function emptySnapshot(): Snapshot {
  return {
    profiles: [],
    customers: [],
    vehicles: [],
    suppliers: [],
    services: [],
    products: [],
    work_orders: [],
    work_order_services: [],
    work_order_products: [],
    revenues: [],
    expenses: [],
    payments: [],
    inventory_movements: [],
    audit_logs: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}
