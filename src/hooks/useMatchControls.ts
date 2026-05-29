import { useCallback } from "react";
import {
  useMatchById,
  useTournamentContext,
} from "../context/TournamentContext";
import { useWorkspaceMatchId } from "../context/WorkspaceContext";
import {
  canStartShootout,
  computeRemainingSeconds,
  createShootout,
  getTeam,
  applyTeamTimeout,
  canRequestTimeout,
} from "../utils";
import {
  applyScoreChange,
  advanceToNextPeriodWithRules,
  canFinishMatch,
  endPeriodWithRules,
  finishMatchWithRules,
} from "../matchRules";
import type { Match } from "../types";

type Options = {
  /** Force un match (prioritaire sur l'URL workspace). */
  matchId?: string | null;
};

export function useMatchControls(options: Options = {}) {
  const { tournament, setTournament } = useTournamentContext();
  const workspaceMatchId = useWorkspaceMatchId();
  const effectiveMatchId =
    options.matchId ?? workspaceMatchId ?? tournament?.activeMatchId ?? null;

  const match = useMatchById(tournament, effectiveMatchId);

  const patchMatch = useCallback(
    (updater: (m: Match) => Match) => {
      if (!effectiveMatchId) return;
      setTournament((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          matches: prev.matches.map((m) =>
            m.id === effectiveMatchId ? updater(m) : m,
          ),
        };
      });
    },
    [setTournament, effectiveMatchId],
  );

  const handleScore = useCallback(
    (team: "A" | "B", delta: number) => {
      patchMatch((m) => applyScoreChange(m, team, delta));
    },
    [patchMatch],
  );

  const handleTimerStart = useCallback(() => {
    patchMatch((m) => ({
      ...m,
      status:
        m.status === "ready" ? "running" : m.status === "paused" ? "running" : m.status,
      timer: {
        running: true,
        startedAt: Date.now(),
        remainingAtStart: computeRemainingSeconds(m),
      },
    }));
  }, [patchMatch]);

  const handleTimerPause = useCallback(() => {
    patchMatch((m) => ({
      ...m,
      status: "paused",
      remainingSeconds: computeRemainingSeconds(m),
      timer: { running: false },
    }));
  }, [patchMatch]);

  const handleTimerToggle = useCallback(() => {
    patchMatch((m) => {
      if (m.timer.running) {
        return {
          ...m,
          status: "paused",
          remainingSeconds: computeRemainingSeconds(m),
          timer: { running: false },
        };
      }
      return {
        ...m,
        status: m.status === "ready" ? "running" : m.status === "paused" ? "running" : m.status,
        timer: {
          running: true,
          startedAt: Date.now(),
          remainingAtStart: computeRemainingSeconds(m),
        },
      };
    });
  }, [patchMatch]);

  const handleTimeout = useCallback(
    (teamId: string) => {
      patchMatch((m) => applyTeamTimeout(m, teamId) ?? m);
    },
    [patchMatch],
  );

  const endPeriod = useCallback(() => {
    patchMatch((m) => endPeriodWithRules(m));
  }, [patchMatch]);

  const nextPeriod = useCallback(() => {
    patchMatch((m) => advanceToNextPeriodWithRules(m));
  }, [patchMatch]);

  const setPeriodWinner = useCallback(
    (period: 1 | 2, teamId: string) => {
      const key = period === 1 ? "period1" : "period2";
      patchMatch((m) => ({
        ...m,
        periodWinners: { ...m.periodWinners, [key]: teamId },
      }));
    },
    [patchMatch],
  );

  const finishMatch = useCallback(() => {
    patchMatch((m) => {
      if (!canFinishMatch(m)) return m;
      return finishMatchWithRules(m);
    });
  }, [patchMatch]);

  const startShootout = useCallback(() => {
    patchMatch((m) => ({
      ...m,
      mode: "shootout",
      status: "running",
      timer: { running: false },
      shootout: createShootout(m.teamAId, m.teamBId),
    }));
  }, [patchMatch]);

  const teamA = match && tournament ? getTeam(tournament, match.teamAId) : undefined;
  const teamB = match && tournament ? getTeam(tournament, match.teamBId) : undefined;

  return {
    tournament,
    match,
    matchId: effectiveMatchId,
    patchMatch,
    setTournament,
    teamA,
    teamB,
    handleScore,
    handleTimerStart,
    handleTimerPause,
    handleTimerToggle,
    handleTimeout,
    endPeriod,
    nextPeriod,
    setPeriodWinner,
    finishMatch,
    startShootout,
    canStartShootout: match ? canStartShootout(match) : false,
    canTimeoutA: match ? canRequestTimeout(match, match.teamAId) && !match.timeout : false,
    canTimeoutB: match ? canRequestTimeout(match, match.teamBId) && !match.timeout : false,
  };
}
