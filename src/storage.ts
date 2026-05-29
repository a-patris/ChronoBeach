import type { Match, MatchSheet, Tournament } from "./types";
import { defaultMatchSheet } from "./matchSheet";
import {
  getTournamentEventType,
  getTournamentRosterLimit,
  normalizeTournamentSettings,
} from "./tournamentConfig";
import { REGULAR_SHOTS_PER_TEAM } from "./shootout";
import { defaultTimeoutsUsed, defaultTimer } from "./utils";

export const STORAGE_KEY = "chronobeach-tournament";

function normalizeShootout(
  shootout: NonNullable<Match["shootout"]>,
  teamAId: string,
): NonNullable<Match["shootout"]> {
  const inSetup = shootout.phase === "setup" || (!shootout.phase && shootout.shots.length === 0);
  const firstShooterId =
    shootout.firstShooterId ||
    (inSetup ? "" : (shootout.shots[0]?.teamId ?? teamAId));
  const suddenDeath = shootout.suddenDeath ?? false;
  let phase = shootout.phase;
  if (!phase) {
    if (shootout.shots.length === 0 && !shootout.currentTeamId) phase = "setup";
    else if (suddenDeath) phase = "sudden_death";
    else phase = "regular";
  }
  return {
    ...shootout,
    firstShooterId,
    phase,
    suddenDeath: phase === "sudden_death" || suddenDeath,
    shots: shootout.shots.map((s, i) => ({
      ...s,
      phase:
        s.phase ??
        (i >= REGULAR_SHOTS_PER_TEAM * 2 || phase === "sudden_death"
          ? "sudden_death"
          : "regular"),
    })),
  };
}

function normalizeMatchSheetSide(
  side: MatchSheet["teamA"] | undefined,
): MatchSheet["teamA"] {
  return {
    presentPlayerIds: side?.presentPlayerIds ?? [],
    captainId: side?.captainId,
    staffName: side?.staffName,
    staffName2: side?.staffName2,
    activeSpecialistId: side?.activeSpecialistId,
    excludedPlayerIds: side?.excludedPlayerIds ?? [],
  };
}

function normalizeMatchSheet(sheet: MatchSheet | undefined): MatchSheet {
  const base = sheet ?? defaultMatchSheet();
  return {
    ...base,
    teamA: normalizeMatchSheetSide(base.teamA),
    teamB: normalizeMatchSheetSide(base.teamB),
    goals: base.goals ?? [],
    sanctions: base.sanctions ?? [],
    plays: base.plays ?? [],
    disciplineReports: base.disciplineReports ?? [],
    officials: base.officials
      ? {
          ...base.officials,
          referee1: base.officials.referee1 ?? base.officials.referees,
        }
      : undefined,
  };
}

function normalizeMatch(m: Match & { timeoutTeamId?: string }): Match {
  const { timeoutTeamId: _legacy, ...rest } = m;
  return {
    ...rest,
    timer: rest.timer ?? defaultTimer(),
    mode: rest.mode ?? "match",
    periodScores: rest.periodScores ?? {},
    timeoutsUsed: rest.timeoutsUsed ?? defaultTimeoutsUsed(),
    matchSheet: normalizeMatchSheet(rest.matchSheet),
    timeout: rest.timeout,
    shootout: rest.shootout
      ? normalizeShootout(rest.shootout, rest.teamAId)
      : undefined,
  };
}

function normalizeTournament(t: Tournament): Tournament {
  const settings = normalizeTournamentSettings({
    eventType: t.eventType ?? getTournamentEventType(t),
    rosterSize: t.rosterSize ?? getTournamentRosterLimit(t),
  });
  return {
    ...t,
    ...settings,
    pools: t.pools ?? [],
    teams: (t.teams ?? []).map((team) => ({
      ...team,
      players: team.players ?? [],
    })),
    matches: t.matches.map((m) => normalizeMatch(m as Match & { timeoutTeamId?: string })),
  };
}

export function normalizeTournamentData(t: Tournament): Tournament {
  return normalizeTournament(t);
}

export function loadTournament(): Tournament | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Tournament;
    if (!parsed.id || !parsed.name) return null;
    return normalizeTournament(parsed);
  } catch {
    return null;
  }
}

export function saveTournament(tournament: Tournament): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
}

export function clearTournament(): void {
  localStorage.removeItem(STORAGE_KEY);
}
