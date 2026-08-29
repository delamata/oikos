"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { inputClass } from "./input";
import { maskCurrency, parseCurrencyInput } from "@/lib/utils/masks";

/**
 * Campo de moeda BRL. O usuário digita apenas números e as casas decimais são
 * preenchidas da direita para a esquerda (comportamento de caixa/PDV).
 */
export function CurrencyInput({
  value,
  onChange,
  className,
  id,
  placeholder = "0,00",
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [text, setText] = React.useState(() => (value ? maskCurrency(String(Math.round(value * 100))) : ""));

  // mantém o campo sincronizado quando o valor muda por fora (ex.: preço de tabela)
  React.useEffect(() => {
    const current = parseCurrencyInput(text);
    if (Math.abs(current - value) > 0.005) {
      setText(value ? maskCurrency(String(Math.round(value * 100))) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-fog-400">
        R$
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const masked = maskCurrency(e.target.value);
          setText(masked);
          onChange(parseCurrencyInput(masked));
        }}
        className={cn(inputClass, "tabular pl-10 text-right", className)}
      />
    </div>
  );
}
