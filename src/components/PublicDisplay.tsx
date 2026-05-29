import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useTournamentContext } from "../context/TournamentContext";
import { subscribeDisplayCommands } from "../displaySync";
import { tournamentLiveEnabled } from "../auth/billing";
import { FullscreenToggle } from "./FullscreenToggle";
import { useFullscreen } from "../hooks/useFullscreen";
import { useDisplayEventQueue } from "../hooks/useDisplayEventQueue";
import { useClockTick } from "../hooks/useClockTick";
import { getRegularShotProgress, REGULAR_SHOTS_PER_TEAM, shootoutScore } from "../shootout";
import { DisplayEventOverlay } from "./DisplayEventOverlay";
import { LiveLaunchGate } from "./LiveLaunchGate";
import { DisplayTimeoutStatus } from "./DisplayTimeoutStatus";
import { TimeoutBanner } from "./TimeoutBanner";
import { GoldenGoalBanner } from "./GoldenGoalBanner";
import { TeamLogo } from "./TeamLogo";
import {
  computeRemainingSeconds,
  formatTime,
  getTeam,
  matchStatusLabel,
  shotResultIcon,
} from "../utils";
import type { Match, Team, Tournament } from "../types";

function DisplayMatchTeam({
  team,
  score,
}: {
  team: Team | undefined;
  score: number;
}) {
  return (
    <div className="display-team">
      <TeamLogo team={team} size="display" className="display-team-logo" />
      <h2 className="team-name">{team?.name ?? "Équipe"}</h2>
      <p className="display-score">{score}</p>
    </div>
  );
}

function DisplayShell({
  children,
  className = "",
  matchId,
}: {
  children: ReactNode;
  className?: string;
  matchId?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const { active, enter, exit } = useFullscreen(viewportRef);
  const [fsPrompt, setFsPrompt] = useState(false);
  const [fsPromptRemote, setFsPromptRemote] = useState(false);

  const clearFsQuery = () => {
    if (!window.location.search.includes("fs=1")) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("fs");
    window.history.replaceState({}, "", url);
  };

  const dismissFsPrompt = () => {
    setFsPrompt(false);
    setFsPromptRemote(false);
    clearFsQuery();
  };

  useEffect(() => {
    document.documentElement.classList.add("display-route");
    if (new URLSearchParams(window.location.search).get("fs") === "1") {
      setFsPrompt(true);
    }
    return () => document.documentElement.classList.remove("display-route");
  }, []);

  useEffect(() => {
    if (!matchId) return;
    return subscribeDisplayCommands(matchId, () => {
      if (!document.fullscreenElement) {
        setFsPromptRemote(true);
        setFsPrompt(true);
      }
    });
  }, [matchId]);

  useEffect(() => {
    if (active) {
      setFsPrompt(false);
      setFsPromptRemote(false);
      clearFsQuery();
    }
  }, [active]);

  const activateFullscreen = () => {
    void enter()
      .then(() => {
        setFsPrompt(false);
        setFsPromptRemote(false);
        clearFsQuery();
      })
      .catch(() => {});
  };

  return (
    <div
      ref={viewportRef}
      className={`display-viewport${active ? " display-viewport--fullscreen" : ""}`}
    >
      {fsPrompt && !active && (
        <div
          className="display-fs-prompt display-fs-prompt--tap"
          role="button"
          tabIndex={0}
          aria-label="Cliquez pour passer en plein écran"
          onClick={activateFullscreen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              activateFullscreen();
            }
          }}
        >
          <div className="display-fs-prompt-card">
            <p className="display-fs-prompt-kicker">
              {fsPromptRemote ? "Depuis la table de marque" : "Écran public"}
            </p>
            <h2 className="display-fs-prompt-title">Cliquez n&apos;importe où</h2>
            <p className="display-fs-prompt-hint">
              pour passer en plein écran
            </p>
          </div>
          <button
            type="button"
            className="display-fs-prompt-dismiss"
            onClick={(e) => {
              e.stopPropagation();
              dismissFsPrompt();
            }}
          >
            Plus tard
          </button>
        </div>
      )}
      <FullscreenToggle
        active={active}
        onEnter={enter}
        onExit={exit}
        className="kiosk-fs-btn kiosk-fs-btn--display"
      />
      <div className={`display ${className}`.trim()}>{children}</div>
    </div>
  );
}

