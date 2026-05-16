import type { HeadToHeadStats, Match, TeamStanding, Tournament } from "./types";
import { getMatchGoalTotals } from "./utils";

/** Vainqueur d'une période : déclaré en admin ou déduit du score archivé. */
export function getPeriodWinnerId(match: Match, period: 1 | 2): string | undefined {
  const key = period === 1 ? "period1" : "period2";
  const declared = match.periodWinners[key];
  if (declared) return declared;

  const archived = match.periodScores[key];
  if (archived) {
    if (archived.scoreA > archived.scoreB) return match.teamAId;
    if (archived.scoreB > archived.scoreA) return match.teamBId;
    return undefined;
  }

  if (match.period === period && match.status === "finished") {
    if (match.scoreA > match.scoreB) return match.teamAId;
    if (match.scoreB > match.scoreA) return match.teamBId;
  }

  return undefined;
}

function isShootoutDecidedMatch(match: Match): boolean {
  const p1 = getPeriodWinnerId(match, 1);
  const p2 = getPeriodWinnerId(match, 2);
  if (!p1 || !p2 || p1 === p2) return false;
  return (
    match.mode === "shootout" ||
    !!match.shootout?.finished ||
    (!!match.winnerTeamId && !!match.shootout)
  );
}

/** Sets de période gagnés (P1 + P2). */
export function getPeriodSetsWonInMatch(match: Match, teamId: string): number {
  const p1 = getPeriodWinnerId(match, 1);
  const p2 = getPeriodWinnerId(match, 2);
  let n = 0;
  if (p1 === teamId) n += 1;
  if (p2 === teamId) n += 1;

  if (match.winnerTeamId === teamId && n === 0 && !isShootoutDecidedMatch(match)) {
    n = 2;
  }

  return n;
}

/** Set gagné au shoot-out (0 ou 1). */
export function getShootoutSetWonInMatch(match: Match, teamId: string): number {
  if (isShootoutDecidedMatch(match) && match.winnerTeamId === teamId) return 1;
  return 0;
}

/** Sets gagnés au total (périodes + shoot-out). */
export function getSetsWonInMatch(match: Match, teamId: string): number {
  return getPeriodSetsWonInMatch(match, teamId) + getShootoutSetWonInMatch(match, teamId);
}

function isFinishedForStandings(match: Match): boolean {
  return match.status === "finished" && !!match.winnerTeamId;
}

function matchBelongsToPool(
  match: Match,
  poolId: string | undefined,
  teamIds: Set<string>,
): boolean {
  if (!teamIds.has(match.teamAId) || !teamIds.has(match.teamBId)) return false;
  if (!poolId) return true;
  if (match.poolId === poolId) return true;
  if (!match.poolId) return true;
  return false;
}

export function totalSetsWon(row: Pick<TeamStanding, "periodSetsWon" | "shootoutSetsWon">): number {
  return row.periodSetsWon + row.shootoutSetsWon;
}

export function totalSetsLost(
  row: Pick<TeamStanding, "periodSetsLost" | "shootoutSetsLost">,
): number {
  return row.periodSetsLost + row.shootoutSetsLost;
}

/** Quotient buts ou sets ; null si dénominateur nul et numérateur nul. */
export function ratioAverage(forValue: number, againstValue: number): number | null {
  if (againstValue === 0) {
    if (forValue === 0) return null;
    return Infinity;
  }
  return forValue / againstValue;
}

export function formatAverage(value: number | null, digits = 2): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(digits);
}

/** Sets gagnés / sets perdus (tournoi entier). */
export function globalSetAverage(row: TeamStanding): number | null {
  return ratioAverage(totalSetsWon(row), totalSetsLost(row));
}

/** Buts marqués / buts encaissés (tournoi entier). */
export function globalGoalAverage(row: TeamStanding): number | null {
  return ratioAverage(row.goalsFor, row.goalsAgainst);
}

/** Groupe d'égalité : même nombre de points (départage par confrontations directes). */
export function getStandingTieKey(row: TeamStanding): string {
  return String(row.points);
}

