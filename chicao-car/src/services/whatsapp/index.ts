import { onlyDigits } from "@/lib/utils/format";

/**
 * Camada de WhatsApp.
 *
 * A implementação atual usa o link universal `wa.me`, que abre o aplicativo com
 * a mensagem já escrita — não exige API paga nem número verificado. A interface
 * `WhatsAppProvider` existe para que uma integração com a WhatsApp Business API
 * (envio automático) possa ser plugada depois sem tocar nas telas.
 */
export interface WhatsAppMessage {
  phone: string | null | undefined;
  text: string;
}

export interface WhatsAppProvider {
  readonly kind: string;
  /** Retorna a URL a ser aberta, ou `null` quando o envio é feito em segundo plano. */
  send(message: WhatsAppMessage): string | null;
}

/** Normaliza para o formato internacional usado pelo wa.me (55 + DDD + número). */
export function toInternational(phone: string | null | undefined): string | null {
  const digits = onlyDigits(phone ?? "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

export const linkProvider: WhatsAppProvider = {
  kind: "wa.me",
  send({ phone, text }) {
    const number = toInternational(phone);
    const encoded = encodeURIComponent(text);
    return number
      ? `https://wa.me/${number}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  },
};

export function whatsappUrl(phone: string | null | undefined, text: string): string {
  return linkProvider.send({ phone, text }) ?? "#";
}
