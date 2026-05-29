import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Match, Player, Team, Tournament } from "../types";
import {
  ensureMatchSheet,
  getEventTimeline,
  getPlayerName,
  getPresentPlayers,
  getSanctionSubjectLabel,
  goalTypeLabel,
  normalizeOfficials,
  playerDisplayName,
  playEventLabel,
  sanctionLabel,
} from "../matchSheet";
import { eventTypeLabel, getTournamentEventType } from "../tournamentConfig";
import { formatTime, getTeam, matchStatusLabel } from "../utils";
import {
  downloadPdf,
  ensureSpace,
  formatPdfDate,
  formatPdfTime,
  PDF_COLORS,
  pdfText,
  sanitizeFilename,
} from "./pdfCommon";

type PlayerRowStats = {
  goals: number;
  points: number;
  shots: number;
  saves: number;
  warnings: number;
  exclusions: number;
  disqualifications: number;
};

function playerStatsForMatch(
  sheet: ReturnType<typeof ensureMatchSheet>,
  teamId: string,
  playerId: string,
): PlayerRowStats {
  const goals = sheet.goals.filter((g) => g.teamId === teamId && g.playerId === playerId);
  const plays = sheet.plays ?? [];
  const sanctions = sheet.sanctions.filter((s) => s.teamId === teamId && s.playerId === playerId);
  return {
    goals: goals.length,
    points: goals.reduce((sum, g) => sum + g.points, 0),
    shots: plays.filter((p) => p.teamId === teamId && p.playerId === playerId && p.type === "shot_miss")
      .length,
    saves: plays.filter((p) => p.teamId === teamId && p.playerId === playerId && p.type === "save")
      .length,
    warnings: sanctions.filter((s) => s.type === "warning").length,
    exclusions: sanctions.filter((s) => s.type === "exclusion").length,
    disqualifications: sanctions.filter((s) => s.type === "disqualification").length,
  };
}

function roleTag(p: Player): string {
  if (p.isGoalkeeper && p.isSpecialist) return "GK/S";
  if (p.isGoalkeeper) return "GK";
  if (p.isSpecialist) return "S";
  return "";
}

function buildRosterRows(
  team: Team,
  side: "teamA" | "teamB",
  match: Match,
): string[][] {
  const sheet = ensureMatchSheet(match);
  const sideData = sheet[side];
  const players = getPresentPlayers(team, match, side);

  const rows = players.map((p) => {
    const stats = playerStatsForMatch(sheet, team.id, p.id);
    const cap = sideData.captainId === p.id ? "X" : "";
    const name = playerDisplayName(p);
    return [
      cap,
      String(p.number),
      name,
      roleTag(p),
      String(stats.goals),
      String(stats.points),
      String(stats.shots),
      String(stats.saves),
      stats.warnings ? String(stats.warnings) : "",
      stats.exclusions ? String(stats.exclusions) : "",
      stats.disqualifications ? String(stats.disqualifications) : "",
    ];
  });

  while (rows.length < 8) {
    rows.push(["", "", "", "", "", "", "", "", "", "", ""]);
  }

  return rows;
}

function sideLabel(match: Match, teamId: string): "REC" | "VIS" {
  return teamId === match.teamAId ? "REC" : "VIS";
}

function formatGoalAction(
  match: Match,
  team: Team | undefined,
  goal: (ReturnType<typeof ensureMatchSheet>["goals"][0]),
): string {
  const side = sideLabel(match, goal.teamId);
  const player = getPlayerName(team, goal.playerId);
  const type =
    goal.points === 2 && goal.goalType && goal.goalType !== "classic"
      ? `But +2 ${goalTypeLabel(goal.goalType).replace(" (+2)", "")}`
      : goal.points === 2
        ? "But +2"
        : "But +1";
  return `${type} ${side} ${player}`;
}

function formatTimelineAction(
  match: Match,
  tournament: Tournament,
  entry: ReturnType<typeof getEventTimeline>[number],
): string {
  if (entry.kind === "goal") {
    const team = getTeam(tournament, entry.goal.teamId);
    return formatGoalAction(match, team, entry.goal);
  }
  if (entry.kind === "play") {
    const team = getTeam(tournament, entry.play.teamId);
    const side = sideLabel(match, entry.play.teamId);
    const player = getPlayerName(team, entry.play.playerId);
    return `${playEventLabel(entry.play.type)} ${side} ${player}`;
  }
  const s = entry.sanction;
  const team = getTeam(tournament, s.teamId);
  const sideKey = s.teamId === match.teamAId ? "teamA" : "teamB";
  const sideData = ensureMatchSheet(match)[sideKey];
  const subject = getSanctionSubjectLabel(team, sideData, s);
  const side = sideLabel(match, s.teamId);
  return `${sanctionLabel(s.type)} ${side} ${subject}`;
}