export function PublicDisplay() {
  const { matchId: routeMatchId } = useParams<{ matchId?: string }>();
  const { tournament } = useTournamentContext();

  const displayMatchId = routeMatchId ?? tournament?.activeMatchId ?? undefined;
  const match = displayMatchId
    ? tournament?.matches.find((m) => m.id === displayMatchId)
    : undefined;

  if (!tournament) {
    return (
      <DisplayShell className="display-empty">
        <p>Aucun tournoi configuré</p>
        <p className="hint">Créez un tournoi depuis /setup</p>
      </DisplayShell>
    );
  }

  if (!tournamentLiveEnabled(tournament)) {
    return (
      <LiveLaunchGate
        tournamentName={tournament.name}
        variant="public"
        backTo="/"
        backLabel="Accueil"
      />
    );
  }

  if (!match) {
    return (
      <DisplayShell className="display-empty" matchId={displayMatchId}>
        <h1>{tournament.name}</h1>
        <p>
          {routeMatchId
            ? "Match introuvable ou pas encore synchronisé"
            : "En attente d'un match actif"}
        </p>
      </DisplayShell>
    );
  }

  if (match.mode === "shootout" && match.shootout) {
    return <ShootoutDisplay tournament={tournament} match={match} />;
  }

  return <MatchDisplay tournament={tournament} match={match} />;
}

function MatchDisplay({ tournament, match }: { tournament: Tournament; match: Match }) {
  const teamA = getTeam(tournament, match.teamAId);
  const teamB = getTeam(tournament, match.teamBId);
  const now = useClockTick(1000, match.timer.running || !!match.timeout?.timer.running);
  const remaining = computeRemainingSeconds(match, now);
  const highlight = useDisplayEventQueue(tournament, match);
  const highlightTeam =
    highlight?.teamSide === "A" ? teamA : highlight?.teamSide === "B" ? teamB : undefined;
  const p1 = match.periodWinners.period1
    ? getTeam(tournament, match.periodWinners.period1)?.name
    : null;
  const p2 = match.periodWinners.period2
    ? getTeam(tournament, match.periodWinners.period2)?.name
    : null;
  const isFinished = match.status === "finished";

  return (
    <DisplayShell
      className={`display-match${isFinished ? " display-match--finished" : ""}`}
      matchId={match.id}
    >
      {match.timeout && (
        <TimeoutBanner tournament={tournament} timeout={match.timeout} variant="display" />
      )}
      <GoldenGoalBanner match={match} />

      <header className="display-header">
        <span className="tournament-name">{tournament.name}</span>
        <span className={`display-status status-${match.status}`}>
          {matchStatusLabel(match.status)}
        </span>
      </header>

      <div className="display-match-head">
        {(match.courtLabel || match.label) && (
          <h1 className="display-match-label">
            {[match.courtLabel, match.label].filter(Boolean).join(" · ")}
          </h1>
        )}
        <p className="display-period">
          Période {match.period} / 2
          {match.scheduledTime && (
            <span className="display-match-time"> · {match.scheduledTime}</span>
          )}
        </p>
      </div>

      <div className="display-match-body">
        <div className="display-teams">
          <DisplayMatchTeam team={teamA} score={match.scoreA} />

          {!isFinished && (
            <div className="display-center">
              <section
                className="display-center-panel"
                aria-label="Chronomètre et temps morts"
              >
                <p className="display-timer">{formatTime(remaining)}</p>
                <DisplayTimeoutStatus tournament={tournament} match={match} inline />
              </section>
            </div>
          )}

          <DisplayMatchTeam team={teamB} score={match.scoreB} />
        </div>
      </div>

      <footer className="display-match-footer">
        {(p1 || p2) && (
          <div className="display-period-winners">
            {p1 && (
              <span className="display-period-winners-chip">
                <span className="display-period-winners-label">Période 1</span>
                <span className="display-period-winners-name">{p1}</span>
              </span>
            )}
            {p2 && (
              <span className="display-period-winners-chip">
                <span className="display-period-winners-label">Période 2</span>
                <span className="display-period-winners-name">{p2}</span>
              </span>
            )}
          </div>
        )}

        {match.winnerTeamId && isFinished && (
          <div className="display-winner display-winner--prominent display-winner--match display-winner--with-logo">
            <span className="display-winner-kicker">Vainqueur du match</span>
            <TeamLogo team={getTeam(tournament, match.winnerTeamId)} size="lg" />
            <span className="display-winner-name">
              {getTeam(tournament, match.winnerTeamId)?.name}
            </span>
          </div>
        )}
      </footer>

      <DisplayEventOverlay event={highlight} team={highlightTeam} />
    </DisplayShell>
  );
}

