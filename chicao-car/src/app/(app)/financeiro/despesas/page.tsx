"use client";

import { FinancialEntriesView } from "@/features/financial/entries-view";

export default function Page() {
  return (
    <FinancialEntriesView
      kind="expense"
      mode="all"
      title="Despesas"
      subtitle="Peças, fornecedores, contas fixas e demais saídas da oficina."
    />
  );
}
