"use client";

import * as React from "react";
import { Printer, X } from "lucide-react";
import { formatDate, formatDocument, formatPhone } from "@/lib/utils/format";
import type { WorkshopSettings } from "@/types";

export interface PrintBlock {
  title: string;
  rows: [string, string][];
}

export interface PrintTable {
  title?: string;
  head: string[];
  rows: (string | number)[][];
  align?: ("left" | "right" | "center")[];
}

/**
 * Documento A4 para impressão. É um layout próprio — não a tela do sistema —
 * com fundo branco, cabeçalho da oficina e rodapé, para que a impressão saia
 * com cara de documento comercial.
 */
export function PrintLayout({
  settings,
  title,
  reference,
  blocks = [],
  tables = [],
  totals = [],
  notes = [],
  signature,
  autoPrint = true,
}: {
  settings: WorkshopSettings;
  title: string;
  reference?: string;
  blocks?: PrintBlock[];
  tables?: PrintTable[];
  totals?: [string, string][];
  notes?: { title: string; text: string }[];
  signature?: string;
  autoPrint?: boolean;
}) {
  const [printed, setPrinted] = React.useState(false);

  React.useEffect(() => {
    if (!autoPrint || printed) return;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [autoPrint, printed]);

  return (
    <div className="min-h-dvh bg-[#e8eaee] py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4">
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex items-center gap-2 rounded-lg border border-[#c9ced7] bg-white px-3 py-2 text-sm font-medium text-[#3b4250]"
        >
          <X className="size-4" /> Fechar
        </button>
        <button
          type="button"
          onClick={() => {
            setPrinted(true);
            window.print();
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#d1861c] px-4 py-2 text-sm font-semibold text-white"
        >
          <Printer className="size-4" /> Imprimir / Salvar em PDF
        </button>
      </div>

      <article className="print-sheet mx-auto w-[210mm] max-w-full bg-white px-[14mm] py-[12mm] text-[#101215] shadow-xl print:w-auto print:shadow-none">
        {/* cabeçalho */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-[3px] border-[#d1861c] pb-4">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-none font-extrabold tracking-tight">
              {settings.company_name}
            </h1>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#5b6472]">
              {[
                settings.document ? `CNPJ ${formatDocument(settings.document)}` : null,
                formatPhone(settings.phone),
                settings.email,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
            <p className="text-[11px] text-[#5b6472]">
              {[settings.address, settings.city, settings.state].filter(Boolean).join(" — ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[15px] font-bold tracking-[0.12em] text-[#5b6472] uppercase">
              {title}
            </p>
            {reference ? (
              <p className="text-[22px] leading-tight font-extrabold text-[#d1861c]">{reference}</p>
            ) : null}
            <p className="text-[11px] text-[#5b6472]">Emitido em {formatDate(new Date())}</p>
          </div>
        </header>

        {/* blocos */}
        {blocks.map((block) => (
          <section key={block.title} className="print-avoid-break mt-5">
            <h2 className="mb-1.5 border-b border-[#e2e6ec] pb-1 text-[10px] font-bold tracking-[0.12em] text-[#5b6472] uppercase">
              {block.title}
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
              {block.rows.map(([label, value]) => (
                <div key={label} className="flex gap-1.5 text-[12px]">
                  <dt className="shrink-0 text-[#5b6472]">{label}:</dt>
                  <dd className="min-w-0 font-semibold break-words">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {/* tabelas */}
        {tables.map((table, index) => (
          <section key={index} className="print-avoid-break mt-5">
            {table.title ? (
              <h2 className="mb-1.5 text-[10px] font-bold tracking-[0.12em] text-[#5b6472] uppercase">
                {table.title}
              </h2>
            ) : null}
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#eef1f5]">
                  {table.head.map((cell, i) => (
                    <th
                      key={cell}
                      className="border border-[#dfe4ea] px-2 py-1.5 font-bold"
                      style={{ textAlign: table.align?.[i] ?? "left" }}
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className="border border-[#dfe4ea] px-2 py-1.5"
                        style={{ textAlign: table.align?.[i] ?? "left" }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        {/* totais */}
        {totals.length > 0 ? (
          <section className="print-avoid-break mt-5 flex justify-end">
            <table className="min-w-[70mm] border-collapse text-[12px]">
              <tbody>
                {totals.map(([label, value], index) => {
                  const last = index === totals.length - 1;
                  return (
                    <tr key={label} className={last ? "bg-[#f4f6f9]" : ""}>
                      <td
                        className={`border border-[#dfe4ea] px-2.5 py-1.5 text-[#5b6472] ${last ? "font-bold text-[#101215]" : ""}`}
                      >
                        {label}
                      </td>
                      <td
                        className={`border border-[#dfe4ea] px-2.5 py-1.5 text-right font-semibold ${last ? "text-[15px] font-extrabold" : ""}`}
                      >
                        {value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ) : null}

        {/* observações */}
        {notes.map((note) => (
          <section key={note.title} className="print-avoid-break mt-4">
            <h2 className="text-[10px] font-bold tracking-[0.12em] text-[#5b6472] uppercase">
              {note.title}
            </h2>
            <p className="mt-1 text-[11.5px] leading-relaxed whitespace-pre-line">{note.text}</p>
          </section>
        ))}

        {signature ? (
          <section className="print-avoid-break mt-12 flex justify-center">
            <div className="w-[80mm] border-t border-[#101215] pt-1.5 text-center text-[11px]">
              {signature}
            </div>
          </section>
        ) : null}

        <footer className="mt-8 border-t border-[#e2e6ec] pt-2 text-center text-[10px] text-[#5b6472]">
          {settings.document_footer ?? settings.company_name}
        </footer>
      </article>
    </div>
  );
}
