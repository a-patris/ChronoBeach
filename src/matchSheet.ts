import type {
  GoalEvent,
  GoalType,
  Match,
  MatchOfficials,
  MatchSanction,
  MatchSheet,
  MatchSheetSide,
  DisciplineReport,
  PlayEvent,
  PlayEventType,
  Player,
  SanctionType,
  StaffSlot,
  Team,
  Tournament,
} from "./types";
import { computePeriodElapsedSeconds, uid } from "./utils";

import { getTournamentRosterLimit } from "./tournamentConfig";

export function defaultMatchSheet(): MatchSheet {
  return {
    teamA: { presentPlayerIds: [] },
    teamB: { presentPlayerIds: [] },
    goals: [],
    sanctions: [],
    plays: [],
  };
}

/** GK ou spécialiste : buts comptés +2 à la table de marque. */
export function isPlusTwoPlayer(player: Player): boolean {
  return !!(player.isGoalkeeper || player.isSpecialist);
}

export function plusTwoGoalType(player: Player): GoalType {
  return player.isSpecialist ? "specialist" : "goalkeeper";
}

export function resolveGoalForPlayer(
  player: Player | undefined,
  points: 1 | 2,
  goalType?: GoalType,
): { points: 1 | 2; goalType?: GoalType } {
  if (points === 1 && player && isPlusTwoPlayer(player)) {
    return { points: 2, goalType: plusTwoGoalType(player) };
  }
  return { points, goalType };
}

export function setActiveSpecialist(
  match: Match,
  side: "teamA" | "teamB",
  playerId: string | undefined,
): Match {
  const sheet = ensureMatchSheet(match);
  return {
    ...match,
    matchSheet: {
      ...sheet,
      [side]: { ...sheet[side], activeSpecialistId: playerId },
    },
  };
}

export function defaultMatchSheetSide(): MatchSheet["teamA"] {
  return { presentPlayerIds: [] };
}

export function playerDisplayName(p: Player): string {
  if (p.firstName?.trim()) {
    return `${p.name.toUpperCase()} ${p.firstName.trim()}`;
  }
  return p.name;
}

export function normalizeOfficials(
  officials?: MatchOfficials,
): MatchOfficials {
  if (!officials) return {};
  return {
    ...officials,
    referee1: officials.referee1 ?? officials.referees,
  };
}

export type SheetValidation = {
  ok: boolean;
  issues: string[];
  warnings: string[];
};

/** Contrôles FDME avant passage à la feuille de table (sans licences). */
export function validateMatchSheet(
  match: Match,
  teamA: Team,
  teamB: Team,
): SheetValidation {
  const sheet = ensureMatchSheet(match);
  const officials = normalizeOfficials(sheet.officials);
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!officials.roomManager?.trim()) issues.push("Responsable de salle manquant");
  if (!officials.scorekeeper?.trim()) issues.push("Secrétaire manquant");
  if (!officials.timekeeper?.trim()) issues.push("Chronométreur manquant");
  if (!officials.referee1?.trim()) issues.push("Arbitre principal manquant");

  for (const [team, side, label] of [
    [teamA, sheet.teamA, teamA.name] as const,
    [teamB, sheet.teamB, teamB.name] as const,
  ]) {
    const present = team.players?.filter((p) => side.presentPlayerIds.includes(p.id)) ?? [];
    if (present.length === 0) {
      issues.push(`Aucun joueur présent : ${label}`);
      continue;
    }
    if (!side.captainId || !side.presentPlayerIds.includes(side.captainId)) {
      issues.push(`Capitaine non désigné : ${label}`);
    }
  }

  return { ok: issues.length === 0, issues, warnings };
}

export function patchOfficials(
  match: Match,
  patch: Partial<MatchOfficials>,
): Match {
  const sheet = ensureMatchSheet(match);
  return {
    ...match,
    matchSheet: {
      ...sheet,
      officials: { ...normalizeOfficials(sheet.officials), ...patch },
    },
  };
}

