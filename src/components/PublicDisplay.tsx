import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFullscreen } from "../hooks/useFullscreen";
import { loadTournament } from "../storage";
import { getRegularShotProgress, REGULAR_SHOTS_PER_TEAM, shootoutScore } from "../shootout";
import { tournamentSync } from "../sync";
import { DisplayTimeoutStatus } from "./DisplayTimeoutStatus";
import { TimeoutBanner } from "./TimeoutBanner";
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
}: {
  children: ReactNode;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const { active, enter } = useFullscreen(viewportRef);

  useEffect(() => {
    document.documentElement.classList.add("display-route");
    if (new URLSearchParams(window.location.search).get("fs") === "1") {
      void enter().catch(() => {});
    }
    return () => document.documentElement.classList.remove("display-route");
  }, [enter]);

  return (
    <div
      ref={viewportRef}
      className={`display-viewport${active ? " display-viewport--fullscreen" : ""}`}
    >
      {!active && (
        <button
          type="button"
          className="display-fullscreen-btn"
          onClick={() => void enter()}
          title="Plein écran"
        >
          Plein écran
        </button>
      )}
      <div className={`display ${className}`.trim()}>{children}</div>
    </div>
  );
}

export function PublicDisplay() {
  const [tournament, setTournament] = useState<Tournament | null>(() => loadTournament());

  useEffect(() => {
    const reload = () => setTournament(loadTournament());
    const unsub = tournamentSync.subscribe(reload);
    const interval = window.setInterval(reload, 200);
    const onVisibility = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsub();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!tournament) {
    return (
      <DisplayShell className="display-empty">
        <p>Aucun tournoi configuré</p>
        <p className="hint">Créez un tournoi depuis /setup</p>
      </DisplayShell>
    );
  }

  const match = tournament.matches.find((m) => m.id === tournament.activeMatchId);

  if (!match) {
    return (
      <DisplayShell className="display-empty">
        <h1>{tournament.name}</h1>
        <p>En attente d'un match actif</p>
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
  const remaining = computeRemainingSeconds(match);
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
    >
      {match.timeout && (
        <TimeoutBanner tournament={tournament} timeout={match.timeout} variant="display" />
      )}

      <header className="display-header">
        <span className="tournament-name">{tournament.name}</span>
        <span className={`display-status status-${match.status}`}>
          {matchStatusLabel(match.status)}
        </span>
      </header>

      <div className="display-match-head">
        {match.label && <h1 className="display-match-label">{match.label}</h1>}
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

    </DisplayShell>
  );
}

function ShootoutDisplay({ tournament, match }: { tournament: Tournament; match: Match }) {
  const shootout = match.shootout!;
  const teamA = getTeam(tournament, match.teamAId);
  const teamB = getTeam(tournament, match.teamBId);
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
    <DisplayShell className="display-shootout">
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
    </DisplayShell>
  );
}
