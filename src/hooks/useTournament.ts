import { useCallback, useEffect, useState } from "react";
import { getTournamentRepository } from "../data/tournamentRepository";
import { loadTournament, saveTournament } from "../storage";
import { tournamentSync } from "../sync";
import { stampTournamentLiveFlag } from "../auth/billing";
import { getBillingContext } from "../auth/billingContext";
import type { Match, Tournament } from "../types";
import { mergeMatchTimerFields, syncTimerRemaining, syncTimeoutRemaining } from "../utils";

const TIMER_BOUNDARY_MS = 1000;

/** Ne persiste que les fins de chrono / TM — pas chaque seconde écoulée. */
function syncActiveMatchTimers(match: Match, now = Date.now()): Match | null {
  if (match.timer.running) {
    const next = syncTimerRemaining(match, now);
    if (
      !next.timer.running ||
      next.status !== match.status ||
      next.goldenGoalActive !== match.goldenGoalActive
    ) {
      return next;
    }
  }

  if (match.timeout?.timer.running) {
    const next = syncTimeoutRemaining(match, now);
    if (!next.timeout) {
      return next;
    }
  }

  return null;
}

function syncAllMatchTimers(tournament: Tournament, now = Date.now()): Tournament | null {
  let changed = false;
  const matches = tournament.matches.map((m) => {
    const patched = syncActiveMatchTimers(m, now);
    if (!patched) return m;
    changed = true;
    return mergeMatchTimerFields(m, patched);
  });
  if (!changed) return null;
  return { ...tournament, matches };
}

function tournamentHasActiveClock(tournament: Tournament): boolean {
  return tournament.matches.some((m) => m.timer.running || m.timeout?.timer.running);
}

function stampForSave(tournament: Tournament): Tournament {
  const { billingStatus, role } = getBillingContext();
  return stampTournamentLiveFlag(tournament, billingStatus, role);
}

export function useTournament() {
  const [tournament, setTournamentState] = useState<Tournament | null>(() =>
    loadTournament(),
  );
  const repo = getTournamentRepository();

  const persist = useCallback(
    (next: Tournament | null) => {
      setTournamentState(next);
      if (next) void repo.save(stampForSave(next));
      else {
        const prev = loadTournament();
        if (prev) void repo.clear(prev.id);
      }
    },
    [repo],
  );

  const setTournament = useCallback(
    (updater: Tournament | null | ((prev: Tournament | null) => Tournament | null)) => {
      setTournamentState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next) void repo.save(stampForSave(next));
        else if (prev) void repo.clear(prev.id);
        return next;
      });
    },
    [repo],
  );

  const updateActiveMatch = useCallback(
    (updater: (match: Match) => Match) => {
      setTournament((prev) => {
        if (!prev?.activeMatchId) return prev;
        return {
          ...prev,
          matches: prev.matches.map((m) =>
            m.id === prev.activeMatchId ? updater(m) : m,
          ),
        };
      });
    },
    [setTournament],
  );

  useEffect(() => {
    return tournamentSync.subscribe(() => {
      setTournamentState(loadTournament());
    });
  }, []);

  /** Détecte fin de période / TM et persiste une seule fois (plus ~4 writes/s). */
  useEffect(() => {
    const tick = () => {
      const current = loadTournament();
      if (!current || !tournamentHasActiveClock(current)) return;

      const timerPatched = syncAllMatchTimers(current);
      if (!timerPatched) return;

      saveTournament(stampForSave(timerPatched));
      tournamentSync.broadcast();
      setTournamentState(timerPatched);
      void repo.save(stampForSave(timerPatched));
    };

    const id = window.setInterval(tick, TIMER_BOUNDARY_MS);
    return () => clearInterval(id);
  }, [repo]);

  return {
    tournament,
    setTournament,
    persist,
    updateActiveMatch,
    syncFromRemote: setTournamentState,
  };
}