export function ensureMatchSheet(match: Match): MatchSheet {
  return match.matchSheet ?? defaultMatchSheet();
}

export function createPlayer(number: number, name: string, opts?: Partial<Player>): Player {
  return {
    id: uid(),
    number,
    name: name.trim(),
    isGoalkeeper: opts?.isGoalkeeper,
    isSpecialist: opts?.isSpecialist,
  };
}

export function sanctionLabel(type: SanctionType): string {
  const labels: Record<SanctionType, string> = {
    warning: "Avertissement",
    /** Beach : retour à la prochaine possession de balle (pas de carton bleu). */
    exclusion: "Exclusion (proch. possession)",
    disqualification: "Disqualification",
  };
  return labels[type];
}

export function sanctionDisplayHeadline(type: SanctionType): string {
  const labels: Record<SanctionType, string> = {
    warning: "AVERTISSEMENT",
    exclusion: "EXCLUSION",
    disqualification: "DISQUALIFICATION",
  };
  return labels[type];
}

export function sanctionDisplaySubline(type: SanctionType, subject: string): string {
  switch (type) {
    case "warning":
      return subject;
    case "exclusion":
      return `${subject} · reprend à la prochaine possession de balle`;
    case "disqualification":
      return `${subject} · exclu du match`;
  }
}

export function goalTypeLabel(type?: GoalType): string {
  if (!type || type === "classic") return "Classique (+1)";
  const labels: Record<Exclude<GoalType, "classic">, string> = {
    "360": "360° (+2)",
    kungfu: "Kung-fu (+2)",
    goalkeeper: "Gardien (+2)",
    specialist: "Spécialiste (+2)",
    penalty6m: "Jet 6 m (+2)",
  };
  return labels[type];
}

export function countPlayerExclusions(
  sheet: MatchSheet,
  playerId: string,
): number {
  return sheet.sanctions.filter(
    (s) => s.playerId === playerId && s.type === "exclusion",
  ).length;
}

export function isPlayerDisqualified(sheet: MatchSheet, playerId: string): boolean {
  return sheet.sanctions.some(
    (s) => s.playerId === playerId && s.type === "disqualification",
  );
}

export function isPlayerSideline(
  sheet: MatchSheet,
  side: "teamA" | "teamB",
  playerId: string,
): boolean {
  return (sheet[side].excludedPlayerIds ?? []).includes(playerId);
}

export function isPlayerSelectable(
  match: Match,
  teamId: string,
  playerId: string,
): boolean {
  const sheet = ensureMatchSheet(match);
  if (isPlayerDisqualified(sheet, playerId)) return false;
  const side = teamId === match.teamAId ? "teamA" : "teamB";
  if (isPlayerSideline(sheet, side, playerId)) return false;
  return true;
}

function sideKeyForTeam(match: Match, teamId: string): "teamA" | "teamB" {
  return teamId === match.teamAId ? "teamA" : "teamB";
}

function markPlayerExcluded(match: Match, teamId: string, playerId: string): Match {
  const sheet = ensureMatchSheet(match);
  const sideKey = sideKeyForTeam(match, teamId);
  const side = sheet[sideKey];
  const excluded = side.excludedPlayerIds ?? [];
  if (excluded.includes(playerId)) return match;
  const nextSide: MatchSheetSide = {
    ...side,
    excludedPlayerIds: [...excluded, playerId],
  };
  if (nextSide.activeSpecialistId === playerId) {
    nextSide.activeSpecialistId = undefined;
  }
  return {
    ...match,
    matchSheet: { ...sheet, [sideKey]: nextSide },
  };
}

