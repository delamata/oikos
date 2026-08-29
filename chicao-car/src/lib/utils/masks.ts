import { onlyDigits } from "./format";

export function maskDocument(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function maskZip(value: string): string {
  return onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

/** Aceita os dois padrões brasileiros: ABC-1234 e ABC1D23. */
export function maskPlate(value: string): string {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (raw.length > 3 && /^[A-Z]{3}\d{4}$/.test(raw)) {
    return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  }
  return raw;
}

/**
 * Converte o texto digitado em um campo de moeda para número.
 * "1.234,56" -> 1234.56
 */
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Máscara de digitação de moeda, sempre com duas casas (estilo caixa). */
export function maskCurrency(value: string): string {
  const digits = onlyDigits(value).slice(0, 12);
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