function createEmptyStanding(teamId: string, poolId?: string): TeamStanding {
  return {
    teamId,
    poolId,
    played: 0,
    won: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    periodSetsWon: 0,
    periodSetsLost: 0,
    shootoutSetsWon: 0,
    shootoutSetsLost: 0,
    setDiff: 0,
    points: 0,
  };
}

function applyMatchToStandings(
  match: Match,
  stA: TeamStanding,
  stB: TeamStanding,
): void {
  const { teamA, teamB } = getMatchGoalTotals(match);

  stA.played += 1;
  stB.played += 1;
  stA.goalsFor += teamA.for;
  stA.goalsAgainst += teamA.against;
  stB.goalsFor += teamB.for;
  stB.goalsAgainst += teamB.against;

  const periodA = getPeriodSetsWonInMatch(match, match.teamAId);
  const periodB = getPeriodSetsWonInMatch(match, match.teamBId);
  const soA = getShootoutSetWonInMatch(match, match.teamAId);
  const soB = getShootoutSetWonInMatch(match, match.teamBId);

  stA.periodSetsWon += periodA;
  stA.periodSetsLost += periodB;
  stA.shootoutSetsWon += soA;
  stA.shootoutSetsLost += soB;
  stB.periodSetsWon += periodB;
  stB.periodSetsLost += periodA;
  stB.shootoutSetsWon += soB;
  stB.shootoutSetsLost += soA;

  if (match.winnerTeamId === match.teamAId) {
    stA.won += 1;
    stA.points += 2;
    stB.lost += 1;
  } else if (match.winnerTeamId === match.teamBId) {
    stB.won += 1;
    stB.points += 2;
    stA.lost += 1;
  }
}

function finalizeStanding(row: TeamStanding): void {
  row.goalDiff = row.goalsFor - row.goalsAgainst;
  row.setDiff = totalSetsWon(row) - totalSetsLost(row);
}

function standingToHeadToHead(row: TeamStanding): HeadToHeadStats {
  const setsWon = totalSetsWon(row);
  const setsLost = totalSetsLost(row);
  return {
    teamId: row.teamId,
    played: row.played,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDiff: row.goalDiff,
    goalAverage: ratioAverage(row.goalsFor, row.goalsAgainst),
    periodSetsWon: row.periodSetsWon,
    periodSetsLost: row.periodSetsLost,
    shootoutSetsWon: row.shootoutSetsWon,
    shootoutSetsLost: row.shootoutSetsLost,
    setDiff: row.setDiff,
    setAverage: ratioAverage(setsWon, setsLost),
    points: row.points,
  };
}

function compareAverageDesc(a: number | null, b: number | null): number {
  const rank = (v: number | null) => {
    if (v === null) return -2;
    if (v === Infinity) return 2;
    return 1;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return rb - ra;
  if (a === null || b === null) return 0;
  if (a === Infinity && b === Infinity) return 0;
  if (a === Infinity) return -1;
  if (b === Infinity) return 1;
  return b - a;
}

/** Départage particulier : sets part. puis GA part. */
function compareHeadToHeadParticular(a: HeadToHeadStats, b: HeadToHeadStats): number {
  const setAvgCmp = compareAverageDesc(a.setAverage, b.setAverage);
  if (setAvgCmp !== 0) return setAvgCmp;
  if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;

  const gaCmp = compareAverageDesc(a.goalAverage, b.goalAverage);
  if (gaCmp !== 0) return gaCmp;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.points !== a.points) return b.points - a.points;
  return b.goalsFor - a.goalsFor;
}

function compareHeadToHead(a: HeadToHeadStats, b: HeadToHeadStats): number {
  return compareHeadToHeadParticular(a, b);
}

/**
 * Ordre de classement : pts → sets avg global → GA global → particuliers.
 */