/** Prochaine possession : les exclus de l'équipe peuvent reprendre. */
export function clearTeamExclusions(match: Match, teamId: string): Match {
  const sheet = ensureMatchSheet(match);
  const sideKey = sideKeyForTeam(match, teamId);
  const side = sheet[sideKey];
  if (!side.excludedPlayerIds?.length) return match;
  return {
    ...match,
    matchSheet: {
      ...sheet,
      [sideKey]: { ...side, excludedPlayerIds: [] },
    },
  };
}

export function clearAllExclusions(match: Match): Match {
  const sheet = ensureMatchSheet(match);
  return {
    ...match,
    matchSheet: {
      ...sheet,
      teamA: { ...sheet.teamA, excludedPlayerIds: [] },
      teamB: { ...sheet.teamB, excludedPlayerIds: [] },
    },
  };
}

export function getStaffName(side: MatchSheetSide, slot: StaffSlot): string | undefined {
  return slot === "coach1" ? side.staffName : side.staffName2;
}

export function getStaffLabel(side: MatchSheetSide, slot: StaffSlot): string {
  const role = slot === "coach1" ? "Entraîneur" : "2e entraîneur";
  const name = getStaffName(side, slot)?.trim();
  return name ? `${role} — ${name}` : role;
}

export function getSanctionSubjectLabel(
  team: Team | undefined,
  side: MatchSheetSide | undefined,
  sanction: MatchSanction,
): string {
  if (sanction.staffSlot && side) return getStaffLabel(side, sanction.staffSlot);
  return getPlayerName(team, sanction.playerId);
}

export function addSanction(
  match: Match,
  teamId: string,
  type: SanctionType,
  playerId?: string,
  staffSlot?: StaffSlot,
): Match {
  const sheet = ensureMatchSheet(match);
  let effectiveType = type;

  if (type === "exclusion" && playerId && !staffSlot) {
    const prior = countPlayerExclusions(sheet, playerId);
    if (prior >= 1) effectiveType = "disqualification";
  }

  const sanction: MatchSanction = {
    id: uid(),
    teamId,
    playerId: staffSlot ? undefined : playerId,
    staffSlot,
    type: effectiveType,
    period: match.period,
    at: Date.now(),
    elapsedSeconds: computePeriodElapsedSeconds(match),
  };

  let next: Match = {
    ...match,
    matchSheet: {
      ...sheet,
      sanctions: [...sheet.sanctions, sanction],
    },
  };

  if (effectiveType === "exclusion" && playerId && !staffSlot) {
    next = markPlayerExcluded(next, teamId, playerId);
  }

  return next;
}

export function removeSanction(match: Match, sanctionId: string): Match {
  const sheet = ensureMatchSheet(match);
  return {
    ...match,
    matchSheet: {
      ...sheet,
      sanctions: sheet.sanctions.filter((s) => s.id !== sanctionId),
    },
  };
}

export function getDisciplineReportSubjectLabel(
  team: Team | undefined,
  side: MatchSheetSide | undefined,
  report: DisciplineReport,
): string {
  if (report.staffSlot && side) return getStaffLabel(side, report.staffSlot);
  if (report.playerId) return getPlayerName(team, report.playerId);
  return "Équipe / non précisé";
}

export function addDisciplineReport(
  match: Match,
  teamId: string,
  playerId?: string,
  staffSlot?: StaffSlot,
  note?: string,
): Match {
  const sheet = ensureMatchSheet(match);
  const report: DisciplineReport = {
    id: uid(),
    teamId,
    playerId: staffSlot ? undefined : playerId,
    staffSlot,
    note: note?.trim() || undefined,
    at: Date.now(),
  };
  return {
    ...match,
    matchSheet: {
      ...sheet,
      disciplineReports: [...(sheet.disciplineReports ?? []), report],
    },
  };
}

export function removeDisciplineReport(match: Match, reportId: string): Match {
  const sheet = ensureMatchSheet(match);
  return {
    ...match,
    matchSheet: {
      ...sheet,
      disciplineReports: (sheet.disciplineReports ?? []).filter((r) => r.id !== reportId),
    },
  };
}

