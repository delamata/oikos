"use client";

import { MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { whatsappUrl } from "@/services/whatsapp";
import { cn } from "@/lib/utils/cn";

/**
 * Abre o WhatsApp com a mensagem já escrita (link wa.me).
 * Fica sempre visível e com área de toque grande — é o canal principal da
 * oficina com o cliente.
 */
export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  className,
  size = "md",
  variant = "secondary",
  iconOnly,
}: {
  phone: string | null | undefined;
  message: string;
  label?: string;
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  iconOnly?: boolean;
}) {
  return (
    <Button
      asChild
      size={iconOnly ? "icon" : size}
      variant={variant}
      className={cn("text-ok", className)}
      title={label}
    >
      <a href={whatsappUrl(phone, message)} target="_blank" rel="noopener noreferrer">
        <MessageCircle />
        {!iconOnly ? label : <span className="sr-only">{label}</span>}
      </a>
    </Button>
  );
}
