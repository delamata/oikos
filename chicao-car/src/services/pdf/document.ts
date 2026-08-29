import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { formatDate, formatDocument, formatPhone } from "@/lib/utils/format";
import type { WorkshopSettings } from "@/types";

/**
 * Gerador de PDF A4 usado por orçamento, OS, recibo e relatórios.
 * Layout próprio (não é "print da tela"): cabeçalho com identidade da oficina,
 * blocos de informação, tabelas e rodapé numerado.
 */
export interface PdfBlock {
  title: string;
  rows: [string, string][];
}

export interface PdfTable {
  title?: string;
  head: string[];
  body: RowInput[];
  align?: ("left" | "right" | "center")[];
  foot?: RowInput[];
}

export interface PdfDocumentInput {
  settings: WorkshopSettings;
  title: string;
  reference?: string;
  issuedAt?: Date;
  blocks?: PdfBlock[];
  tables?: PdfTable[];
  totals?: [string, string][];
  notes?: { title: string; text: string }[];
  fileName: string;
}

const MARGIN = 14;
const AMBER: [number, number, number] = [208, 134, 28];
const INK: [number, number, number] = [22, 26, 32];
const GREY: [number, number, number] = [110, 118, 128];

export function buildPdf(input: PdfDocumentInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const { settings } = input;

  // ---- cabeçalho ---------------------------------------------------------
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setFillColor(...AMBER);
  doc.rect(0, 26, pageWidth, 1.2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(settings.company_name, MARGIN, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(190, 196, 204);
  const contact = [
    settings.document ? `CNPJ ${formatDocument(settings.document)}` : null,
    settings.phone ? formatPhone(settings.phone) : null,
    settings.email,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(contact, MARGIN, 19);
  const address = [settings.address, settings.city, settings.state].filter(Boolean).join(" — ");
  if (address) doc.text(address, MARGIN, 23);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(input.title.toUpperCase(), pageWidth - MARGIN, 13, { align: "right" });
  if (input.reference) {
    doc.setFontSize(10);
    doc.setTextColor(...[240, 167, 60]);
    doc.text(input.reference, pageWidth - MARGIN, 19, { align: "right" });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(190, 196, 204);
  doc.text(
    `Emitido em ${formatDate(input.issuedAt ?? new Date())}`,
    pageWidth - MARGIN,
    23.5,
    { align: "right" },
  );

  let cursor = 36;

  // ---- blocos de informação ---------------------------------------------
  for (const block of input.blocks ?? []) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text(block.title.toUpperCase(), MARGIN, cursor);
    cursor += 4;

    doc.setDrawColor(226, 230, 236);
    doc.line(MARGIN, cursor - 2.4, pageWidth - MARGIN, cursor - 2.4);

    const columnWidth = (pageWidth - MARGIN * 2) / 2;
    block.rows.forEach(([label, value], index) => {
      const column = index % 2;
      const line = Math.floor(index / 2);
      const x = MARGIN + column * columnWidth;
      const y = cursor + line * 5.4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.text(`${label}:`, x, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      doc.text(String(value || "—"), x + doc.getTextWidth(`${label}: `) + 1, y);
    });
    cursor += Math.ceil(block.rows.length / 2) * 5.4 + 5;
  }

  // ---- tabelas -----------------------------------------------------------
  for (const table of input.tables ?? []) {
    if (table.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...GREY);
      doc.text(table.title.toUpperCase(), MARGIN, cursor);
      cursor += 3;
    }
    autoTable(doc, {
      startY: cursor,
      head: [table.head],
      body: table.body,
      foot: table.foot,
      margin: { left: MARGIN, right: MARGIN },
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.2, textColor: INK },
      headStyles: { fillColor: [238, 241, 245], textColor: INK, fontStyle: "bold", fontSize: 8 },
      footStyles: { fillColor: [248, 249, 251], textColor: INK, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [252, 253, 254] },
      columnStyles: Object.fromEntries(
        (table.align ?? []).map((align, index) => [index, { halign: align }]),
      ),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursor = ((doc as any).lastAutoTable?.finalY ?? cursor) + 8;
  }

  // ---- totais ------------------------------------------------------------
  if (input.totals?.length) {
    const boxWidth = 78;
    const x = pageWidth - MARGIN - boxWidth;
    const height = input.totals.length * 6 + 6;
    doc.setFillColor(246, 248, 250);
    doc.setDrawColor(226, 230, 236);
    doc.roundedRect(x, cursor, boxWidth, height, 2, 2, "FD");

    input.totals.forEach(([label, value], index) => {
      const y = cursor + 7 + index * 6;
      const last = index === input.totals!.length - 1;
      doc.setFont("helvetica", last ? "bold" : "normal");
      doc.setFontSize(last ? 11 : 9);
      doc.setTextColor(...(last ? INK : GREY));
      doc.text(label, x + 4, y);
      doc.setTextColor(...INK);
      doc.text(value, x + boxWidth - 4, y, { align: "right" });
    });
    cursor += height + 8;
  }

  // ---- observações -------------------------------------------------------
  for (const note of input.notes ?? []) {
    if (!note.text) continue;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text(note.title.toUpperCase(), MARGIN, cursor);
    cursor += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(note.text, pageWidth - MARGIN * 2);
    doc.text(lines, MARGIN, cursor);
    cursor += lines.length * 4.2 + 5;
  }

  // ---- rodapé ------------------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 230, 236);
    doc.line(MARGIN, height - 14, pageWidth - MARGIN, height - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(settings.document_footer ?? settings.company_name, MARGIN, height - 9.5);
    doc.text(`Página ${page} de ${pages}`, pageWidth - MARGIN, height - 9.5, { align: "right" });
  }

  return doc;
}

export function savePdf(input: PdfDocumentInput): void {
  buildPdf(input).save(input.fileName);
}

/** URL temporária do PDF — usada para abrir em nova aba ou compartilhar. */
export function pdfObjectUrl(input: PdfDocumentInput): string {
  return URL.createObjectURL(buildPdf(input).output("blob"));
}