export function playEventLabel(type: PlayEventType): string {
  return type === "shot_miss" ? "Tir raté" : "Arrêt";
}

export function recordPlayEvent(
  match: Match,
  teamId: string,
  type: PlayEventType,
  playerId?: string,
): Match {
  const sheet = ensureMatchSheet(match);
  const event: PlayEvent = {
    id: uid(),
    teamId,
    playerId,
    type,
    period: match.period,
    at: Date.now(),
    elapsedSeconds: computePeriodElapsedSeconds(match),
  };
  let next: Match = {
    ...match,
    matchSheet: { ...sheet, plays: [...sheet.plays, event] },
  };
  return clearTeamExclusions(next, teamId);
}

export function recordGoalEvent(
  match: Match,
  teamId: string,
  points: 1 | 2,
  goalType?: GoalType,
  playerId?: string,
): Match {
  const sheet = ensureMatchSheet(match);
  const event: GoalEvent = {
    id: uid(),
    teamId,
    playerId,
    points,
    goalType: points === 2 ? (goalType ?? "classic") : "classic",
    period: match.period,
    at: Date.now(),
    elapsedSeconds: computePeriodElapsedSeconds(match),
  };
  let next: Match = {
    ...match,
    matchSheet: {
      ...sheet,
      goals: [...sheet.goals, event],
    },
  };
  return clearTeamExclusions(next, teamId);
}

export function removeLastGoalEvent(match: Match, teamId: string): Match {
  const sheet = ensureMatchSheet(match);
  const goals = [...sheet.goals];
  for (let i = goals.length - 1; i >= 0; i--) {
    if (goals[i].teamId === teamId) {
      goals.splice(i, 1);
      break;
    }
  }
  return { ...match, matchSheet: { ...sheet, goals } };
}

export function setCaptain(
  match: Match,
  side: "teamA" | "teamB",
  playerId: string | undefined,
): Match {
  const sheet = ensureMatchSheet(match);
  return {
    ...match,
    matchSheet: {
      ...sheet,
      [side]: { ...sheet[side], captainId: playerId },
    },
  };
}

export function togglePlayerPresent(
  match: Match,
  side: "teamA" | "teamB",
  playerId: string,
): Match {
  const sheet = ensureMatchSheet(match);
  const sideData = sheet[side];
  const present = sideData.presentPlayerIds.includes(playerId)
    ? sideData.presentPlayerIds.filter((id) => id !== playerId)
    : [...sideData.presentPlayerIds, playerId];
  return {
    ...match,
    matchSheet: {
      ...sheet,
      [side]: { ...sideData, presentPlayerIds: present },
    },
  };
}

export function upsertTeamPlayer(
  tournament: Tournament,
  teamId: string,
  player: Player,
): Tournament {
  const max = getTournamentRosterLimit(tournament);
  return {
    ...tournament,
    teams: tournament.teams.map((t) => {
      if (t.id !== teamId) return t;
      const players = t.players ?? [];
      const idx = players.findIndex((p) => p.id === player.id);
      if (idx >= 0) {
        const next = [...players];
        next[idx] = player;
        return { ...t, players: next };
      }
      if (players.length >= max) return t;
      return { ...t, players: [...players, player] };
    }),
  };
}

export function removeTeamPlayer(
  tournament: Tournament,
  teamId: string,
  playerId: string,
): Tournament {
  return {
    ...tournament,
    teams: tournament.teams.map((t) =>
      t.id === teamId
        ? { ...t, players: (t.players ?? []).filter((p) => p.id !== playerId) }
        : t,
    ),
  };
}

export function getPlayerName(team: Team | undefined, playerId?: string): string {
  if (!playerId || !team?.players) return "—";
  const p = team.players.find((pl) => pl.id === playerId);
  return p ? `#${p.number} ${playerDisplayName(p)}` : "—";
}