function buildTimelineRows(
  match: Match,
  tournament: Tournament,
): { period: 1 | 2 | "SO"; time: string; score: string; action: string }[] {
  const rows: { period: 1 | 2 | "SO"; time: string; score: string; action: string }[] = [];
  let scoreA = 0;
  let scoreB = 0;

  for (const entry of getEventTimeline(match)) {
    if (entry.kind === "goal") {
      const g = entry.goal;
      if (g.teamId === match.teamAId) scoreA += g.points;
      else scoreB += g.points;
      rows.push({
        period: g.period,
        time: g.elapsedSeconds != null ? formatPdfTime(g.elapsedSeconds) : "—",
        score: `${scoreA} - ${scoreB}`,
        action: formatTimelineAction(match, tournament, entry),
      });
      continue;
    }

    const period =
      entry.kind === "play" ? entry.play.period : entry.sanction.period;
    const elapsed =
      entry.kind === "play"
        ? entry.play.elapsedSeconds
        : entry.sanction.elapsedSeconds;

    rows.push({
      period,
      time: elapsed != null ? formatPdfTime(elapsed) : "—",
      score: `${scoreA} - ${scoreB}`,
      action: formatTimelineAction(match, tournament, entry),
    });
  }

  const so = match.shootout;
  if (so && so.shots.length > 0) {
    let soA = 0;
    let soB = 0;
    so.shots.forEach((shot, i) => {
      if (shot.result === "goal") {
        const pts = shot.points ?? 1;
        if (shot.teamId === match.teamAId) soA += pts;
        else soB += pts;
      }
      const team = getTeam(tournament, shot.teamId);
      const side = sideLabel(match, shot.teamId);
      const player = getPlayerName(team, shot.playerId);
      const label =
        shot.result === "goal"
          ? `But SO ${side} ${player}`
          : shot.result === "save"
            ? `Arrêt SO ${side} ${player}`
            : `Tir raté SO ${side} ${player}`;
      rows.push({
        period: "SO",
        time: `#${i + 1}`,
        score: `${soA} - ${soB}`,
        action: label,
      });
    });
  }

  return rows;
}

