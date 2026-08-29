import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUMBER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  return BRL.format(Number(value ?? 0));
}

/** Rótulo curto para eixos de gráfico: R$ 60k, R$ 1,2M. */
export function formatAxisCurrency(value: number | null | undefined): string {
  const v = Number(value ?? 0);
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${NUMBER.format(Math.round(v / 100_000) / 10)}M`;
  if (abs >= 1_000) return `R$ ${NUMBER.format(Math.round(v / 1_000))}k`;
  return `R$ ${NUMBER.format(v)}`;
}

export function formatNumber(value: number | null | undefined): string {
  return NUMBER.format(Number(value ?? 0));
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : parseISO(value);
  return isValid(d) ? d : null;
}

export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "dd/MM/yyyy") : "—";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "dd/MM/yyyy 'às' HH:mm") : "—";
}

export function formatMonthLabel(value: string | Date): string {
  const d = toDate(value);
  return d ? format(d, "MMM/yy", { locale: ptBR }) : "—";
}

export function formatLongDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—";
}

export function formatMileage(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${NUMBER.format(value)} km`;
}

export function formatDocument(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value ?? "";
}

export function formatPhone(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? "");
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return value ?? "";
}

export function formatZip(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? "");
  if (digits.length === 8) return digits.replace(/(\d{5})(\d{3})/, "$1-$2");
  return value ?? "";
}

/** Placa antiga (AAA-0000) ou Mercosul (AAA0A00). */
export function formatPlate(value: string | null | undefined): string {
  const raw = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 7) return raw;
  if (/^[A-Z]{3}\d{4}$/.test(raw)) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return raw;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Remove acentos e caixa — usado pela busca global. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
