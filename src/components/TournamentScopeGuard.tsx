import { Navigate, useParams } from "react-router-dom";
import { loadTournament } from "../storage";
import { isFirebaseConfigured } from "../config/firebase";
import { tournamentPath } from "../routes/paths";
import { useTournamentContext } from "../context/TournamentContext";

type Props = {
  children: React.ReactNode;
};

/** Vérifie que l'URL /t/:tournamentId correspond au tournoi chargé. */
export function TournamentScopeGuard({ children }: Props) {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament } = useTournamentContext();

  if (!tournamentId) {
    return <Navigate to="/setup" replace />;
  }

  if (!tournament) {
    const local = loadTournament();
    if (local?.id === tournamentId || isFirebaseConfigured()) {
      return (
        <div className="page panel">
          <p className="hint">Chargement du tournoi…</p>
        </div>
      );
    }
    return (
      <main className="page panel">
        <h2>Tournoi introuvable</h2>
        <p className="hint">
          Aucune donnée pour <code>{tournamentId}</code> sur cet appareil.
          {isFirebaseConfiguredMessage()}
        </p>
        <a href="/setup" className="btn btn-accent">
          Configuration
        </a>
      </main>
    );
  }

  if (tournament.id !== tournamentId) {
    return <Navigate to={tournamentPath(tournament.id, "admin")} replace />;
  }

  return <>{children}</>;
}

function isFirebaseConfiguredMessage(): string {
  return isFirebaseConfigured()
    ? " Vérifiez que le tournoi a bien été synchronisé depuis Firebase."
    : " Créez ou ouvrez le tournoi depuis la configuration.";
}
