/**
 * Camada de e-mail. A tela nunca fala com o provedor diretamente: chama
 * `sendEmail`, que faz POST em `/api/email`. O provedor real (Resend) só existe
 * no servidor e as credenciais ficam em variáveis de ambiente.
 * Sem `RESEND_API_KEY` configurada, a rota responde `not_configured` e a
 * interface oferece o fallback por `mailto:`.
 */
export interface EmailPayload {
  to: string;
  subject: string;
  /** Corpo em texto simples — usado no fallback `mailto:` e como versão texto. */
  text: string;
  html?: string;
  replyTo?: string;
}

export type EmailResult =
  | { status: "sent"; id?: string }
  | { status: "not_configured"; reason: string }
  | { status: "error"; reason: string };

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  try {
    const response = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await response.json()) as EmailResult;
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Falha de rede.",
    };
  }
}

export function mailtoUrl({ to, subject, text }: EmailPayload): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