function drawHeader(
  doc: jsPDF,
  tournament: Tournament,
  match: Match,
  teamA: Team,
  teamB: Team,
): number {
  const sheet = ensureMatchSheet(match);
  const officials = normalizeOfficials(sheet.officials);
  const pool = tournament.pools.find((p) => p.id === match.poolId);
  const p1 = match.periodScores.period1;
  const p2 = match.periodScores.period2;
  const setsA =
    (match.periodWinners.period1 === teamA.id ? 1 : 0) +
    (match.periodWinners.period2 === teamA.id ? 1 : 0) +
    (match.shootout?.winnerTeamId === teamA.id ? 1 : 0);
  const setsB =
    (match.periodWinners.period1 === teamB.id ? 1 : 0) +
    (match.periodWinners.period2 === teamB.id ? 1 : 0) +
    (match.shootout?.winnerTeamId === teamB.id ? 1 : 0);

  let y = 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.header);
  doc.text(pdfText(tournament.name), 14, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.muted);
  y += 5;
  doc.text(
    `Beach handball · ${eventTypeLabel(getTournamentEventType(tournament))}${pool ? ` · ${pool.name}` : ""}`,
    14,
    y,
  );

  y += 5;
  doc.setFontSize(7);
  doc.text(`Code match : ${match.id.slice(0, 8).toUpperCase()} · ${formatPdfDate()}`, 14, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  const title = `${teamA.name}  /  ${teamB.name}`;
  doc.text(title, 14, y);
  doc.text(`${match.scoreA}  -  ${match.scoreB}`, 196, y, { align: "right" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const meta = [
    match.label,
    match.scheduledTime ? `Heure : ${match.scheduledTime}` : null,
    `Statut : ${matchStatusLabel(match.status)}`,
    `Duree periode : ${formatTime(match.durationSeconds)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(meta, 14, y);

  y += 8;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: PDF_COLORS.header, textColor: 255, fontStyle: "bold" },
    head: [["Officiel", "Nom", "Officiel", "Nom"]],
    body: [
      ["Chronometreur", pdfText(officials.timekeeper), "Arbitre 1", pdfText(officials.referee1)],
      ["Secretaire", pdfText(officials.scorekeeper), "Arbitre 2", pdfText(officials.referee2)],
      [
        "Resp. de salle",
        pdfText(officials.roomManager),
        "Juge accomp.",
        pdfText(officials.accompanyingJudge),
      ],
    ],
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  const rosterHead = [
    "C",
    "N",
    "Nom prenom",
    "R",
    "Buts",
    "Pts",
    "Tirs",
    "Arr.",
    "Av.",
    "Excl.",
    "Disq.",
  ];

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    head: [
      [
        {
          content: `${teamA.name} (Recevant)`,
          colSpan: 11,
          styles: { fillColor: PDF_COLORS.accent, fontStyle: "bold", halign: "left" },
        },
      ],
      rosterHead,
    ],
    body: buildRosterRows(teamA, "teamA", match),
    margin: { left: 14, right: 106 },
    tableWidth: 86,
  });

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    head: [
      [
        {
          content: `${teamB.name} (Visiteur)`,
          colSpan: 11,
          styles: { fillColor: PDF_COLORS.accent, fontStyle: "bold", halign: "left" },
        },
      ],
      rosterHead,
    ],
    body: buildRosterRows(teamB, "teamB", match),
    margin: { left: 110, right: 14 },
    tableWidth: 86,
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  const staffRows = [
    ["Entraineur (R)", pdfText(sheet.teamA.staffName), "Entraineur (R)", pdfText(sheet.teamB.staffName)],
    [
      "2e entraineur (R2)",
      pdfText(sheet.teamA.staffName2),
      "2e entraineur (R2)",
      pdfText(sheet.teamB.staffName2),
    ],
  ];

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 7, cellPadding: 1.2 },
    body: staffRows,
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: PDF_COLORS.header, fontStyle: "bold" },
    head: [["", "Periode 1", "Periode 2", "Score actuel", "Sets gagnes"]],
    body: [
      [
        teamA.name,
        p1 ? String(p1.scoreA) : match.period === 1 ? String(match.scoreA) : "—",
        p2 ? String(p2.scoreA) : match.period === 2 ? String(match.scoreA) : "—",
        String(match.scoreA),
        String(setsA),
      ],
      [
        teamB.name,
        p1 ? String(p1.scoreB) : match.period === 1 ? String(match.scoreB) : "—",
        p2 ? String(p2.scoreB) : match.period === 2 ? String(match.scoreB) : "—",
        String(match.scoreB),
        String(setsB),
      ],
    ],
    margin: { left: 14, right: 14 },
  });

  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
}

function drawTimeline(
  doc: jsPDF,
  match: Match,
  tournament: Tournament,
  startY: number,
): void {
  const rows = buildTimelineRows(match, tournament);
  if (rows.length === 0) return;

  let y = ensureSpace(doc, startY, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.header);
  doc.text("Deroule du match", 14, y);
  y += 6;

  let currentPeriod: 1 | 2 | "SO" | null = null;

  for (const row of rows) {
    if (row.period !== currentPeriod) {
      currentPeriod = row.period;
      y = ensureSpace(doc, y, 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.accent);
      const label =
        row.period === "SO"
          ? "SHOOT-OUT"
          : `PERIODE ${row.period}`;
      doc.text(label, 14, y);
      y += 4;
    }

    y = ensureSpace(doc, y, 8);
    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 7, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 18 },
        2: { cellWidth: "auto" },
      },
      body: [[row.time, row.score, row.action]],
      margin: { left: 14, right: 14 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 1;
  }
}

export function exportMatchSheetPdf(
  tournament: Tournament,
  match: Match,
  teamA: Team,
  teamB: Team,
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const endHeaderY = drawHeader(doc, tournament, match, teamA, teamB);
  drawTimeline(doc, match, tournament, endHeaderY);

  const footer = `ChronoBeach · Feuille de match · ${teamA.name} vs ${teamB.name}`;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(footer, 14, 290);
    doc.text(`${i} / ${pageCount}`, 196, 290, { align: "right" });
  }

  downloadPdf(doc, `FDME_${sanitizeFilename(teamA.name)}_vs_${sanitizeFilename(teamB.name)}.pdf`);
}
