import { createContext, useContext, type ReactNode } from "react";
import { useParams } from "react-router-dom";

type WorkspaceContextValue = {
  tournamentId: string;
  /** Match calé par l'URL (tablette / display) — indépendant de activeMatchId admin. */
  workspaceMatchId: string | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { tournamentId, matchId } = useParams<{
    tournamentId: string;
    matchId?: string;
  }>();

  if (!tournamentId) {
    throw new Error("WorkspaceProvider requiert :tournamentId");
  }

  return (
    <WorkspaceContext.Provider
      value={{ tournamentId, workspaceMatchId: matchId ?? null }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}

export function useWorkspaceMatchId(): string | null {
  return useWorkspace()?.workspaceMatchId ?? null;
}

export function useTournamentId(): string | null {
  return useWorkspace()?.tournamentId ?? null;
}
