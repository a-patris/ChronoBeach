import type { Match, MatchSheetSide, SanctionType, Tournament } from "./types";
import { defaultMatchSheet, ensureMatchSheet, getPlayerName } from "./matchSheet";
import { sortMatchesBySchedule } from "./utils";

export type LastMatchSanctionAlert = {
  playerId: string;
  playerLabel: string;
  type: Extract<SanctionType, "exclusion" | "disqualification">;
};

export function getLastMatchPlayerSanctionAlerts(
  tournament: Tournament,
  teamId: string,
  excludeMatchId?: string,
): LastMatchSanctionAlert[] {
  const last = findLastMatchForTeam(tournament, teamId, excludeMatchId);
  if (!last?.matchSheet) return [];

  const team = tournament.teams.find((t) => t.id === teamId);
  const byPlayer = new Map<string, LastMatchSanctionAlert["type"]>();

  for (const s of last.matchSheet.sanctions) {
    if (s.teamId !== teamId || !s.playerId) continue;
    if (s.type !== "exclusion" && s.type !== "disqualification") continue;
    const prev = byPlayer.get(s.playerId);
    if (s.type === "disqualification" || !prev) {
      byPlayer.set(s.playerId, s.type);
    }
  }

  return [...byPlayer.entries()]
    .map(([playerId, type]) => ({
      playerId,
      type,
      playerLabel: getPlayerName(team, playerId),
    }))
    .sort((a, b) => a.playerLabel.localeCompare(b.playerLabel, "fr"));
}

export function formatLastMatchSanctionAlertMessage(
  alerts: LastMatchSanctionAlert[],
  recallLabel: string | null,
): string {
  const lines = alerts.map((a) => {
    if (a.type === "disqualification") {
      return `• ${a.playerLabel} — disqualifié(e) au dernier match (certains tournois : pas de match suivant)`;
    }
    return `• ${a.playerLabel} — exclu(e) au dernier match`;
  });
  const header = recallLabel
    ? `Sanctions au dernier match (${recallLabel}) :`
    : "Sanctions au dernier match :";
  return `${header}\n\n${lines.join("\n")}\n\nVérifiez l'éligibilité pour ce match.`;
}

function sideForTeam(
  match: Match,
  teamId: string,
): { side: "teamA" | "teamB"; data: MatchSheetSide } | null {
  const sheet = match.matchSheet;
  if (!sheet) return null;
  if (match.teamAId === teamId) return { side: "teamA", data: sheet.teamA };
  if (match.teamBId === teamId) return { side: "teamB", data: sheet.teamB };
  return null;
}

function copySideData(data: MatchSheetSide): MatchSheetSide {
  return {
    captainId: data.captainId,
    presentPlayerIds: [...data.presentPlayerIds],
    staffName: data.staffName,
    staffName2: data.staffName2,
    activeSpecialistId: data.activeSpecialistId,
  };
}

function hasRecallableSide(match: Match, teamId: string): boolean {
  const found = sideForTeam(match, teamId);
  return !!found && found.data.presentPlayerIds.length > 0;
}

/** Dernier match programmé avant le match courant où l'équipe avait un effectif saisi. */
export function findLastMatchForTeam(
  tournament: Tournament,
  teamId: string,
  excludeMatchId?: string,
): Match | undefined {
  const sorted = sortMatchesBySchedule(tournament.matches);
  const currentIdx = excludeMatchId
    ? sorted.findIndex((m) => m.id === excludeMatchId)
    : sorted.length;

  const candidates = sorted.filter(
    (m, idx) =>
      m.id !== excludeMatchId &&
      (m.teamAId === teamId || m.teamBId === teamId) &&
      hasRecallableSide(m, teamId) &&
      (excludeMatchId ? idx < currentIdx : true),
  );

  return candidates[candidates.length - 1];
}

export function getLastMatchRecallLabel(
  tournament: Tournament,
  teamId: string,
  excludeMatchId?: string,
): string | null {
  const last = findLastMatchForTeam(tournament, teamId, excludeMatchId);
  if (!last) return null;
  const teamA = tournament.teams.find((t) => t.id === last.teamAId)?.name ?? "?";
  const teamB = tournament.teams.find((t) => t.id === last.teamBId)?.name ?? "?";
  const parts = [last.label, last.scheduledTime, `${teamA} vs ${teamB}`].filter(Boolean);
  return parts.join(" · ");
}

export function applyTeamRecallToMatch(
  tournament: Tournament,
  match: Match,
  teamId: string,
  targetSide: "teamA" | "teamB",
): Match {
  const last = findLastMatchForTeam(tournament, teamId, match.id);
  if (!last) return match;
  const from = sideForTeam(last, teamId);
  if (!from || from.data.presentPlayerIds.length === 0) return match;

  const sheet = ensureMatchSheet(match);
  return {
    ...match,
    matchSheet: {
      ...sheet,
      [targetSide]: copySideData(from.data),
    },
  };
}

export function isTeamSideEmpty(match: Match, side: "teamA" | "teamB"): boolean {
  const sheet = match.matchSheet ?? defaultMatchSheet();
  return sheet[side].presentPlayerIds.length === 0;
}

/** Rappel auto des deux équipes si les feuilles sont vides. */
export function autoRecallTeams(
  tournament: Tournament,
  match: Match,
): Match {
  let next = match;
  if (isTeamSideEmpty(next, "teamA")) {
    next = applyTeamRecallToMatch(tournament, next, next.teamAId, "teamA");
  }
  if (isTeamSideEmpty(next, "teamB")) {
    next = applyTeamRecallToMatch(tournament, next, next.teamBId, "teamB");
  }
  return next;
}

export function recallBothTeams(
  tournament: Tournament,
  match: Match,
): Match {
  let next = match;
  next = applyTeamRecallToMatch(tournament, next, next.teamAId, "teamA");
  next = applyTeamRecallToMatch(tournament, next, next.teamBId, "teamB");
  return next;
}
