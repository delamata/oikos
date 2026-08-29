import type {
  Customer,
  Profile,
  Revenue,
  Vehicle,
  WorkOrder,
  WorkOrderProduct,
  WorkOrderService,
  WorkOrderStatus,
} from "@/types";
import { OPEN_WORK_ORDER_STATUS } from "@/lib/constants";

export interface WorkOrderView extends WorkOrder {
  customer: Customer | null;
  vehicle: Vehicle | null;
  mechanic: Profile | null;
  services: WorkOrderService[];
  products: WorkOrderProduct[];
  revenues: Revenue[];
}

export function buildWorkOrderView(
  order: WorkOrder,
  ctx: {
    customers: Customer[];
    vehicles: Vehicle[];
    profiles: Profile[];
    work_order_services: WorkOrderService[];
    work_order_products: WorkOrderProduct[];
    revenues: Revenue[];
  },
): WorkOrderView {
  return {
    ...order,
    customer: ctx.customers.find((c) => c.id === order.customer_id) ?? null,
    vehicle: ctx.vehicles.find((v) => v.id === order.vehicle_id) ?? null,
    mechanic: ctx.profiles.find((p) => p.id === order.mechanic_id) ?? null,
    services: ctx.work_order_services.filter((s) => s.work_order_id === order.id),
    products: ctx.work_order_products.filter((p) => p.work_order_id === order.id),
    revenues: ctx.revenues.filter((r) => r.work_order_id === order.id),
  };
}

export function itemTotal(quantity: number, unitPrice: number, discount: number): number {
  return Math.max(0, Math.round((quantity * unitPrice - discount) * 100) / 100);
}

export function computeTotals(
  services: Pick<WorkOrderService, "total">[],
  products: Pick<WorkOrderProduct, "total">[],
  discount: number,
) {
  const subtotal_services = round(services.reduce((sum, s) => sum + s.total, 0));
  const subtotal_products = round(products.reduce((sum, p) => sum + p.total, 0));
  const total = round(Math.max(0, subtotal_services + subtotal_products - discount));
  return { subtotal_services, subtotal_products, total };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function nextOrderNumber(orders: WorkOrder[]): number {
  return orders.reduce((max, o) => Math.max(max, o.order_number), 1000) + 1;
}

/** Transições permitidas — evita pular etapas do fluxo da oficina. */
export const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ["awaiting_approval", "approved", "cancelled"],
  awaiting_approval: ["approved", "draft", "cancelled"],
  approved: ["in_progress", "waiting_parts", "cancelled"],
  in_progress: ["waiting_parts", "completed", "cancelled"],
  waiting_parts: ["in_progress", "completed", "cancelled"],
  completed: ["delivered", "in_progress"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isOpen(order: WorkOrder): boolean {
  return OPEN_WORK_ORDER_STATUS.includes(order.status);
}

/** Rótulo curto usado em listas e no compartilhamento. */
export function orderLabel(order: Pick<WorkOrder, "order_number">): string {
  return `OS #${order.order_number}`;
}

export function amountOutstanding(order: WorkOrder, revenues: Revenue[]): number {
  const linked = revenues.filter((r) => r.work_order_id === order.id && r.status !== "cancelled");
  if (linked.length === 0) return order.total;
  const paid = linked.reduce((sum, r) => sum + r.paid_amount, 0);
  return round(Math.max(0, order.total - paid));
}
