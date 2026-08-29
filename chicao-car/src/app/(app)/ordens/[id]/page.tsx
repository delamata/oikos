"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  Banknote,
  Car,
  CheckCircle2,
  ClipboardList,
  FileText,
  KeyRound,
  PackageSearch,
  Play,
  Plus,
  Printer,
  Save,
  Send,
  ThumbsUp,
  Trash2,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ShareButton } from "@/components/ui/share-button";
import { PaymentStatusBadge, WorkOrderStatusBadge } from "@/components/ui/status-badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FormRow } from "@/components/forms/controls";
import { StatusTimeline } from "@/features/work-orders/status-timeline";
import { AddItemDialog, type ItemDraft } from "@/features/work-orders/add-item-dialog";
import { PaymentDialog } from "@/features/work-orders/payment-dialog";
import { useWorkOrderActions } from "@/features/work-orders/actions";
import { buildOrderDocument, orderEmailBody } from "@/features/work-orders/documents";
import { savePdf } from "@/services/pdf/document";
import { orderReadyMessage, quoteMessage, receiptMessage } from "@/services/whatsapp/messages";
import { useData } from "@/lib/data/provider";
import { useAuth } from "@/lib/auth/provider";
import { can } from "@/lib/permissions";
import { amountOutstanding, buildWorkOrderView } from "@/lib/domain/work-orders";
import { formatCurrency, formatDate, formatMileage, formatPlate } from "@/lib/utils/format";
import type { WorkOrderStatus } from "@/types";

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useData();
  const { profile } = useAuth();
  const actions = useWorkOrderActions();
  const { confirm, dialog } = useConfirm();

  const canWrite = can(profile?.role, "work_orders:write");
  const canDiscount = can(profile?.role, "work_orders:discount");
  const canCancel = can(profile?.role, "work_orders:cancel");
  const canFinancial = can(profile?.role, "financial:write");

  const [addService, setAddService] = React.useState(false);
  const [addProduct, setAddProduct] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [savingNotes, setSavingNotes] = React.useState(false);

  const order = data.work_orders.find((o) => o.id === id) ?? null;
  const view = React.useMemo(
    () => (order ? buildWorkOrderView(order, data) : null),
    [order, data],
  );

  const [diagnosis, setDiagnosis] = React.useState("");
  const [internalNotes, setInternalNotes] = React.useState("");
  const [loadedFor, setLoadedFor] = React.useState<string | null>(null);

  // carrega os campos de texto quando a OS aparece (ou troca)
  if (order && loadedFor !== order.id) {
    setLoadedFor(order.id);
    setDiagnosis(order.diagnosis ?? "");
    setInternalNotes(order.internal_notes ?? "");
  }

  if (data.loading) return <LoadingState label="Carregando ordem de serviço…" />;
  if (!order || !view) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Ordem de serviço não encontrada"
        action={
          <Button asChild variant="secondary">
            <Link href="/ordens">Voltar para a lista</Link>
          </Button>
        }
      />
    );
  }

  const outstanding = amountOutstanding(order, data.revenues);
  const locked = order.status === "delivered" || order.status === "cancelled";
  const textChanged =
    diagnosis !== (order.diagnosis ?? "") || internalNotes !== (order.internal_notes ?? "");

  async function setStatus(next: WorkOrderStatus, message: string) {
    if (!order) return;
    try {
      await actions.changeStatus(order, next);
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a OS.");
    }
  }

  async function addItem(kind: "service" | "product", item: ItemDraft) {
    if (!order) return;
    if (kind === "service") {
      await actions.addServiceItem(order.id, {
        service_id: item.refId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
      });
    } else {
      await actions.addProductItem(order.id, {
        product_id: item.refId,
        description: item.description,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        unit_price: item.unitPrice,
        discount: item.discount,
      });
    }
    await actions.recalc(order.id);
    toast.success("Item adicionado à OS.");
  }

  async function saveTexts() {
    if (!order) return;
    setSavingNotes(true);
    try {
      await data.update("work_orders", order.id, {
        diagnosis: diagnosis || null,
        internal_notes: internalNotes || null,
        updated_at: new Date().toISOString(),
      });
      toast.success("Anotações salvas.");
    } finally {
      setSavingNotes(false);
    }
  }

  const quoteDoc = buildOrderDocument("quote", view, data.settings);
  const orderDoc = buildOrderDocument("order", view, data.settings);
  const receiptDoc = buildOrderDocument("receipt", view, data.settings);
  const quoteEmail = orderEmailBody("quote", view, data.settings);

  const documentContext = {
    settings: data.settings,
    order,
    customer: view.customer,
    vehicle: view.vehicle,
  };

  return (
    <>
      <PageHeader
        backHref="/ordens"
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">OS #{order.order_number}</span>
            <WorkOrderStatusBadge status={order.status} />
            {order.total > 0 ? <PaymentStatusBadge status={order.payment_status} /> : null}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Aberta em {formatDate(order.opened_at)}</span>
            {view.mechanic ? <span>Mecânico: {view.mechanic.name}</span> : null}
            {order.expected_at ? <span>Previsão: {formatDate(order.expected_at)}</span> : null}
          </span>
        }
        actions={
          <>
            <ShareButton
              label="Orçamento"
              onPrint={() => window.open(`/imprimir/orcamento/${order.id}`, "_blank")}
              onPdf={() => savePdf(quoteDoc)}
              whatsapp={{
                phone: view.customer?.whatsapp ?? view.customer?.phone,
                message: quoteMessage(documentContext),
              }}
              email={{
                to: view.customer?.email ?? "",
                subject: quoteEmail.subject,
                text: quoteEmail.text,
              }}
            />
            <Button variant="secondary" asChild>
              <a href={`/imprimir/os/${order.id}`} target="_blank" rel="noopener noreferrer">
                <Printer /> Imprimir OS
              </a>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardBody>
          <StatusTimeline order={order} />
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        {/* ---------------- coluna principal ---------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Atendimento" />
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={`/clientes/${order.customer_id}`}
                  className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 transition-colors hover:border-ink-600"
                >
                  <User className="size-4 shrink-0 text-fog-400" />
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-wide text-fog-400 uppercase">Cliente</p>
                    <p className="truncate text-sm font-medium text-fog-100">
                      {view.customer?.name ?? "—"}
                    </p>
                  </div>
                </Link>
                <Link
                  href={`/veiculos/${order.vehicle_id}`}
                  className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 transition-colors hover:border-ink-600"
                >
                  <Car className="size-4 shrink-0 text-fog-400" />
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-wide text-fog-400 uppercase">Veículo</p>
                    <p className="tabular truncate text-sm font-medium text-fog-100">
                      {view.vehicle ? formatPlate(view.vehicle.plate) : "—"}
                      <span className="ml-2 font-sans text-xs font-normal text-fog-400">
                        {[view.vehicle?.brand, view.vehicle?.model].filter(Boolean).join(" ")}
                      </span>
                    </p>
                  </div>
                </Link>
              </div>

              <FormRow columns={3}>
                <Field label="Quilometragem na entrada">
                  <Input
                    inputMode="numeric"
                    className="tabular"
                    disabled={locked || !canWrite}
                    defaultValue={order.current_mileage ?? ""}
                    onBlur={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      void data.update("work_orders", order.id, {
                        current_mileage: value ? Number(value) : null,
                      });
                    }}
                  />
                </Field>
                <Field label="Mecânico responsável">
                  <Select
                    disabled={locked || !canWrite}
                    value={order.mechanic_id ?? ""}
                    onChange={(e) =>
                      void data.update("work_orders", order.id, {
                        mechanic_id: e.target.value || null,
                      })
                    }
                  >
                    <option value="">A definir</option>
                    {data.profiles
                      .filter((p) => p.active && (p.role === "mechanic" || p.role === "admin"))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Previsão de entrega">
                  <Input
                    type="date"
                    disabled={locked || !canWrite}
                    defaultValue={order.expected_at ? order.expected_at.slice(0, 10) : ""}
                    onChange={(e) =>
                      void data.update("work_orders", order.id, {
                        expected_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </Field>
              </FormRow>

              <Field label="Reclamação do cliente">
                <Textarea
                  disabled={locked || !canWrite}
                  defaultValue={order.customer_complaint ?? ""}
                  onBlur={(e) =>
                    void data.update("work_orders", order.id, {
                      customer_complaint: e.target.value || null,
                    })
                  }
                />
              </Field>

              <Field label="Diagnóstico da oficina">
                <Textarea
                  disabled={locked || !canWrite}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="O que foi constatado na inspeção…"
                />
              </Field>

              <Field label="Observações internas" hint="Não aparece no orçamento do cliente.">
                <Textarea
                  disabled={locked || !canWrite}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
              </Field>

              {textChanged && canWrite ? (
                <Button onClick={() => void saveTexts()} loading={savingNotes}>
                  <Save /> Salvar anotações
                </Button>
              ) : null}
            </CardBody>
          </Card>

          <ItemsCard
            title="Serviços"
            emptyText="Nenhum serviço lançado nesta OS."
            items={view.services.map((item) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              discount: item.discount,
              total: item.total,
            }))}
            canWrite={canWrite && !locked}
            onAdd={() => setAddService(true)}
            onRemove={async (itemId) => {
              await actions.removeServiceItem(itemId);
              await actions.recalc(order.id);
              toast.success("Serviço removido.");
            }}
            subtotal={order.subtotal_services}
          />

          <ItemsCard
            title="Peças e produtos"
            emptyText="Nenhuma peça lançada nesta OS."
            items={view.products.map((item) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              discount: item.discount,
              total: item.total,
            }))}
            canWrite={canWrite && !locked}
            onAdd={() => setAddProduct(true)}
            onRemove={async (itemId) => {
              await actions.removeProductItem(itemId);
              await actions.recalc(order.id);
              toast.success("Peça removida.");
            }}
            subtotal={order.subtotal_products}
          />
        </div>

        {/* ---------------- coluna lateral ---------------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Totais" />
            <CardBody className="space-y-2.5">
              <Line label="Serviços" value={formatCurrency(order.subtotal_services)} />
              <Line label="Peças" value={formatCurrency(order.subtotal_products)} />

              <div className="pt-1">
                <Field label="Desconto">
                  <CurrencyInput
                    value={order.discount}
                    disabled={!canDiscount || locked}
                    onChange={(value) => void actions.applyDiscount(order, value)}
                  />
                </Field>
              </div>

              <div className="mt-1 flex items-baseline justify-between border-t border-ink-700 pt-3">
                <span className="label-caps">Total</span>
                <span className="tabular text-2xl font-bold text-fog-100">
                  {formatCurrency(order.total)}
                </span>
              </div>

              {order.total > 0 ? (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-fog-400">Em aberto</span>
                  <span
                    className={
                      outstanding > 0
                        ? "tabular font-semibold text-warn"
                        : "tabular font-semibold text-ok"
                    }
                  >
                    {formatCurrency(outstanding)}
                  </span>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fluxo da OS" subtitle="Próximos passos do atendimento" />
            <CardBody className="space-y-2">
              {canWrite && order.status === "draft" ? (
                <Button
                  block
                  onClick={() => void setStatus("awaiting_approval", "Orçamento enviado para aprovação.")}
                  disabled={order.total <= 0}
                >
                  <Send /> Enviar orçamento
                </Button>
              ) : null}

              {canWrite && order.status === "awaiting_approval" ? (
                <>
                  <Button block onClick={() => void setStatus("approved", "Aprovação registrada.")}>
                    <ThumbsUp /> Registrar aprovação do cliente
                  </Button>
                  <Button
                    block
                    variant="outline"
                    onClick={() => void setStatus("draft", "OS voltou para rascunho.")}
                  >
                    Voltar para rascunho
                  </Button>
                </>
              ) : null}

              {canWrite && order.status === "approved" ? (
                <Button block onClick={() => void setStatus("in_progress", "Serviço iniciado.")}>
                  <Play /> Iniciar serviço
                </Button>
              ) : null}

              {canWrite && order.status === "in_progress" ? (
                <>
                  <Button block onClick={() => void setStatus("completed", "Serviço concluído.")}>
                    <CheckCircle2 /> Concluir serviço
                  </Button>
                  <Button
                    block
                    variant="outline"
                    onClick={() => void setStatus("waiting_parts", "OS marcada como aguardando peças.")}
                  >
                    <PackageSearch /> Aguardando peças
                  </Button>
                </>
              ) : null}

              {canWrite && order.status === "waiting_parts" ? (
                <>
                  <Button block onClick={() => void setStatus("in_progress", "Serviço retomado.")}>
                    <Play /> Retomar serviço
                  </Button>
                  <Button
                    block
                    variant="outline"
                    onClick={() => void setStatus("completed", "Serviço concluído.")}
                  >
                    <CheckCircle2 /> Concluir serviço
                  </Button>
                </>
              ) : null}

              {canFinancial && outstanding > 0 && order.total > 0 && order.status !== "cancelled" ? (
                <Button block variant="success" onClick={() => setPayOpen(true)}>
                  <Banknote /> Registrar pagamento
                </Button>
              ) : null}

              {canWrite && order.status === "completed" ? (
                <Button
                  block
                  onClick={() =>
                    confirm({
                      title: "Entregar veículo?",
                      description:
                        outstanding > 0
                          ? `Ainda há ${formatCurrency(outstanding)} em aberto. Deseja registrar a entrega mesmo assim?`
                          : "A OS será encerrada e não poderá mais ser editada.",
                      confirmLabel: "Confirmar entrega",
                      destructive: outstanding > 0,
                      onConfirm: () => setStatus("delivered", "Veículo entregue. OS encerrada."),
                    })
                  }
                >
                  <KeyRound /> Entregar veículo
                </Button>
              ) : null}

              {order.status === "completed" || order.status === "delivered" ? (
                <ShareButton
                  label="Avisar o cliente"
                  whatsapp={{
                    phone: view.customer?.whatsapp ?? view.customer?.phone,
                    message:
                      order.payment_status === "paid"
                        ? receiptMessage(documentContext)
                        : orderReadyMessage(documentContext),
                  }}
                  onPrint={() => window.open(`/imprimir/recibo/${order.id}`, "_blank")}
                  onPdf={() => savePdf(order.payment_status === "paid" ? receiptDoc : orderDoc)}
                />
              ) : null}

              {canCancel && !locked ? (
                <Button
                  block
                  variant="danger"
                  onClick={() =>
                    confirm({
                      title: "Cancelar esta OS?",
                      description:
                        "A OS deixa de contar no faturamento. O histórico é mantido para auditoria.",
                      confirmLabel: "Cancelar OS",
                      onConfirm: () => setStatus("cancelled", "OS cancelada."),
                    })
                  }
                >
                  <Ban /> Cancelar OS
                </Button>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documentos" />
            <CardBody className="space-y-2">
              <DocumentRow
                label="Orçamento"
                onPrint={() => window.open(`/imprimir/orcamento/${order.id}`, "_blank")}
                onPdf={() => savePdf(quoteDoc)}
              />
              <DocumentRow
                label="Ordem de serviço"
                onPrint={() => window.open(`/imprimir/os/${order.id}`, "_blank")}
                onPdf={() => savePdf(orderDoc)}
              />
              <DocumentRow
                label="Recibo"
                disabled={order.payment_status === "unpaid"}
                onPrint={() => window.open(`/imprimir/recibo/${order.id}`, "_blank")}
                onPdf={() => savePdf(receiptDoc)}
              />
            </CardBody>
          </Card>

          {view.revenues.length > 0 ? (
            <Card>
              <CardHeader title="Financeiro da OS" />
              <ul className="divide-y divide-ink-800">
                {view.revenues.map((revenue) => (
                  <li key={revenue.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fog-100">{revenue.description}</p>
                      <p className="text-xs text-fog-400">
                        Vence em {formatDate(revenue.due_date)}
                      </p>
                    </div>
                    <Badge tone={revenue.status === "paid" ? "ok" : "warn"}>
                      {formatCurrency(revenue.paid_amount)} / {formatCurrency(revenue.amount)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>

      <AddItemDialog
        open={addService}
        onOpenChange={setAddService}
        kind="service"
        onConfirm={(item) => addItem("service", item)}
      />
      <AddItemDialog
        open={addProduct}
        onOpenChange={setAddProduct}
        kind="product"
        onConfirm={(item) => addItem("product", item)}
      />
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        order={order}
        outstanding={outstanding}
        onConfirm={async (input) => {
          await actions.registerPayment(order, input);
          toast.success("Pagamento registrado.");
        }}
      />
      {dialog}
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-fog-400">{label}</span>
      <span className="tabular font-medium text-fog-100">{value}</span>
    </div>
  );
}

function DocumentRow({
  label,
  onPrint,
  onPdf,
  disabled,
}: {
  label: string;
  onPrint: () => void;
  onPdf: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 px-3 py-2">
      <FileText className="size-4 shrink-0 text-fog-400" />
      <span className="min-w-0 flex-1 truncate text-sm text-fog-200">{label}</span>
      <Button size="icon-sm" variant="ghost" onClick={onPrint} disabled={disabled} title="Imprimir">
        <Printer />
        <span className="sr-only">Imprimir {label}</span>
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={onPdf} disabled={disabled} title="Baixar PDF">
        <FileText />
        <span className="sr-only">PDF de {label}</span>
      </Button>
    </div>
  );
}

interface DisplayItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

function ItemsCard({
  title,
  emptyText,
  items,
  canWrite,
  onAdd,
  onRemove,
  subtotal,
}: {
  title: string;
  emptyText: string;
  items: DisplayItem[];
  canWrite: boolean;
  onAdd: () => void;
  onRemove: (id: string) => Promise<void>;
  subtotal: number;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          canWrite ? (
            <Button size="sm" variant="secondary" onClick={onAdd}>
              <Plus /> Adicionar
            </Button>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <>
          <ul className="divide-y divide-ink-800">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fog-100">{item.description}</p>
                  <p className="tabular text-xs text-fog-400">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                    {item.discount > 0 ? ` · desc. ${formatCurrency(item.discount)}` : ""}
                  </p>
                </div>
                <span className="tabular shrink-0 text-sm font-semibold text-fog-100">
                  {formatCurrency(item.total)}
                </span>
                {canWrite ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => void onRemove(item.id)}
                  >
                    <Trash2 />
                    <span className="sr-only">Remover item</span>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-ink-700 px-4 py-3 sm:px-5">
            <span className="label-caps">Subtotal</span>
            <span className="tabular font-semibold text-fog-100">{formatCurrency(subtotal)}</span>
          </div>
        </>
      )}
    </Card>
  );
}
