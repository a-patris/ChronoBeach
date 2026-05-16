import type { Match, Tournament } from "./types";
import { createMatch } from "./utils";

type Fixture = {
  poolIndex: number;
  teamAIndex: number;
  teamBIndex: number;
  scheduledTime: string;
  sortOrder: number;
};

/** Programme poules — format V'Hand (2 poules × 3 équipes). */
const VHANDB_POOL_FIXTURES: Fixture[] = [
  { poolIndex: 0, teamAIndex: 0, teamBIndex: 1, scheduledTime: "09H30", sortOrder: 1 },
  { poolIndex: 1, teamAIndex: 0, teamBIndex: 1, scheduledTime: "10H10", sortOrder: 2 },
  { poolIndex: 0, teamAIndex: 2, teamBIndex: 0, scheduledTime: "10H50", sortOrder: 3 },
  { poolIndex: 1, teamAIndex: 0, teamBIndex: 2, scheduledTime: "11H30", sortOrder: 4 },
  { poolIndex: 0, teamAIndex: 2, teamBIndex: 1, scheduledTime: "12H10", sortOrder: 5 },
  { poolIndex: 1, teamAIndex: 1, teamBIndex: 2, scheduledTime: "12H50", sortOrder: 6 },
];

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

function existingPairs(tournament: Tournament): Set<string> {
  return new Set(
    tournament.matches.map((m) => pairKey(m.teamAId, m.teamBId)),
  );
}

function teamsInPool(tournament: Tournament, poolId: string) {
  return tournament.teams.filter((t) => t.poolId === poolId);
}

function canUseVhandTemplate(tournament: Tournament): boolean {
  if (tournament.pools.length !== 2) return false;
  return tournament.pools.every((p) => teamsInPool(tournament, p.id).length === 3);
}

/** Génère les matchs aller-retour manquants dans chaque poule (round robin). */
export function generatePoolSchedule(
  tournament: Tournament,
  durationSeconds = 600,
): Match[] {
  const pairs = existingPairs(tournament);
  const created: Match[] = [];

  if (canUseVhandTemplate(tournament)) {
    for (const fx of VHANDB_POOL_FIXTURES) {
      const pool = tournament.pools[fx.poolIndex];
      if (!pool) continue;
      const teams = teamsInPool(tournament, pool.id);
      const teamA = teams[fx.teamAIndex];
      const teamB = teams[fx.teamBIndex];
      if (!teamA || !teamB) continue;

      const key = pairKey(teamA.id, teamB.id);
      if (pairs.has(key)) continue;

      const match = createMatch(teamA.id, teamB.id, durationSeconds, {
        poolId: pool.id,
        label: pool.name,
        scheduledTime: fx.scheduledTime,
        sortOrder: fx.sortOrder,
      });
      pairs.add(key);
      created.push(match);
    }
    return created;
  }

  let order = tournament.matches.reduce((max, m) => Math.max(max, m.sortOrder ?? 0), 0);

  for (const pool of tournament.pools) {
    const teams = teamsInPool(tournament, pool.id);
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const key = pairKey(teams[i].id, teams[j].id);
        if (pairs.has(key)) continue;
        order += 1;
        const match = createMatch(teams[i].id, teams[j].id, durationSeconds, {
          poolId: pool.id,
          label: pool.name,
          sortOrder: order,
        });
        pairs.add(key);
        created.push(match);
      }
    }
  }

  if (tournament.pools.length === 0 && tournament.teams.length >= 2) {
    const teams = tournament.teams;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const key = pairKey(teams[i].id, teams[j].id);
        if (pairs.has(key)) continue;
        order += 1;
        created.push(
          createMatch(teams[i].id, teams[j].id, durationSeconds, { sortOrder: order }),
        );
        pairs.add(key);
      }
    }
  }

  return created;
}

export const MATCH_LABEL_PRESETS = [
  "",
  "Poule",
  "Phase haute",
  "Phase basse",
  "3e place",
  "Demi-finale",
  "Finale",
  "Grande finale",
] as const;
