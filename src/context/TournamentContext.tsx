import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useTournament } from "../hooks/useTournament";
import type { Match, Tournament } from "../types";

type TournamentContextValue = ReturnType<typeof useTournament>;

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const value = useTournament();
  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournamentContext() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournamentContext hors provider");
  return ctx;
}

export function useActiveMatch(tournament: Tournament | null): Match | undefined {
  if (!tournament?.activeMatchId) return undefined;
  return tournament.matches.find((m) => m.id === tournament.activeMatchId);
}

export function useMatchById(
  tournament: Tournament | null,
  matchId: string | null | undefined,
): Match | undefined {
  if (!tournament || !matchId) return undefined;
  return tournament.matches.find((m) => m.id === matchId);
}
