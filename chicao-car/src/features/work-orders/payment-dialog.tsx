"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { FormRow } from "@/components/forms/controls";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/format";
import type { PaymentMethod, WorkOrder } from "@/types";

/** Baixa de pagamento da OS — aceita valor parcial. */
export function PaymentDialog({
  open,
  onOpenChange,
  order,
  outstanding,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: WorkOrder;
  outstanding: number;
  onConfirm: (input: {
    amount: number;
    method: PaymentMethod;
    paidAt: string;
    notes: string | null;
  }) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PaymentForm
          key={`${order.id}-${outstanding}`}
          order={order}
          outstanding={outstanding}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  );
}

function PaymentForm({
  order,
  outstanding,
  onClose,
  onConfirm,
}: {
  order: WorkOrder;
  outstanding: number;
  onClose: () => void;
  onConfirm: (input: {
    amount: number;
    method: PaymentMethod;
    paidAt: string;
    notes: string | null;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = React.useState(outstanding);
  const [method, setMethod] = React.useState<PaymentMethod>("pix");
  const [paidAt, setPaidAt] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const remaining = Math.max(0, Math.round((outstanding - amount) * 100) / 100);

  async function handleConfirm() {
    if (amount <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    if (amount > outstanding + 0.005) {
      toast.error("O valor é maior que o saldo em aberto desta OS.");
      return;
    }
    setBusy(true);
    try {
      await onConfirm({ amount, method, paidAt, notes: notes || null });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent
      title="Registrar pagamento"
      description={`OS #${order.order_number} · saldo em aberto ${formatCurrency(outstanding)}`}
    >
      <div className="space-y-3">
        <Field label="Valor recebido" required>
          <CurrencyInput value={amount} onChange={setAmount} />
        </Field>

        <FormRow>
          <Field label="Forma de pagamento">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data do recebimento">
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </Field>
        </FormRow>

        <Field label="Observação">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: entrada, restante na entrega"
          />
        </Field>

        {remaining > 0 ? (
          <div className="rounded-xl border border-warn/30 bg-warn/8 px-3.5 py-3 text-sm text-warn">
            Pagamento parcial — restarão {formatCurrency(remaining)} em aberto.
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} loading={busy}>
            Registrar pagamento
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
