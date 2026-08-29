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
import { useData } from "@/lib/data/provider";
import { newId } from "@/lib/utils/id";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/format";
import type { Expense, PaymentMethod, Revenue } from "@/types";

export type SettleTarget =
  | { kind: "revenue"; entry: Revenue }
  | { kind: "expense"; entry: Expense };

/** Baixa de contas a receber e a pagar, com suporte a pagamento parcial. */
export function SettleDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SettleTarget | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && target ? (
        <SettleForm key={target.entry.id} target={target} onClose={() => onOpenChange(false)} />
      ) : null}
    </Dialog>
  );
}

function SettleForm({ target, onClose }: { target: SettleTarget; onClose: () => void }) {
  const { insert, update, audit } = useData();
  const entry = target.entry;
  const outstanding = Math.round((entry.amount - entry.paid_amount) * 100) / 100;

  const [amount, setAmount] = React.useState(outstanding);
  const [method, setMethod] = React.useState<PaymentMethod>(
    target.kind === "revenue" ? "pix" : "transfer",
  );
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
      toast.error("O valor informado é maior que o saldo em aberto.");
      return;
    }
    setBusy(true);
    try {
      const paidTotal = Math.round((entry.paid_amount + amount) * 100) / 100;
      const settled = paidTotal >= entry.amount - 0.005;
      const table = target.kind === "revenue" ? "revenues" : "expenses";

      await update(table, entry.id, {
        paid_amount: paidTotal,
        payment_method: method,
        payment_date: settled ? paidAt : entry.payment_date,
        status: settled ? "paid" : "pending",
      });

      await insert("payments", {
        id: newId(),
        revenue_id: target.kind === "revenue" ? entry.id : null,
        expense_id: target.kind === "expense" ? entry.id : null,
        amount,
        payment_method: method,
        paid_at: paidAt,
        notes: notes || null,
        created_at: new Date().toISOString(),
      });

      await audit({
        action: target.kind === "revenue" ? "receive" : "pay",
        entity: table,
        entity_id: entry.id,
        summary: `${target.kind === "revenue" ? "Recebimento" : "Pagamento"} de ${formatCurrency(amount)} — ${entry.description}`,
        before: { paid_amount: entry.paid_amount, status: entry.status },
        after: { paid_amount: paidTotal, status: settled ? "paid" : "pending" },
      });

      toast.success(target.kind === "revenue" ? "Recebimento registrado." : "Pagamento registrado.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogContent
      title={target.kind === "revenue" ? "Registrar recebimento" : "Registrar pagamento"}
      description={`${entry.description} · em aberto ${formatCurrency(outstanding)}`}
    >
      <div className="space-y-3">
        <Field label="Valor" required>
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
          <Field label="Data">
            <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </Field>
        </FormRow>

        <Field label="Observação">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {remaining > 0 ? (
          <div className="rounded-xl border border-warn/30 bg-warn/8 px-3.5 py-3 text-sm text-warn">
            Baixa parcial — restarão {formatCurrency(remaining)} em aberto.
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} loading={busy}>
            Confirmar
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
