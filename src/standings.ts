import type { Match, TeamStanding, Tournament } from "./types";
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

/** Sets gagnés : P1 + P2 (+ shoot-out = 1 set si match départagé au SO). */
export function getSetsWonInMatch(match: Match, teamId: string): number {
  const p1 = getPeriodWinnerId(match, 1);
  const p2 = getPeriodWinnerId(match, 2);
  let n = 0;
  if (p1 === teamId) n += 1;
  if (p2 === teamId) n += 1;

  if (isShootoutDecidedMatch(match) && match.winnerTeamId === teamId) {
    n += 1;
  }

  if (match.winnerTeamId === teamId && n === 0 && !isShootoutDecidedMatch(match)) {
    n = 2;
  }

  return n;
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
    map.set(t.id, {
      teamId: t.id,
      poolId: t.poolId,
      played: 0,
      won: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      setsWon: 0,
      setsLost: 0,
      setAverage: 0,
      points: 0,
    });
  }

  const matches = tournament.matches.filter(
    (m) => isFinishedForStandings(m) && matchBelongsToPool(m, poolId, teamIds),
  );

  for (const match of matches) {
    const { teamA, teamB } = getMatchGoalTotals(match);
    const stA = map.get(match.teamAId);
    const stB = map.get(match.teamBId);
    if (!stA || !stB) continue;

    stA.played += 1;
    stB.played += 1;
    stA.goalsFor += teamA.for;
    stA.goalsAgainst += teamA.against;
    stB.goalsFor += teamB.for;
    stB.goalsAgainst += teamB.against;

    const setsA = getSetsWonInMatch(match, match.teamAId);
    const setsB = getSetsWonInMatch(match, match.teamBId);
    stA.setsWon += setsA;
    stA.setsLost += setsB;
    stB.setsWon += setsB;
    stB.setsLost += setsA;

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

  const rows = [...map.values()];
  for (const r of rows) {
    r.goalDiff = r.goalsFor - r.goalsAgainst;
    r.setAverage = r.setsWon - r.setsLost;
  }

  return rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    if (b.setAverage !== a.setAverage) return b.setAverage - a.setAverage;
    return b.goalsFor - a.goalsFor;
  });
}

export function getDefaultPoolId(tournament: Tournament): string | undefined {
  return tournament.pools[0]?.id;
}
