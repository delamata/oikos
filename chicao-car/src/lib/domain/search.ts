import type { Customer, Vehicle, WorkOrder } from "@/types";
import { formatPlate, normalize, onlyDigits } from "@/lib/utils/format";

export interface SearchResult {
  id: string;
  type: "customer" | "vehicle" | "work_order";
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

/**
 * Busca global do balcão: nome, telefone, documento, placa, modelo ou número da
 * OS. Roda sobre os dados já carregados em memória — resposta instantânea.
 */
export function globalSearch(
  term: string,
  data: { customers: Customer[]; vehicles: Vehicle[]; work_orders: WorkOrder[] },
  limit = 12,
): SearchResult[] {
  const raw = term.trim();
  if (raw.length < 2) return [];

  const q = normalize(raw);
  const digits = onlyDigits(raw);
  const plateQuery = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const results: SearchResult[] = [];

  for (const customer of data.customers) {
    let score = 0;
    const name = normalize(customer.name);
    if (name.startsWith(q)) score = 100;
    else if (name.includes(q)) score = 70;
    if (digits.length >= 3) {
      if (onlyDigits(customer.phone ?? "").includes(digits)) score = Math.max(score, 85);
      if (onlyDigits(customer.whatsapp ?? "").includes(digits)) score = Math.max(score, 85);
      if (onlyDigits(customer.document ?? "").includes(digits)) score = Math.max(score, 95);
    }
    if (score > 0) {
      results.push({
        id: customer.id,
        type: "customer",
        title: customer.name,
        subtitle: [customer.phone, customer.city].filter(Boolean).join(" · ") || "Cliente",
        href: `/clientes/${customer.id}`,
        score,
      });
    }
  }

  for (const vehicle of data.vehicles) {
    const owner = data.customers.find((c) => c.id === vehicle.customer_id);
    const plate = vehicle.plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const model = normalize(`${vehicle.brand ?? ""} ${vehicle.model ?? ""} ${vehicle.version ?? ""}`);
    let score = 0;
    if (plateQuery.length >= 2 && plate.startsWith(plateQuery)) score = 110;
    else if (plateQuery.length >= 3 && plate.includes(plateQuery)) score = 90;
    else if (model.includes(q)) score = 60;
    if (score > 0) {
      results.push({
        id: vehicle.id,
        type: "vehicle",
        title: `${formatPlate(vehicle.plate)} · ${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim(),
        subtitle: owner?.name ?? "Sem proprietário",
        href: `/veiculos/${vehicle.id}`,
        score,
      });
    }
  }

  if (digits.length >= 2) {
    for (const order of data.work_orders) {
      const number = String(order.order_number);
      if (!number.includes(digits)) continue;
      const customer = data.customers.find((c) => c.id === order.customer_id);
      const vehicle = data.vehicles.find((v) => v.id === order.vehicle_id);
      results.push({
        id: order.id,
        type: "work_order",
        title: `OS #${order.order_number}`,
        subtitle: [customer?.name, vehicle ? formatPlate(vehicle.plate) : null]
          .filter(Boolean)
          .join(" · "),
        href: `/ordens/${order.id}`,
        score: number === digits ? 120 : 80,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