function ShootoutDisplay({ tournament, match }: { tournament: Tournament; match: Match }) {
  const shootout = match.shootout!;
  const teamA = getTeam(tournament, match.teamAId);
  const teamB = getTeam(tournament, match.teamBId);
  const highlight = useDisplayEventQueue(tournament, match);
  const highlightTeam =
    highlight?.teamSide === "A" ? teamA : highlight?.teamSide === "B" ? teamB : undefined;
  const scoreA = shootoutScore(shootout, match.teamAId);
  const scoreB = shootoutScore(shootout, match.teamBId);
  const currentTeam = getTeam(tournament, shootout.currentTeamId);
  const firstTeam = getTeam(tournament, shootout.firstShooterId);
  const isSetup = shootout.phase === "setup";
  const isSuddenDeath =
    shootout.phase === "sudden_death" || shootout.suddenDeath;

  const shotsA = shootout.shots.filter((s) => s.teamId === match.teamAId);
  const shotsB = shootout.shots.filter((s) => s.teamId === match.teamBId);

  return (
    <DisplayShell className="display-shootout" matchId={match.id}>
      <h1 className="shootout-title">SHOOT-OUT</h1>

      {isSetup && (
        <p className="display-sudden">Tirage au sort — choix de l&apos;équipe qui commence</p>
      )}

      {!isSetup && firstTeam && (
        <p className="display-first-shooter">
          Premier tireur : <strong>{firstTeam.name}</strong>
        </p>
      )}

      {isSuddenDeath && <p className="display-sudden">MORT SUBITE</p>}

      {!isSetup && !isSuddenDeath && (
        <p className="display-sudden display-phase-label">
          Série initiale — {getRegularShotProgress(shootout, match.teamAId)}/
          {REGULAR_SHOTS_PER_TEAM} · {getRegularShotProgress(shootout, match.teamBId)}/
          {REGULAR_SHOTS_PER_TEAM} tirs
        </p>
      )}

      <div className="display-shootout-teams">
        <div className="display-team">
          <TeamLogo team={teamA} size="display" className="display-team-logo" />
          <h2>{teamA?.name}</h2>
          <p className="display-score">{scoreA}</p>
          <div className="shot-row">
            {shotsA.map((s) => (
              <span key={s.id} className="shot-icon">
                {shotResultIcon(s.result, s.points ?? 1)}
              </span>
            ))}
          </div>
        </div>
        <div className="display-team">
          <TeamLogo team={teamB} size="display" className="display-team-logo" />
          <h2>{teamB?.name}</h2>
          <p className="display-score">{scoreB}</p>
          <div className="shot-row">
            {shotsB.map((s) => (
              <span key={s.id} className="shot-icon">
                {shotResultIcon(s.result, s.points ?? 1)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!shootout.finished && !isSetup && currentTeam && (
        <p className="display-shootout-turn">
          <TeamLogo team={currentTeam} size="md" />
          <span>
            {isSuddenDeath
              ? `${currentTeam.name} — Manche ${shootout.currentRound}`
              : `${currentTeam.name} — Tir ${shootout.shots.length + 1}/10`}
          </span>
        </p>
      )}

      {shootout.finished && shootout.winnerTeamId && (
        <footer className="display-shootout-footer">
          <div className="display-winner display-winner--prominent display-winner--shootout display-winner--with-logo">
            <span className="display-winner-kicker">Vainqueur shoot-out</span>
            <TeamLogo team={getTeam(tournament, shootout.winnerTeamId)} size="lg" />
            <span className="display-winner-name">
              {getTeam(tournament, shootout.winnerTeamId)?.name}
            </span>
          </div>
        </footer>
      )}

      <DisplayEventOverlay event={highlight} team={highlightTeam} />
    </DisplayShell>
  );
}
