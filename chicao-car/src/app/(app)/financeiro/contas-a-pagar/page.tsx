"use client";

import { FinancialEntriesView } from "@/features/financial/entries-view";

export default function Page() {
  return (
    <FinancialEntriesView
      kind="expense"
      mode="open"
      title="Contas a pagar"
      subtitle="Somente os títulos ainda em aberto, ordenados por vencimento."
    />
  );
}
