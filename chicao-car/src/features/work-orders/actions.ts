"use client";

import * as React from "react";
import { addDays } from "date-fns";
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { computeTotals, nextOrderNumber } from "@/lib/domain/work-orders";
import { formatCurrency } from "@/lib/utils/format";
import type {
  PaymentMethod,
  WorkOrder,
  WorkOrderProduct,
  WorkOrderService,
  WorkOrderStatus,
} from "@/types";

export interface NewOrderInput {
  customer_id: string;
  vehicle_id: string;
  mechanic_id: string | null;
  current_mileage: number | null;
  customer_complaint: string | null;
  expected_at: string | null;
}

/**
 * Operações da ordem de serviço. Concentradas aqui para que as telas cuidem
 * só da interface: recálculo de totais, transições de status, baixa de estoque
 * e geração do recebível acontecem sempre da mesma forma.
 */
export function useWorkOrderActions() {
  const data = useData();
  const {
    insert,
    insertMany,
    update,
    remove,
    audit,
    work_orders,
    work_order_services,
    work_order_products,
    products,
    revenues,
    inventory_movements,
  } = data;

  const recalc = React.useCallback(
    async (orderId: string, overrides?: { discount?: number }) => {
      const order = work_orders.find((o) => o.id === orderId);
      if (!order) return;
      const services = work_order_services.filter((s) => s.work_order_id === orderId);
      const items = work_order_products.filter((p) => p.work_order_id === orderId);
      const discount = overrides?.discount ?? order.discount;
      const totals = computeTotals(services, items, discount);
      await update("work_orders", orderId, {
        ...totals,
        discount,
        updated_at: new Date().toISOString(),
      });
    },
    [work_orders, work_order_services, work_order_products, update],
  );

  const createOrder = React.useCallback(
    async (input: NewOrderInput, createdBy: string | null) => {
      const now = new Date().toISOString();
      const order: WorkOrder = {
        id: newId(),
        order_number: nextOrderNumber(work_orders),
        customer_id: input.customer_id,
        vehicle_id: input.vehicle_id,
        mechanic_id: input.mechanic_id,
        status: "draft",
        opened_at: now,
        expected_at: input.expected_at,
        completed_at: null,
        delivered_at: null,
        current_mileage: input.current_mileage,
        customer_complaint: input.customer_complaint,
        diagnosis: null,
        internal_notes: null,
        subtotal_services: 0,
        subtotal_products: 0,
        discount: 0,
        total: 0,
        payment_status: "unpaid",
        approved_at: null,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      };
      const saved = await insert("work_orders", order);

      // a quilometragem informada na OS atualiza o cadastro do veículo
      if (input.current_mileage != null) {
        const vehicle = data.vehicles.find((v) => v.id === input.vehicle_id);
        if (vehicle && (vehicle.mileage ?? 0) < input.current_mileage) {
          await update("vehicles", vehicle.id, {
            mileage: input.current_mileage,
            updated_at: now,
          });
        }
      }

      await audit({
        action: "create",
        entity: "work_orders",
        entity_id: saved.id,
        summary: `OS #${saved.order_number} aberta`,
      });
      return saved;
    },
    [work_orders, insert, update, audit, data.vehicles],
  );

  const addServiceItem = React.useCallback(
    async (
      orderId: string,
      item: Omit<WorkOrderService, "id" | "work_order_id" | "total"> & { total?: number },
    ) => {
      const total = Math.max(0, item.quantity * item.unit_price - item.discount);
      await insert("work_order_services", {
        id: newId(),
        work_order_id: orderId,
        service_id: item.service_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: Math.round(total * 100) / 100,
      });
    },
    [insert],
  );

  const addProductItem = React.useCallback(
    async (
      orderId: string,
      item: Omit<WorkOrderProduct, "id" | "work_order_id" | "total"> & { total?: number },
    ) => {
      const total = Math.max(0, item.quantity * item.unit_price - item.discount);
      await insert("work_order_products", {
        id: newId(),
        work_order_id: orderId,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        unit_price: item.unit_price,
        discount: item.discount,
        total: Math.round(total * 100) / 100,
      });
    },
    [insert],
  );

  const removeServiceItem = React.useCallback(
    async (id: string) => remove("work_order_services", id),
    [remove],
  );

  const removeProductItem = React.useCallback(
    async (id: string) => remove("work_order_products", id),
    [remove],
  );

  /** Baixa do estoque das peças aplicadas — executada uma única vez por OS. */
  const consumeStock = React.useCallback(
    async (order: WorkOrder) => {
      const alreadyDone = inventory_movements.some(
        (movement) => movement.work_order_id === order.id && movement.type === "exit",
      );
      if (alreadyDone) return;

      const items = work_order_products.filter(
        (item) => item.work_order_id === order.id && item.product_id,
      );
      if (items.length === 0) return;

      const now = new Date().toISOString();
      await insertMany(
        "inventory_movements",
        items.map((item) => ({
          id: newId(),
          product_id: item.product_id as string,
          type: "exit" as const,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          work_order_id: order.id,
          supplier_id: null,
          notes: `Aplicada na OS #${order.order_number}`,
          created_at: now,
        })),
      );

      for (const item of items) {
        const product = products.find((p) => p.id === item.product_id);
        if (!product) continue;
        await update("products", product.id, {
          stock_quantity: Math.max(0, product.stock_quantity - item.quantity),
          updated_at: now,
        });
      }
    },
    [inventory_movements, work_order_products, products, insertMany, update],
  );

  /** Gera o contas a receber da OS, caso ainda não exista. */
  const ensureReceivable = React.useCallback(
    async (order: WorkOrder) => {
      if (order.total <= 0) return;
      const existing = revenues.find(
        (revenue) => revenue.work_order_id === order.id && revenue.status !== "cancelled",
      );
      if (existing) {
        if (existing.amount !== order.total && existing.paid_amount === 0) {
          await update("revenues", existing.id, { amount: order.total });
        }
        return;
      }
      const vehicle = data.vehicles.find((v) => v.id === order.vehicle_id);
      await insert("revenues", {
        id: newId(),
        description: `OS #${order.order_number}${vehicle ? ` — ${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trimEnd() : ""}`,
        customer_id: order.customer_id,
        work_order_id: order.id,
        category: "Serviços",
        amount: order.total,
        paid_amount: 0,
        payment_method: null,
        due_date: addDays(new Date(), 0).toISOString().slice(0, 10),
        payment_date: null,
        status: "pending",
        notes: null,
        created_at: new Date().toISOString(),
      });
    },
    [revenues, insert, update, data.vehicles],
  );

  const changeStatus = React.useCallback(
    async (order: WorkOrder, next: WorkOrderStatus) => {
      const now = new Date().toISOString();
      const patch: Partial<WorkOrder> = { status: next, updated_at: now };

      if (next === "approved") patch.approved_at = order.approved_at ?? now;
      if (next === "completed") patch.completed_at = order.completed_at ?? now;
      if (next === "delivered") {
        patch.delivered_at = now;
        patch.completed_at = order.completed_at ?? now;
      }

      await update("work_orders", order.id, patch);

      if (next === "completed" || next === "delivered") {
        await consumeStock(order);
        await ensureReceivable(order);
      }

      await audit({
        action: next === "cancelled" ? "cancel" : "status_change",
        entity: "work_orders",
        entity_id: order.id,
        summary: `OS #${order.order_number}: ${order.status} → ${next}`,
        before: { status: order.status },
        after: { status: next },
      });
    },
    [update, consumeStock, ensureReceivable, audit],
  );

  /**
   * Registra um pagamento da OS: cria a baixa, atualiza o recebível e ajusta a
   * situação de pagamento da ordem (não pago / parcial / pago).
   */
  const registerPayment = React.useCallback(
    async (
      order: WorkOrder,
      input: { amount: number; method: PaymentMethod; paidAt: string; notes?: string | null },
    ) => {
      await ensureReceivable(order);
      const revenue =
        revenues.find((r) => r.work_order_id === order.id && r.status !== "cancelled") ?? null;

      const now = new Date().toISOString();
      const alreadyPaid = revenue?.paid_amount ?? 0;
      const paidTotal = Math.round((alreadyPaid + input.amount) * 100) / 100;
      const fullyPaid = paidTotal >= order.total - 0.005;

      if (revenue) {
        await update("revenues", revenue.id, {
          paid_amount: paidTotal,
          payment_method: input.method,
          payment_date: fullyPaid ? input.paidAt : revenue.payment_date,
          status: fullyPaid ? "paid" : "pending",
        });
        await insert("payments", {
          id: newId(),
          revenue_id: revenue.id,
          expense_id: null,
          amount: input.amount,
          payment_method: input.method,
          paid_at: input.paidAt,
          notes: input.notes ?? null,
          created_at: now,
        });
      }

      await update("work_orders", order.id, {
        payment_status: fullyPaid ? "paid" : paidTotal > 0 ? "partial" : "unpaid",
        updated_at: now,
      });

      await audit({
        action: "payment",
        entity: "work_orders",
        entity_id: order.id,
        summary: `Pagamento de ${formatCurrency(input.amount)} na OS #${order.order_number}`,
        after: { paid_amount: paidTotal, payment_method: input.method },
      });
    },
    [ensureReceivable, revenues, update, insert, audit],
  );

  const applyDiscount = React.useCallback(
    async (order: WorkOrder, discount: number) => {
      await recalc(order.id, { discount });
      if (discount !== order.discount) {
        await audit({
          action: "discount",
          entity: "work_orders",
          entity_id: order.id,
          summary: `Desconto na OS #${order.order_number}: ${formatCurrency(discount)}`,
          before: { discount: order.discount },
          after: { discount },
        });
      }
    },
    [recalc, audit],
  );

  return {
    createOrder,
    recalc,
    addServiceItem,
    addProductItem,
    removeServiceItem,
    removeProductItem,
    changeStatus,
    registerPayment,
    applyDiscount,
    ensureReceivable,
  };
}
