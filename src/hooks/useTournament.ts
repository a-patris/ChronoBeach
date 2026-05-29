import { useCallback, useEffect, useRef, useState } from "react";
import { getTournamentRepository } from "../data/tournamentRepository";
import { loadTournament } from "../storage";
import { tournamentSync } from "../sync";
import type { Match, Tournament } from "../types";
import {
  computeRemainingSeconds,
  computeTimeoutRemaining,
  mergeMatchTimerFields,
  syncTimerRemaining,
  syncTimeoutRemaining,
} from "../utils";

function syncActiveMatchTimers(match: Match, now = Date.now()): Match | null {
  let updated = match;
  let changed = false;

  if (match.timer.running) {
    const remaining = computeRemainingSeconds(match, now);
    const next = syncTimerRemaining(match, now);
    if (
      next.remainingSeconds !== match.remainingSeconds ||
      next.timer.running !== match.timer.running
    ) {
      updated = next;
      changed = true;
    } else if (remaining !== match.remainingSeconds && remaining > 0) {
      changed = true;
    }
  }

  if (updated.timeout?.timer.running) {
    const next = syncTimeoutRemaining(updated, now);
    if (
      next.timeout?.remainingSeconds !== updated.timeout?.remainingSeconds ||
      next.timeout !== updated.timeout
    ) {
      updated = next;
      changed = true;
    } else {
      const remaining = computeTimeoutRemaining(updated.timeout, now);
      if (remaining !== updated.timeout.remainingSeconds) changed = true;
    }
  }

  return changed ? updated : null;
}

function syncAllMatchTimers(tournament: Tournament, now = Date.now()): Tournament | null {
  let changed = false;
  const matches = tournament.matches.map((m) => {
    const latest = tournament.matches.find((x) => x.id === m.id) ?? m;
    const patched = syncActiveMatchTimers(latest, now);
    if (!patched) return latest;
    changed = true;
    return mergeMatchTimerFields(latest, patched);
  });
  if (!changed) return null;
  return { ...tournament, matches };
}

export function useTournament() {
  const [tournament, setTournamentState] = useState<Tournament | null>(() =>
    loadTournament(),
  );
  const tickRef = useRef<number | null>(null);
  const repo = getTournamentRepository();

  const persist = useCallback(
    (next: Tournament | null) => {
      setTournamentState(next);
      if (next) void repo.save(next);
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
        if (next) void repo.save(next);
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

  /** Chrono : tous les matchs en cours (multi-terrains / tablettes). */
  useEffect(() => {
    const tick = () => {
      const current = loadTournament();
      if (!current) return;

      const timerPatched = syncAllMatchTimers(current);
      if (!timerPatched) return;

      void repo.save(timerPatched);
      setTournamentState(timerPatched);
    };

    tickRef.current = window.setInterval(tick, 250);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [repo, tournament?.id]);

  return {
    tournament,
    setTournament,
    persist,
    updateActiveMatch,
    syncFromRemote: setTournamentState,
  };
}
