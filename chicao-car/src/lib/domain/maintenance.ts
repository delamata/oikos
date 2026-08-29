import { addMonths, differenceInMonths, parseISO } from "date-fns";
import type { WorkOrder, WorkOrderService, Vehicle } from "@/types";

export interface Recommendation {
  title: string;
  detail: string;
  urgency: "due" | "soon" | "ok";
}

/** Regras de revisão usadas para sugerir a próxima manutenção. */
const RULES: { match: RegExp; label: string; km: number; months: number }[] = [
  { match: /óleo|oleo/i, label: "Troca de óleo e filtro", km: 10_000, months: 12 },
  { match: /alinhament|balanceament/i, label: "Alinhamento e balanceamento", km: 10_000, months: 12 },
  { match: /pastilha|freio/i, label: "Revisão do sistema de freios", km: 20_000, months: 24 },
  { match: /correia/i, label: "Troca da correia dentada", km: 60_000, months: 60 },
  { match: /vela/i, label: "Troca de velas de ignição", km: 40_000, months: 36 },
  { match: /ar-condicionado|higieniz/i, label: "Higienização do ar-condicionado", km: 30_000, months: 12 },
];

/**
 * Sugere as próximas manutenções a partir do que já foi executado no veículo,
 * cruzando quilometragem e tempo decorrido. Não é diagnóstico — é lembrete.
 */
export function buildRecommendations(
  vehicle: Vehicle,
  orders: WorkOrder[],
  services: WorkOrderService[],
  today = new Date(),
): Recommendation[] {
  const currentMileage = vehicle.mileage ?? 0;
  const done = orders
    .filter((order) => order.status === "delivered" || order.status === "completed")
    .sort((a, b) => a.opened_at.localeCompare(b.opened_at));

  const recommendations: Recommendation[] = [];

  for (const rule of RULES) {
    const matching = done.filter((order) =>
      services.some((item) => item.work_order_id === order.id && rule.match.test(item.description)),
    );
    const last = matching.at(-1);
    if (!last) continue;

    const lastMileage = last.current_mileage ?? 0;
    const nextMileage = lastMileage + rule.km;
    const lastDate = parseISO(last.opened_at);
    const nextDate = addMonths(lastDate, rule.months);
    const kmRemaining = nextMileage - currentMileage;
    const monthsRemaining = differenceInMonths(nextDate, today);

    const urgency: Recommendation["urgency"] =
      kmRemaining <= 0 || monthsRemaining <= 0
        ? "due"
        : kmRemaining <= rule.km * 0.15 || monthsRemaining <= 2
          ? "soon"
          : "ok";

    if (urgency === "ok") continue;

    recommendations.push({
      title: rule.label,
      detail:
        kmRemaining <= 0
          ? `Prevista para ${nextMileage.toLocaleString("pt-BR")} km — o veículo já passou disso.`
          : monthsRemaining <= 0
            ? `Última execução há ${differenceInMonths(today, lastDate)} meses.`
            : `Faltam ${kmRemaining.toLocaleString("pt-BR")} km ou ${monthsRemaining} mês(es).`,
      urgency,
    });
  }

  return recommendations.sort((a, b) => (a.urgency === "due" ? -1 : 1) - (b.urgency === "due" ? -1 : 1));
}
