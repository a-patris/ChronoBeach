import { useCallback, useEffect, useRef, useState } from "react";
import { clearTournament, loadTournament, saveTournament } from "../storage";
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

export function useTournament() {
  const [tournament, setTournamentState] = useState<Tournament | null>(() =>
    loadTournament(),
  );
  const tickRef = useRef<number | null>(null);

  const persist = useCallback((next: Tournament | null) => {
    setTournamentState(next);
    if (next) saveTournament(next);
    tournamentSync.broadcast();
  }, []);

  const setTournament = useCallback(
    (updater: Tournament | null | ((prev: Tournament | null) => Tournament | null)) => {
      setTournamentState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next) saveTournament(next);
        else clearTournament();
        tournamentSync.broadcast();
        return next;
      });
    },
    [],
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

  useEffect(() => {
    const tick = () => {
      const current = loadTournament();
      if (!current?.activeMatchId) return;

      const match = current.matches.find((m) => m.id === current.activeMatchId);
      if (!match) return;

      const timerPatched = syncActiveMatchTimers(match);
      if (!timerPatched) return;

      // Relecture avant écriture : ne pas écraser score / shoot-out mis à jour entre-temps
      const latest = loadTournament();
      if (!latest?.activeMatchId) return;
      const latestMatch = latest.matches.find((m) => m.id === latest.activeMatchId);
      if (!latestMatch) return;

      const merged = mergeMatchTimerFields(latestMatch, timerPatched);
      if (
        merged.remainingSeconds === latestMatch.remainingSeconds &&
        merged.timer.running === latestMatch.timer.running &&
        merged.timeout === latestMatch.timeout &&
        merged.status === latestMatch.status
      ) {
        return;
      }

      const next: Tournament = {
        ...latest,
        matches: latest.matches.map((m) => (m.id === merged.id ? merged : m)),
      };
      saveTournament(next);
      setTournamentState(next);
      tournamentSync.broadcast();
    };

    tickRef.current = window.setInterval(tick, 250);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [tournament?.activeMatchId]);

  return {
    tournament,
    setTournament,
    persist,
    updateActiveMatch,
  };
}