export function getPlayerSheetStats(
  sheet: MatchSheet,
  teamId: string,
  playerId: string,
): { goals: number; sanctions: MatchSanction[] } {
  return {
    goals: sheet.goals.filter((g) => g.teamId === teamId && g.playerId === playerId).length,
    sanctions: sheet.sanctions.filter((s) => s.teamId === teamId && s.playerId === playerId),
  };
}

export function isScoringReady(match: Match): boolean {
  return !!ensureMatchSheet(match).scoringStarted;
}

export function startScoring(match: Match): Match {
  const sheet = ensureMatchSheet(match);
  return {
    ...match,
    matchSheet: { ...sheet, scoringStarted: true },
    status: match.status === "ready" ? "ready" : match.status,
  };
}

export function backToSheetSetup(match: Match): Match {
  const sheet = ensureMatchSheet(match);
  return { ...match, matchSheet: { ...sheet, scoringStarted: false } };
}

export type TimelineEntry =
  | { kind: "goal"; at: number; goal: GoalEvent }
  | { kind: "sanction"; at: number; sanction: MatchSanction }
  | { kind: "play"; at: number; play: PlayEvent };

export function getEventTimeline(match: Match): TimelineEntry[] {
  const sheet = ensureMatchSheet(match);
  const entries: TimelineEntry[] = [
    ...sheet.goals.map((g, i) => ({
      kind: "goal" as const,
      at: g.at ?? i,
      goal: g,
    })),
    ...sheet.plays.map((p, i) => ({
      kind: "play" as const,
      at: p.at ?? 50000 + i,
      play: p,
    })),
    ...sheet.sanctions.map((s, i) => ({
      kind: "sanction" as const,
      at: s.at ?? 100000 + i,
      sanction: s,
    })),
  ];
  return entries.sort((a, b) => a.at - b.at);
}

export function undoLastEvent(match: Match): Match {
  const timeline = getEventTimeline(match);
  const last = timeline[timeline.length - 1];
  if (!last) return match;

  const sheet = ensureMatchSheet(match);
  if (last.kind === "sanction") {
    let next: Match = {
      ...match,
      matchSheet: {
        ...sheet,
        sanctions: sheet.sanctions.filter((s) => s.id !== last.sanction.id),
      },
    };
    const s = last.sanction;
    if (s.type === "exclusion" && s.playerId) {
      const sideKey = sideKeyForTeam(match, s.teamId);
      const side = next.matchSheet![sideKey];
      next = {
        ...next,
        matchSheet: {
          ...next.matchSheet!,
          [sideKey]: {
            ...side,
            excludedPlayerIds: (side.excludedPlayerIds ?? []).filter(
              (id) => id !== s.playerId,
            ),
          },
        },
      };
    }
    return next;
  }

  if (last.kind === "play") {
    return {
      ...match,
      matchSheet: {
        ...sheet,
        plays: sheet.plays.filter((p) => p.id !== last.play.id),
      },
    };
  }

  const g = last.goal;
  const isA = g.teamId === match.teamAId;
  let next: Match = {
    ...match,
    scoreA: isA ? Math.max(0, match.scoreA - g.points) : match.scoreA,
    scoreB: !isA ? Math.max(0, match.scoreB - g.points) : match.scoreB,
    matchSheet: {
      ...sheet,
      goals: sheet.goals.filter((x) => x.id !== g.id),
    },
  };

  const key = match.period === 1 ? "period1" : "period2";
  if (next.goldenGoalActive && next.periodWinners[key]) {
    next = {
      ...next,
      goldenGoalActive: true,
      periodWinners: { ...next.periodWinners, [key]: undefined },
    };
  }

  return next;
}

export function getPresentPlayers(team: Team, match: Match, side: "teamA" | "teamB"): Player[] {
  const sheet = ensureMatchSheet(match);
  const ids = sheet[side].presentPlayerIds;
  return (team.players ?? [])
    .filter((p) => ids.includes(p.id))
    .sort((a, b) => a.number - b.number);
}
