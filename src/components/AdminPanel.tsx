import { useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTournamentContext } from "../context/TournamentContext";
import { useMatchControls } from "../hooks/useMatchControls";
import { isScoringReady } from "../matchSheet";
import { createMatch } from "../utils";
import {
  openPublicDisplayForMatch,
  requestDisplayFullscreen,
} from "../utils/displayWindow";
import { autoRecallTeams } from "../teamRecall";
import { tournamentPath } from "../routes/paths";
import { MatchSelector } from "./MatchSelector";
import { MatchSheetSetup } from "./MatchSheetSetup";
import { ScorekeeperView } from "./ScorekeeperView";
import type { Match } from "../types";

export function AdminPanel() {
  const { tournament, setTournament } = useTournamentContext();
  const {
    match,
    patchMatch,
    teamA,
    teamB,
    handleTimerToggle,
    handleTimeout,
    endPeriod,
    nextPeriod,
    finishMatch,
    startShootout,
    canStartShootout,
    canTimeoutA,
    canTimeoutB,
    canGoLive,
    notifyBlocked,
  } = useMatchControls();

  const guardLivePatch = useCallback(
    (updater: (m: Match) => Match) => {
      if (!canGoLive) {
        notifyBlocked();
        return;
      }
      patchMatch(updater);
    },
    [canGoLive, notifyBlocked, patchMatch],
  );

  if (!tournament) {
    return <Navigate to="/setup" replace />;
  }

  const tid = tournament.id;

  return (
    <main className="page admin-page admin-page--scorekeeper">
      <header className="admin-header">
        <div>
          <h1>{tournament.name}</h1>
          <p className="subtitle">Organisation &amp; table de marque (PC)</p>
        </div>
        <div className="header-actions">
          <Link
            to={tournamentPath(tid, "tablet")}
            className={`btn btn-accent${!canGoLive ? " btn--disabled-hint" : ""}`}
            onClick={(e) => {
              if (!canGoLive) {
                e.preventDefault();
                notifyBlocked();
              }
            }}
          >
            Mode tablette
          </Link>
          <Link to={tournamentPath(tid, "classement")} className="btn btn-outline">
            Classement
          </Link>
          {match && (
            <>
              <button
                type="button"
                className="btn btn-outline"
                disabled={!canGoLive}
                onClick={() => {
                  if (!canGoLive) return notifyBlocked();
                  openPublicDisplayForMatch(tid, match.id);
                }}
              >
                Écran match actif ↗
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={!canGoLive}
                onClick={() => {
                  if (!canGoLive) return notifyBlocked();
                  if (!requestDisplayFullscreen(match.id)) {
                    window.alert(
                      "Ouvrez d'abord l'écran de ce match (bouton ci-dessus), puis recliquez.",
                    );
                  }
                }}
                title="Bandeau plein écran sur l'onglet display de CE match"
              >
                FS écran actif
              </button>
            </>
          )}
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <MatchSelector
            tournament={tournament}
            onSetActive={(id) =>
              setTournament((prev) => (prev ? { ...prev, activeMatchId: id } : prev))
            }
            onOpenDisplay={(matchId) => openPublicDisplayForMatch(tid, matchId)}
            onCreateMatch={({
              teamAId,
              teamBId,
              poolId,
              label,
              courtLabel,
              scheduledTime,
              sortOrder,
            }) => {
              const m = createMatch(teamAId, teamBId, 600, {
                poolId,
                label,
                courtLabel,
                scheduledTime,
                sortOrder,
              });
              const withRecall = autoRecallTeams(tournament, m);
              setTournament((prev) =>
                prev
                  ? {
                      ...prev,
                      matches: [...prev.matches, withRecall],
                      activeMatchId: withRecall.id,
                    }
                  : prev,
              );
            }}
            onDeleteMatch={(id) => {
              setTournament((prev) => {
                if (!prev) return prev;
                const matches = prev.matches.filter((m) => m.id !== id);
                return {
                  ...prev,
                  matches,
                  activeMatchId:
                    prev.activeMatchId === id ? matches[0]?.id : prev.activeMatchId,
                };
              });
            }}
          />
        </aside>

        <div className="admin-main admin-main--full">
          {!match ? (
            <p className="hint panel">Sélectionnez ou créez un match actif.</p>
          ) : !teamA || !teamB ? (
            <p className="hint panel">Équipes introuvables.</p>
          ) : !isScoringReady(match) ? (
            <MatchSheetSetup
              tournament={tournament}
              match={match}
              teamA={teamA}
              teamB={teamB}
              onPatchMatch={patchMatch}
              onPatchTournament={(updater) =>
                setTournament((prev) => (prev ? updater(prev) : prev))
              }
            />
          ) : (
            <ScorekeeperView
              tournament={tournament}
              match={match}
              teamA={teamA}
              teamB={teamB}
              variant="admin"
              onPatchMatch={guardLivePatch}
              onTimerToggle={handleTimerToggle}
              onTimeout={handleTimeout}
              onEndPeriod={endPeriod}
              onNextPeriod={nextPeriod}
              onFinishMatch={finishMatch}
              onStartShootout={startShootout}
              onExitShootout={() =>
                patchMatch((m) => ({ ...m, mode: "match", shootout: undefined }))
              }
              canStartShootout={canStartShootout}
              canTimeoutA={canTimeoutA}
              canTimeoutB={canTimeoutB}
              liveLocked={!canGoLive}
            />
          )}
        </div>
      </div>
    </main>
  );
}
