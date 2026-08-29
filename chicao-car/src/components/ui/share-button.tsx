"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileDown, Link2, Mail, MessageCircle, Printer, Share2 } from "lucide-react";
import { Button } from "./button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from "./dropdown";
import { mailtoUrl, sendEmail, type EmailPayload } from "@/services/email";
import { whatsappUrl } from "@/services/whatsapp";

/**
 * Ações de saída de um documento: imprimir, PDF, WhatsApp, e-mail e link.
 * Reunidas em um só componente para que todo documento do sistema ofereça
 * exatamente as mesmas opções.
 */
export function ShareButton({
  onPrint,
  onPdf,
  whatsapp,
  email,
  shareUrl,
  label = "Compartilhar",
}: {
  onPrint?: () => void;
  onPdf?: () => void;
  whatsapp?: { phone: string | null | undefined; message: string };
  email?: EmailPayload;
  shareUrl?: string;
  label?: string;
}) {
  const [sending, setSending] = React.useState(false);

  async function handleEmail() {
    if (!email) return;
    if (!email.to) {
      toast.error("Este cadastro não tem e-mail informado.");
      return;
    }
    setSending(true);
    const result = await sendEmail(email);
    setSending(false);

    if (result.status === "sent") {
      toast.success(`E-mail enviado para ${email.to}.`);
    } else if (result.status === "not_configured") {
      toast.info("Envio automático não configurado — abrindo seu app de e-mail.");
      window.location.href = mailtoUrl(email);
    } else {
      toast.error(result.reason);
      window.location.href = mailtoUrl(email);
    }
  }

  async function handleCopy() {
    const url = shareUrl ?? window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="secondary" loading={sending}>
          <Share2 /> {label}
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        {onPrint ? (
          <DropdownItem onSelect={onPrint}>
            <Printer /> Imprimir
          </DropdownItem>
        ) : null}
        {onPdf ? (
          <DropdownItem onSelect={onPdf}>
            <FileDown /> Baixar PDF
          </DropdownItem>
        ) : null}
        {whatsapp ? (
          <DropdownItem
            onSelect={() =>
              window.open(whatsappUrl(whatsapp.phone, whatsapp.message), "_blank", "noopener")
            }
          >
            <MessageCircle /> Enviar por WhatsApp
          </DropdownItem>
        ) : null}
        {email ? (
          <DropdownItem onSelect={() => void handleEmail()}>
            <Mail /> Enviar por e-mail
          </DropdownItem>
        ) : null}
        <DropdownSeparator />
        <DropdownItem onSelect={() => void handleCopy()}>
          <Link2 /> Copiar link
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
