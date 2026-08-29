import { NextResponse } from "next/server";

/**
 * Envio de e-mail. As credenciais ficam apenas no servidor.
 * Sem `RESEND_API_KEY` configurada a rota responde `not_configured` e a
 * interface cai no fallback `mailto:` — nada quebra por falta de integração.
 */
export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return NextResponse.json({
      status: "not_configured",
      reason: "Defina RESEND_API_KEY e EMAIL_FROM para habilitar o envio automático.",
    });
  }

  let payload: { to?: string; subject?: string; text?: string; html?: string; replyTo?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ status: "error", reason: "Corpo inválido." }, { status: 400 });
  }

  if (!payload.to || !payload.subject || !payload.text) {
    return NextResponse.json(
      { status: "error", reason: "Informe destinatário, assunto e conteúdo." },
      { status: 400 },
    );
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        reply_to: payload.replyTo,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { status: "error", reason: `Provedor recusou o envio: ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const result = (await response.json()) as { id?: string };
    return NextResponse.json({ status: "sent", id: result.id });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        reason: error instanceof Error ? error.message : "Falha ao contatar o provedor.",
      },
      { status: 502 },
    );
  }
}