function compareStandings(
  a: TeamStanding,
  b: TeamStanding,
  h2hByTeam: Map<string, HeadToHeadStats>,
): number {
  if (b.points !== a.points) return b.points - a.points;

  const setAvgCmp = compareAverageDesc(globalSetAverage(a), globalSetAverage(b));
  if (setAvgCmp !== 0) return setAvgCmp;
  if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
  if (totalSetsWon(b) !== totalSetsWon(a)) return totalSetsWon(b) - totalSetsWon(a);

  const gaCmp = compareAverageDesc(globalGoalAverage(a), globalGoalAverage(b));
  if (gaCmp !== 0) return gaCmp;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;

  const h2hA = h2hByTeam.get(a.teamId);
  const h2hB = h2hByTeam.get(b.teamId);
  if (h2hA && h2hB) {
    const h2hCmp = compareHeadToHeadParticular(h2hB, h2hA);
    if (h2hCmp !== 0) return h2hCmp;
  }

  return b.goalsFor - a.goalsFor;
}

/** Stats uniquement sur les matchs entre les équipes listées. */
export function computeHeadToHeadStandings(
  tournament: Tournament,
  teamIds: string[],
  poolId?: string,
): HeadToHeadStats[] {
  const idSet = new Set(teamIds);
  const map = new Map<string, TeamStanding>();

  for (const id of teamIds) {
    const team = tournament.teams.find((t) => t.id === id);
    map.set(id, createEmptyStanding(id, team?.poolId));
  }

  const poolTeamIds = new Set(
    poolId
      ? tournament.teams.filter((t) => t.poolId === poolId).map((t) => t.id)
      : tournament.teams.map((t) => t.id),
  );

  const matches = tournament.matches.filter(
    (m) =>
      isFinishedForStandings(m) &&
      idSet.has(m.teamAId) &&
      idSet.has(m.teamBId) &&
      matchBelongsToPool(m, poolId, poolTeamIds),
  );

  for (const match of matches) {
    const stA = map.get(match.teamAId);
    const stB = map.get(match.teamBId);
    if (!stA || !stB) continue;
    applyMatchToStandings(match, stA, stB);
  }

  const rows = [...map.values()];
  for (const r of rows) finalizeStanding(r);

  return rows
    .map(standingToHeadToHead)
    .sort((a, b) => compareHeadToHead(b, a));
}

function findPointsTieGroups(rows: TeamStanding[]): string[][] {
  const byKey = new Map<string, string[]>();
  for (const row of rows) {
    const key = getStandingTieKey(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(row.teamId);
  }
  return [...byKey.values()].filter((ids) => ids.length >= 2);
}

function buildHeadToHeadMap(
  tournament: Tournament,
  poolId: string | undefined,
  tieGroups: string[][],
): Map<string, HeadToHeadStats> {
  const map = new Map<string, HeadToHeadStats>();
  for (const teamIds of tieGroups) {
    const h2h = computeHeadToHeadStandings(tournament, teamIds, poolId);
    for (const row of h2h) {
      map.set(row.teamId, row);
    }
  }
  return map;
}

export function computeStandings(
  tournament: Tournament,
  poolId?: string,
): TeamStanding[] {
  const teams = poolId
    ? tournament.teams.filter((t) => t.poolId === poolId)
    : tournament.teams;

  const teamIds = new Set(teams.map((t) => t.id));
  const map = new Map<string, TeamStanding>();

  for (const t of teams) {
    map.set(t.id, createEmptyStanding(t.id, t.poolId));
  }

  const matches = tournament.matches.filter(
    (m) => isFinishedForStandings(m) && matchBelongsToPool(m, poolId, teamIds),
  );

  for (const match of matches) {
    const stA = map.get(match.teamAId);
    const stB = map.get(match.teamBId);
    if (!stA || !stB) continue;
    applyMatchToStandings(match, stA, stB);
  }

  const rows = [...map.values()];
  for (const r of rows) finalizeStanding(r);

  const tieGroups = findPointsTieGroups(rows);
  const h2hByTeam = buildHeadToHeadMap(tournament, poolId, tieGroups);

  return rows.sort((a, b) => compareStandings(a, b, h2hByTeam));
}

export function getDefaultPoolId(tournament: Tournament): string | undefined {
  return tournament.pools[0]?.id;
}
