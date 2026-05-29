import type { jsPDF } from "jspdf";

export function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export function downloadPdf(doc: jsPDF, filename: string): void {
  doc.save(sanitizeFilename(filename));
}

export function pdfText(value: string | undefined | null): string {
  return (value ?? "").trim() || "—";
}

export function formatPdfDate(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatPdfTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatPdfDateTime(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Marge basse page A4 — ajoute une page si besoin. */
export function ensureSpace(doc: jsPDF, y: number, needed = 20): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 12) {
    doc.addPage();
    return 14;
  }
  return y;
}

export const PDF_COLORS = {
  header: [20, 30, 48] as [number, number, number],
  accent: [0, 120, 100] as [number, number, number],
  muted: [100, 110, 125] as [number, number, number],
  line: [200, 205, 212] as [number, number, number],
  warn: [180, 120, 0] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
};
