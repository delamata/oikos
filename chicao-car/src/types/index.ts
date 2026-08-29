/**
 * Modelo de domínio do Chicão Car.
 *
 * Os nomes de campo são exatamente os nomes das colunas no Postgres (snake_case)
 * para que as linhas do Supabase possam ser usadas sem nenhuma camada de
 * conversão entre o banco e a interface.
 */

export type UserRole = "admin" | "manager" | "mechanic" | "financial";

export type WorkOrderStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "delivered"
  | "cancelled";

/** Situação de quitação de uma OS. */
export type OrderPaymentStatus = "unpaid" | "partial" | "paid";

/** Situação de um lançamento financeiro (receita ou despesa). */
export type EntryStatus = "pending" | "paid" | "overdue" | "cancelled";

export type PaymentMethod =
  | "cash"
  | "pix"
  | "debit"
  | "credit"
  | "boleto"
  | "transfer"
  | "other";

export type MovementType = "entry" | "exit" | "adjustment" | "return";

export type FuelType =
  | "flex"
  | "gasoline"
  | "ethanol"
  | "diesel"
  | "gnv"
  | "hybrid"
  | "electric";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  version: string | null;
  year: number | null;
  model_year: number | null;
  color: string | null;
  fuel_type: FuelType | null;
  mileage: number | null;
  chassis: string | null;
  renavam: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  company_name: string;
  trade_name: string | null;
  document: string | null;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  default_price: number;
  estimated_minutes: number | null;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: string | null;
  supplier_id: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  minimum_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  order_number: number;
  customer_id: string;
  vehicle_id: string;
  mechanic_id: string | null;
  status: WorkOrderStatus;
  opened_at: string;
  expected_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  current_mileage: number | null;
  customer_complaint: string | null;
  diagnosis: string | null;
  internal_notes: string | null;
  subtotal_services: number;
  subtotal_products: number;
  discount: number;
  total: number;
  payment_status: OrderPaymentStatus;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderService {
  id: string;
  work_order_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface WorkOrderProduct {
  id: string;
  work_order_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  discount: number;
  total: number;
}

export interface Revenue {
  id: string;
  description: string;
  customer_id: string | null;
  work_order_id: string | null;
  category: string | null;
  amount: number;
  /** Total já recebido — permite recebimento parcial. */
  paid_amount: number;
  payment_method: PaymentMethod | null;
  due_date: string;
  payment_date: string | null;
  status: EntryStatus;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  supplier_id: string | null;
  description: string;
  category: string | null;
  amount: number;
  paid_amount: number;
  due_date: string;
  payment_date: string | null;
  payment_method: PaymentMethod | null;
  status: EntryStatus;
  recurring: boolean;
  notes: string | null;
  created_at: string;
}

/** Baixa (total ou parcial) de uma receita ou despesa. */
export interface Payment {
  id: string;
  revenue_id: string | null;
  expense_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  paid_at: string;
  notes: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  unit_cost: number | null;
  work_order_id: string | null;
  supplier_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string | null;
  before_values: Record<string, unknown> | null;
  after_values: Record<string, unknown> | null;
  created_at: string;
}

export interface WorkshopSettings {
  id: string;
  company_name: string;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
  bank_details: string | null;
  pix_key: string | null;
  quote_terms: string | null;
  order_terms: string | null;
  document_footer: string | null;
  quote_valid_days: number;
  updated_at: string;
}
