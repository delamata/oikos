import { addDays } from "date-fns";
import type { PdfDocumentInput } from "@/services/pdf/document";
import type { WorkOrderView } from "@/lib/domain/work-orders";
import type { WorkshopSettings } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatDocument,
  formatMileage,
  formatPhone,
  formatPlate,
} from "@/lib/utils/format";

export type DocumentKind = "quote" | "order" | "receipt";

const TITLES: Record<DocumentKind, string> = {
  quote: "Orçamento",
  order: "Ordem de Serviço",
  receipt: "Recibo",
};

/** Monta o PDF de orçamento, OS ou recibo a partir da mesma ordem de serviço. */
export function buildOrderDocument(
  kind: DocumentKind,
  order: WorkOrderView,
  settings: WorkshopSettings,
): PdfDocumentInput {
  const { customer, vehicle } = order;

  const blocks: PdfDocumentInput["blocks"] = [
    {
      title: "Cliente",
      rows: [
        ["Nome", customer?.name ?? "—"],
        ["CPF/CNPJ", customer?.document ? formatDocument(customer.document) : "—"],
        ["Telefone", formatPhone(customer?.phone) || "—"],
        ["E-mail", customer?.email ?? "—"],
      ],
    },
    {
      title: "Veículo",
      rows: [
        ["Placa", vehicle ? formatPlate(vehicle.plate) : "—"],
        ["Modelo", vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""}`.trim() || "—" : "—"],
        ["Ano", vehicle?.year ? String(vehicle.year) : "—"],
        ["Quilometragem", formatMileage(order.current_mileage)],
      ],
    },
  ];

  if (kind !== "receipt" && (order.customer_complaint || order.diagnosis)) {
    blocks.push({
      title: "Atendimento",
      rows: [
        ["Reclamação", order.customer_complaint ?? "—"],
        ["Diagnóstico", order.diagnosis ?? "—"],
      ],
    });
  }

  const tables: PdfDocumentInput["tables"] = [];

  if (kind === "receipt") {
    tables.push({
      title: "Referente a",
      head: ["Descrição", "Valor"],
      align: ["left", "right"],
      body: [
        [
          `Serviços e peças da OS #${order.order_number}`,
          formatCurrency(order.total),
        ],
      ],
    });
  } else {
    if (order.services.length > 0) {
      tables.push({
        title: "Serviços",
        head: ["Descrição", "Qtd.", "Unitário", "Desc.", "Total"],
        align: ["left", "center", "right", "right", "right"],
        body: order.services.map((item) => [
          item.description,
          String(item.quantity),
          formatCurrency(item.unit_price),
          item.discount > 0 ? formatCurrency(item.discount) : "—",
          formatCurrency(item.total),
        ]),
      });
    }
    if (order.products.length > 0) {
      tables.push({
        title: "Peças e produtos",
        head: ["Descrição", "Qtd.", "Unitário", "Desc.", "Total"],
        align: ["left", "center", "right", "right", "right"],
        body: order.products.map((item) => [
          item.description,
          String(item.quantity),
          formatCurrency(item.unit_price),
          item.discount > 0 ? formatCurrency(item.discount) : "—",
          formatCurrency(item.total),
        ]),
      });
    }
  }

  const totals: [string, string][] = [];
  if (kind !== "receipt") {
    totals.push(["Serviços", formatCurrency(order.subtotal_services)]);
    totals.push(["Peças", formatCurrency(order.subtotal_products)]);
    if (order.discount > 0) totals.push(["Desconto", `- ${formatCurrency(order.discount)}`]);
  }
  totals.push([kind === "receipt" ? "Valor recebido" : "Total", formatCurrency(order.total)]);

  const notes: { title: string; text: string }[] = [];
  if (kind === "quote") {
    notes.push({
      title: "Validade",
      text: `Este orçamento é válido até ${formatDate(
        addDays(new Date(order.opened_at), settings.quote_valid_days),
      )}.`,
    });
    if (settings.quote_terms) notes.push({ title: "Condições", text: settings.quote_terms });
  }
  if (kind === "order" && settings.order_terms) {
    notes.push({ title: "Garantia", text: settings.order_terms });
  }
  if (kind === "receipt") {
    notes.push({
      title: "Declaração",
      text: `Recebemos de ${customer?.name ?? "—"} a importância de ${formatCurrency(
        order.total,
      )}, referente aos serviços e peças da OS #${order.order_number}, dando plena quitação.`,
    });
  }
  if (settings.pix_key && kind !== "receipt") {
    notes.push({ title: "Pagamento", text: `Chave PIX: ${settings.pix_key}` });
  }

  return {
    settings,
    title: TITLES[kind],
    reference: `Nº ${order.order_number}`,
    issuedAt: new Date(),
    blocks,
    tables,
    totals,
    notes,
    fileName: `${kind === "quote" ? "orcamento" : kind === "order" ? "os" : "recibo"}-${order.order_number}.pdf`,
  };
}

export function orderEmailBody(
  kind: DocumentKind,
  order: WorkOrderView,
  settings: WorkshopSettings,
): { subject: string; text: string } {
  const first = (order.customer?.name ?? "").split(" ")[0] || "cliente";
  const label = TITLES[kind].toLowerCase();
  return {
    subject: `${settings.company_name} — ${TITLES[kind]} nº ${order.order_number}`,
    text: [
      `Olá, ${first}!`,
      "",
      `Segue o ${label} nº ${order.order_number} referente ao veículo ${
        order.vehicle ? `${order.vehicle.brand ?? ""} ${order.vehicle.model ?? ""} (${formatPlate(order.vehicle.plate)})` : ""
      }.`,
      "",
      `Serviços: ${formatCurrency(order.subtotal_services)}`,
      `Peças: ${formatCurrency(order.subtotal_products)}`,
      order.discount > 0 ? `Desconto: -${formatCurrency(order.discount)}` : "",
      `Total: ${formatCurrency(order.total)}`,
      "",
      settings.pix_key ? `Chave PIX: ${settings.pix_key}` : "",
      "",
      `Atenciosamente,`,
      settings.company_name,
      formatPhone(settings.phone) || "",
    ]
      .filter((line) => line !== "")
      .join("\n"),
  };
}
