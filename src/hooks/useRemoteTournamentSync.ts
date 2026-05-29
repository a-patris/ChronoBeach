import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTournamentContext } from "../context/TournamentContext";
import { getTournamentRepository } from "../data/tournamentRepository";
import { isFirebaseReady } from "../config/firebaseApp";

/** Écoute Firestore pour /t/:tournamentId (tablette, display, admin en ligne). */
export function useRemoteTournamentSync() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { syncFromRemote } = useTournamentContext();

  useEffect(() => {
    if (!tournamentId || !isFirebaseReady()) return;

    const repo = getTournamentRepository();
    void repo.load(tournamentId).then((remote) => {
      if (remote) syncFromRemote(remote);
    });
    return repo.subscribe(tournamentId, (remote) => {
      if (remote) syncFromRemote(remote);
    });
  }, [tournamentId, syncFromRemote]);
}
