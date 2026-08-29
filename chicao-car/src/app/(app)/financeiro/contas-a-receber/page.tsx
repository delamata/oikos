"use client";

import { FinancialEntriesView } from "@/features/financial/entries-view";

export default function Page() {
  return (
    <FinancialEntriesView
      kind="revenue"
      mode="open"
      title="Contas a receber"
      subtitle="Somente os títulos ainda em aberto, ordenados por vencimento."
    />
  );
}
