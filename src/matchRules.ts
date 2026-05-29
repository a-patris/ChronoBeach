import type { GoalType, Match } from "./types";
import { recordGoalEvent, removeLastGoalEvent, clearAllExclusions } from "./matchSheet";
import {
  archiveCurrentPeriodScores,
  computeRemainingSeconds,
} from "./utils";

/** Vainqueur de période déduit du score courant (hors golden goal). */
export function inferPeriodWinnerFromScore(match: Match): string | undefined {
  if (match.scoreA > match.scoreB) return match.teamAId;
  if (match.scoreB > match.scoreA) return match.teamBId;
  return undefined;
}

/** Active le golden goal si la période se termine à égalité. */
export function activateGoldenGoal(match: Match): Match {
  if (match.scoreA !== match.scoreB) return match;
  return {
    ...match,
    goldenGoalActive: true,
    status: "paused",
    timer: { running: false },
    remainingSeconds: computeRemainingSeconds(match),
  };
}

/** But en golden goal : archive la période et attribue le set. */
export function resolveGoldenGoal(match: Match, scoringTeamId: string): Match {
  const key = match.period === 1 ? "period1" : "period2";
  const archived = archiveCurrentPeriodScores(match);
  return {
    ...archived,
    goldenGoalActive: false,
    status: "paused",
    timer: { running: false },
    periodWinners: {
      ...archived.periodWinners,
      [key]: scoringTeamId,
    },
  };
}

/** Fin de période avec règles beach handball. */
export function endPeriodWithRules(match: Match): Match {
  const paused = {
    ...match,
    status: "paused" as const,
    timer: { running: false },
    remainingSeconds: computeRemainingSeconds(match),
  };

  if (match.scoreA === match.scoreB) {
    return activateGoldenGoal(paused);
  }

  const winner = inferPeriodWinnerFromScore(match);
  const key = match.period === 1 ? "period1" : "period2";
  return {
    ...paused,
    periodWinners: winner
      ? { ...paused.periodWinners, [key]: winner }
      : paused.periodWinners,
  };
}

/** Période suivante : archive le set et remet le score à 0. */
export function advanceToNextPeriodWithRules(match: Match): Match {
  if (match.period >= 2) return match;

  let working = match;
  const key = match.period === 1 ? "period1" : "period2";

  if (!working.periodWinners[key]) {
    const winner = inferPeriodWinnerFromScore(working);
    if (winner) {
      working = {
        ...working,
        periodWinners: { ...working.periodWinners, [key]: winner },
      };
    } else if (working.scoreA === working.scoreB && !working.goldenGoalActive) {
      working = activateGoldenGoal(working);
      return working;
    }
  }

  const archived = archiveCurrentPeriodScores(working);
  return clearAllExclusions({
    ...archived,
    period: 2,
    scoreA: 0,
    scoreB: 0,
    goldenGoalActive: false,
    remainingSeconds: match.durationSeconds,
    timer: { running: false },
    status: "ready",
  });
}

/**
 * Vainqueur du match selon les sets (2-0, shoot-out 2-1).
 * Retourne undefined si 1-1 sans shoot-out terminé.
 */
export function resolveMatchWinner(match: Match): string | undefined {
  if (match.shootout?.winnerTeamId) return match.shootout.winnerTeamId;
  if (match.winnerTeamId) return match.winnerTeamId;

  const { period1, period2 } = match.periodWinners;
  if (period1 && period2) {
    if (period1 === period2) return period1;
    return undefined;
  }

  return inferPeriodWinnerFromScore(match);
}

export function canFinishMatch(match: Match): boolean {
  const { period1, period2 } = match.periodWinners;
  if (period1 && period2) {
    if (period1 === period2) return true;
    return !!match.shootout?.winnerTeamId;
  }
  return !!inferPeriodWinnerFromScore(match);
}

export function finishMatchWithRules(match: Match): Match {
  const key = match.period === 1 ? "period1" : "period2";
  let u = match.periodScores[key] ? match : archiveCurrentPeriodScores(match);

  if (!u.periodWinners[key]) {
    const winner = inferPeriodWinnerFromScore(u);
    if (winner) {
      u = {
        ...u,
        periodWinners: { ...u.periodWinners, [key]: winner },
      };
    }
  }

  const winner = resolveMatchWinner(u);
  if (!winner) return u;

  return {
    ...u,
    status: "finished",
    timer: { running: false },
    timeout: undefined,
    goldenGoalActive: false,
    winnerTeamId: winner,
  };
}

export function applyScoreChange(
  match: Match,
  team: "A" | "B",
  delta: number,
  opts?: { goalType?: GoalType; playerId?: string },
): Match {
  const teamId = team === "A" ? match.teamAId : match.teamBId;
  let next: Match = { ...match };

  if (team === "A") next.scoreA = Math.max(0, match.scoreA + delta);
  else next.scoreB = Math.max(0, match.scoreB + delta);

  if (delta > 0) {
    next = recordGoalEvent(
      next,
      teamId,
      (delta >= 2 ? 2 : 1) as 1 | 2,
      opts?.goalType,
      opts?.playerId,
    );
    if (next.goldenGoalActive) {
      next = resolveGoldenGoal(next, teamId);
    }
  } else if (delta < 0) {
    next = removeLastGoalEvent(next, teamId);
  }

  return next;
}
