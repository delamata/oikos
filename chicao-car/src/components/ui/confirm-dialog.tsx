"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "./dialog";
import { Button } from "./button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = true,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} size="sm">
        <div className="flex gap-3.5">
          <div
            className={
              destructive
                ? "grid size-10 shrink-0 place-items-center rounded-xl bg-danger/12 text-danger"
                : "grid size-10 shrink-0 place-items-center rounded-xl bg-amber-brand/12 text-amber-brand"
            }
          >
            <AlertTriangle className="size-5" />
          </div>
          <p className="pt-1 text-sm leading-relaxed text-fog-300">
            {description ?? "Esta ação não pode ser desfeita."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={handleConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Hook utilitário para pedir confirmação sem espalhar estado por toda a tela. */
export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({ open: false, title: "", onConfirm: () => {} });

  const confirm = React.useCallback(
    (options: {
      title: string;
      description?: string;
      confirmLabel?: string;
      destructive?: boolean;
      onConfirm: () => void | Promise<void>;
    }) => setState({ ...options, open: true }),
    [],
  );

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      destructive={state.destructive}
      onConfirm={state.onConfirm}
    />
  );

  return { confirm, dialog };
}
