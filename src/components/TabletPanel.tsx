import { useCallback, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { FullscreenToggle } from "./FullscreenToggle";
import { useFullscreen } from "../hooks/useFullscreen";
import {
  openPublicDisplayForMatch,
  requestDisplayFullscreen,
} from "../utils/displayWindow";
import { useMatchControls } from "../hooks/useMatchControls";
import { isScoringReady } from "../matchSheet";
import { tournamentPath } from "../routes/paths";
import { MatchSheetSetup } from "./MatchSheetSetup";
import { ScorekeeperView } from "./ScorekeeperView";
import type { Match } from "../types";

function TabletShell({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const { active, enter, exit } = useFullscreen(viewportRef);

  useEffect(() => {
    document.documentElement.classList.add("tablet-route");
    if (new URLSearchParams(window.location.search).get("fs") === "1") {
      void enter().catch(() => {});
    }
    return () => document.documentElement.classList.remove("tablet-route");
  }, [enter]);

  return (
    <div
      ref={viewportRef}
      className={`tablet-viewport${active ? " tablet-viewport--fullscreen" : ""}`}
    >
      <FullscreenToggle active={active} onEnter={enter} onExit={exit} />
      <main className="tablet-page tablet-page--scorekeeper">{children}</main>
    </div>
  );
}

export function TabletPanel() {
  const { tournamentId } = useParams<{ tournamentId: string; matchId: string }>();
  const {
    tournament,
    match,
    matchId,
    patchMatch,
    setTournament,
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

  if (!tournament || !tournamentId) {
    return null;
  }

  if (!match || !matchId) {
    return (
      <TabletShell>
        <div className="tablet-empty">
          <p>Match introuvable</p>
          <Link to={tournamentPath(tournamentId, "tablet")} className="tablet-link">
            ← Choisir un match
          </Link>
        </div>
      </TabletShell>
    );
  }

  if (!teamA || !teamB) {
    return (
      <TabletShell>
        <div className="tablet-empty">
          <p>Équipes introuvables</p>
        </div>
      </TabletShell>
    );
  }

  const header = (
    <header className="tablet-header tablet-header--compact">
      <Link to={tournamentPath(tournamentId, "tablet")} className="tablet-link">
        ← Matchs
      </Link>
      <span className="tablet-tournament">{tournament.name}</span>
      {match.courtLabel && (
        <span className="tablet-match-label">{match.courtLabel}</span>
      )}
      {match.label && <span className="tablet-match-label">{match.label}</span>}
      <button
        type="button"
        className="tablet-link tablet-link--btn"
        disabled={!canGoLive}
        onClick={() => {
          if (!canGoLive) return notifyBlocked();
          openPublicDisplayForMatch(tournamentId, matchId);
        }}
      >
        Écran ↗
      </button>
      <button
        type="button"
        className="tablet-link tablet-link--btn"
        disabled={!canGoLive}
        onClick={() => {
          if (!canGoLive) return notifyBlocked();
          requestDisplayFullscreen(matchId);
        }}
      >
        FS écran
      </button>
    </header>
  );

  return (
    <TabletShell>
      {!isScoringReady(match) ? (
        <>
          {header}
          <MatchSheetSetup
            tournament={tournament}
            match={match}
            teamA={teamA}
            teamB={teamB}
            variant="tablet"
            onPatchMatch={patchMatch}
            onPatchTournament={(updater) =>
              setTournament((prev) => (prev ? updater(prev) : prev))
            }
          />
        </>
      ) : (
        <ScorekeeperView
          tournament={tournament}
          match={match}
          teamA={teamA}
          teamB={teamB}
          variant="tablet"
          onPatchMatch={guardLivePatch}
          onTimerToggle={handleTimerToggle}
          onTimeout={handleTimeout}
          onEndPeriod={endPeriod}
          onNextPeriod={nextPeriod}
          onFinishMatch={finishMatch}
          onStartShootout={startShootout}
          canStartShootout={canStartShootout}
          canTimeoutA={canTimeoutA}
          canTimeoutB={canTimeoutB}
          liveLocked={!canGoLive}
          extraHeader={header}
        />
      )}
    </TabletShell>
  );
}
