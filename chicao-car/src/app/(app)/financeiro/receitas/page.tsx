"use client";

import { FinancialEntriesView } from "@/features/financial/entries-view";

export default function Page() {
  return (
    <FinancialEntriesView
      kind="revenue"
      mode="all"
      title="Receitas"
      subtitle="Tudo que entra: ordens de serviço, vendas de balcão e outras entradas."
    />
  );
}
