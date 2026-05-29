import type { Match, PlayerStatsRow, Tournament } from "./types";
import { playerDisplayName } from "./matchSheet";

function emptyRow(playerId: string, teamId: string): PlayerStatsRow {
  return {
    playerId,
    teamId,
    goals: 0,
    points: 0,
    shotsMissed: 0,
    saves: 0,
    shootoutGoals: 0,
    shootoutAttempts: 0,
  };
}

function bump(
  map: Map<string, PlayerStatsRow>,
  playerId: string | undefined,
  teamId: string,
  patch: Partial<PlayerStatsRow>,
): void {
  if (!playerId) return;
  const key = `${teamId}:${playerId}`;
  const row = map.get(key) ?? emptyRow(playerId, teamId);
  map.set(key, {
    ...row,
    goals: row.goals + (patch.goals ?? 0),
    points: row.points + (patch.points ?? 0),
    shotsMissed: row.shotsMissed + (patch.shotsMissed ?? 0),
    saves: row.saves + (patch.saves ?? 0),
    shootoutGoals: row.shootoutGoals + (patch.shootoutGoals ?? 0),
    shootoutAttempts: row.shootoutAttempts + (patch.shootoutAttempts ?? 0),
  });
}

function aggregateMatch(map: Map<string, PlayerStatsRow>, match: Match): void {
  const sheet = match.matchSheet;
  if (!sheet) return;

  for (const g of sheet.goals) {
    bump(map, g.playerId, g.teamId, { goals: 1, points: g.points });
  }

  for (const p of sheet.plays ?? []) {
    if (p.type === "shot_miss") {
      bump(map, p.playerId, p.teamId, { shotsMissed: 1 });
    } else if (p.type === "save") {
      bump(map, p.playerId, p.teamId, { saves: 1 });
    }
  }

  const so = match.shootout;
  if (!so) return;

  for (const shot of so.shots) {
    if (shot.result === "save") {
      bump(map, shot.playerId, shot.teamId, { saves: 1, shootoutAttempts: 1 });
      continue;
    }
    bump(map, shot.playerId, shot.teamId, { shootoutAttempts: 1 });
    if (shot.result === "goal") {
      bump(map, shot.playerId, shot.teamId, {
        shootoutGoals: 1,
        goals: 1,
        points: shot.points ?? 1,
      });
    }
  }
}

function hasActivity(row: PlayerStatsRow): boolean {
  return (
    row.goals > 0 ||
    row.points > 0 ||
    row.shotsMissed > 0 ||
    row.saves > 0 ||
    row.shootoutAttempts > 0
  );
}

function sortPlayers(a: PlayerStatsRow, b: PlayerStatsRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goals !== a.goals) return b.goals - a.goals;
  return a.playerId.localeCompare(b.playerId);
}

function sortGoalkeepers(a: PlayerStatsRow, b: PlayerStatsRow): number {
  if (b.saves !== a.saves) return b.saves - a.saves;
  if (b.points !== a.points) return b.points - a.points;
  if (b.goals !== a.goals) return b.goals - a.goals;
  return a.playerId.localeCompare(b.playerId);
}

export function computePlayerStandings(
  tournament: Tournament,
  poolId?: string,
): PlayerStatsRow[] {
  const teamIds = new Set<string>();
  for (const t of tournament.teams) {
    if (!poolId || t.poolId === poolId || !t.poolId) teamIds.add(t.id);
  }

  const map = new Map<string, PlayerStatsRow>();

  for (const match of tournament.matches) {
    if (poolId && match.poolId && match.poolId !== poolId) continue;
    if (poolId && !teamIds.has(match.teamAId) && !teamIds.has(match.teamBId)) continue;
    aggregateMatch(map, match);
  }

  return [...map.values()].filter(hasActivity).sort(sortPlayers);
}

export function computeGoalkeeperStandings(
  tournament: Tournament,
  poolId?: string,
): PlayerStatsRow[] {
  const gkIds = new Set<string>();
  for (const t of tournament.teams) {
    if (poolId && t.poolId && t.poolId !== poolId) continue;
    for (const p of t.players ?? []) {
      if (p.isGoalkeeper || p.isSpecialist) {
        gkIds.add(`${t.id}:${p.id}`);
      }
    }
  }

  return computePlayerStandings(tournament, poolId)
    .filter((row) => gkIds.has(`${row.teamId}:${row.playerId}`) || row.saves > 0)
    .sort(sortGoalkeepers);
}

export function findPlayer(
  tournament: Tournament,
  teamId: string,
  playerId: string,
) {
  return tournament.teams.find((t) => t.id === teamId)?.players?.find((p) => p.id === playerId);
}

export function playerStatsLabel(
  tournament: Tournament,
  row: PlayerStatsRow,
): string {
  const player = findPlayer(tournament, row.teamId, row.playerId);
  if (!player) return "?";
  return `#${player.number} ${playerDisplayName(player)}`;
}

export function playerTeamName(tournament: Tournament, teamId: string): string {
  return tournament.teams.find((t) => t.id === teamId)?.name ?? "?";
}
