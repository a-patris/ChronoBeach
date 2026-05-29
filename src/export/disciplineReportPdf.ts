import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Match, Team, Tournament } from "../types";
import {
  ensureMatchSheet,
  getDisciplineReportSubjectLabel,
  normalizeOfficials,
} from "../matchSheet";
import { getTeam, matchStatusLabel } from "../utils";
import {
  downloadPdf,
  formatPdfDate,
  formatPdfDateTime,
  PDF_COLORS,
  pdfText,
  sanitizeFilename,
} from "./pdfCommon";

export function exportDisciplineReportPdf(
  tournament: Tournament,
  match: Match,
  teamA: Team,
  teamB: Team,
): void {
  const sheet = ensureMatchSheet(match);
  const reports = sheet.disciplineReports ?? [];
  if (reports.length === 0) return;

  const officials = normalizeOfficials(sheet.officials);
  const pool = tournament.pools.find((p) => p.id === match.poolId);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.blue);
  doc.text("RAPPORT DE DISCIPLINE", 105, y, { align: "center" });

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("Carton bleu — Feuille officielle FFHandball", 105, y, { align: "center" });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(pdfText(tournament.name), 14, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${teamA.name}  /  ${teamB.name}`, 14, y);
  doc.text(`${match.scoreA} - ${match.scoreB}`, 196, y, { align: "right" });

  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  const meta = [
    pool?.name,
    match.label,
    match.scheduledTime ? `Heure prevue : ${match.scheduledTime}` : null,
    `Date export : ${formatPdfDate()}`,
    `Statut match : ${matchStatusLabel(match.status)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(meta, 14, y);

  y += 8;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: PDF_COLORS.blue, fontStyle: "bold" },
    head: [["Equipe", "Joueur / Staff", "Motif", "Horodatage"]],
    body: reports.map((r) => {
      const team = getTeam(tournament, r.teamId);
      const sideKey = r.teamId === match.teamAId ? "teamA" : "teamB";
      const sideData = sheet[sideKey];
      return [
        pdfText(team?.name),
        getDisciplineReportSubjectLabel(team, sideData, r),
        pdfText(r.note),
        formatPdfDateTime(r.at),
      ];
    }),
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    "Ce document ne fait pas partie de l'affichage public. A conserver pour la commission de discipline.",
    14,
    y,
    { maxWidth: 180 },
  );

  y += 14;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 4 },
    body: [
      ["Arbitre principal", pdfText(officials.referee1), "Signature", ""],
      ["Secretaire", pdfText(officials.scorekeeper), "Signature", ""],
      ["Responsable de salle", pdfText(officials.roomManager), "Date", formatPdfDate()],
    ],
    margin: { left: 14, right: 14 },
  });

  downloadPdf(
    doc,
    `Rapport_discipline_${sanitizeFilename(teamA.name)}_vs_${sanitizeFilename(teamB.name)}.pdf`,
  );
}
