"use client";

import { addDays } from "date-fns";
import { useParams } from "next/navigation";
import { PrintLayout, type PrintBlock, type PrintTable } from "./print-layout";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useData } from "@/lib/data/provider";
import { buildWorkOrderView } from "@/lib/domain/work-orders";
import type { DocumentKind } from "@/features/work-orders/documents";
import {
  formatCurrency,
  formatDate,
  formatDocument,
  formatMileage,
  formatPhone,
  formatPlate,
} from "@/lib/utils/format";
import { PAYMENT_METHOD, WORK_ORDER_STATUS } from "@/lib/constants";

const TITLES: Record<DocumentKind, string> = {
  quote: "Orçamento",
  order: "Ordem de Serviço",
  receipt: "Recibo",
};

/** Renderiza orçamento, OS ou recibo em folha A4 a partir do id da rota. */
export function OrderPrint({ kind }: { kind: DocumentKind }) {
  const { id } = useParams<{ id: string }>();
  const data = useData();

  const order = data.work_orders.find((o) => o.id === id);
  if (data.loading) return <LoadingState />;
  if (!order) return <EmptyState title="Ordem de serviço não encontrada" />;

  const view = buildWorkOrderView(order, data);
  const { customer, vehicle, mechanic } = view;
  const settings = data.settings;

  const blocks: PrintBlock[] = [
    {
      title: "Cliente",
      rows: [
        ["Nome", customer?.name ?? "—"],
        ["CPF/CNPJ", customer?.document ? formatDocument(customer.document) : "—"],
        ["Telefone", formatPhone(customer?.phone) || "—"],
        ["E-mail", customer?.email ?? "—"],
        [
          "Endereço",
          [customer?.address, customer?.city, customer?.state].filter(Boolean).join(", ") || "—",
        ],
      ],
    },
    {
      title: "Veículo",
      rows: [
        ["Placa", vehicle ? formatPlate(vehicle.plate) : "—"],
        ["Marca / modelo", [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ") || "—"],
        ["Versão", vehicle?.version ?? "—"],
        ["Ano", vehicle?.year ? `${vehicle.year}${vehicle.model_year ? `/${vehicle.model_year}` : ""}` : "—"],
        ["Cor", vehicle?.color ?? "—"],
        ["Quilometragem", formatMileage(order.current_mileage)],
      ],
    },
  ];

  if (kind !== "receipt") {
    blocks.push({
      title: "Atendimento",
      rows: [
        ["Abertura", formatDate(order.opened_at)],
        ["Situação", WORK_ORDER_STATUS[order.status].label],
        ["Mecânico", mechanic?.name ?? "—"],
        ["Previsão", order.expected_at ? formatDate(order.expected_at) : "—"],
        ["Reclamação", order.customer_complaint ?? "—"],
        ["Diagnóstico", order.diagnosis ?? "—"],
      ],
    });
  }

  const tables: PrintTable[] = [];

  if (kind === "receipt") {
    const payments = data.payments.filter((payment) =>
      view.revenues.some((revenue) => revenue.id === payment.revenue_id),
    );
    tables.push({
      title: "Pagamentos recebidos",
      head: ["Data", "Forma de pagamento", "Valor"],
      align: ["left", "left", "right"],
      rows:
        payments.length > 0
          ? payments.map((payment) => [
              formatDate(payment.paid_at),
              PAYMENT_METHOD[payment.payment_method],
              formatCurrency(payment.amount),
            ])
          : [["—", "—", formatCurrency(0)]],
    });
  } else {
    if (view.services.length > 0) {
      tables.push({
        title: "Serviços executados",
        head: ["Descrição", "Qtd.", "Valor unitário", "Desconto", "Total"],
        align: ["left", "center", "right", "right", "right"],
        rows: view.services.map((item) => [
          item.description,
          item.quantity,
          formatCurrency(item.unit_price),
          item.discount > 0 ? formatCurrency(item.discount) : "—",
          formatCurrency(item.total),
        ]),
      });
    }
    if (view.products.length > 0) {
      tables.push({
        title: "Peças e produtos",
        head: ["Descrição", "Qtd.", "Valor unitário", "Desconto", "Total"],
        align: ["left", "center", "right", "right", "right"],
        rows: view.products.map((item) => [
          item.description,
          item.quantity,
          formatCurrency(item.unit_price),
          item.discount > 0 ? formatCurrency(item.discount) : "—",
          formatCurrency(item.total),
        ]),
      });
    }
  }

  const totals: [string, string][] = [];
  if (kind !== "receipt") {
    totals.push(["Subtotal de serviços", formatCurrency(order.subtotal_services)]);
    totals.push(["Subtotal de peças", formatCurrency(order.subtotal_products)]);
    if (order.discount > 0) totals.push(["Desconto", `- ${formatCurrency(order.discount)}`]);
  }
  totals.push([kind === "receipt" ? "Total recebido" : "Total geral", formatCurrency(order.total)]);

  const notes: { title: string; text: string }[] = [];
  if (kind === "quote") {
    notes.push({
      title: "Validade do orçamento",
      text: `Válido até ${formatDate(addDays(new Date(order.opened_at), settings.quote_valid_days))}.`,
    });
    if (settings.quote_terms) notes.push({ title: "Condições", text: settings.quote_terms });
  }
  if (kind === "order" && settings.order_terms) {
    notes.push({ title: "Garantia", text: settings.order_terms });
  }
  if (kind === "receipt") {
    notes.push({
      title: "Declaração",
      text: `Recebemos de ${customer?.name ?? "—"} a importância de ${formatCurrency(order.total)}, referente aos serviços e peças descritos na Ordem de Serviço nº ${order.order_number}, dando plena e geral quitação.`,
    });
  }
  if (settings.pix_key && kind !== "receipt") {
    notes.push({
      title: "Formas de pagamento",
      text: [
        `PIX: ${settings.pix_key}`,
        settings.bank_details ? `Dados bancários: ${settings.bank_details}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  return (
    <PrintLayout
      settings={settings}
      title={TITLES[kind]}
      reference={`Nº ${order.order_number}`}
      blocks={blocks}
      tables={tables}
      totals={totals}
      notes={notes}
      signature={
        kind === "quote"
          ? `${customer?.name ?? "Cliente"} — de acordo com o orçamento`
          : kind === "receipt"
            ? settings.company_name
            : `${customer?.name ?? "Cliente"} — recebi o veículo`
      }
    />
  );
}
