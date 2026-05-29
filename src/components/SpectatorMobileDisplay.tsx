import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTournamentRepository } from "../data/tournamentRepository";
import { useDisplayEventQueue } from "../hooks/useDisplayEventQueue";
import { useClockTick } from "../hooks/useClockTick";
import { getRegularShotProgress, REGULAR_SHOTS_PER_TEAM, shootoutScore } from "../shootout";
import { spectatorHubPath } from "../routes/paths";
import { DisplayEventOverlay } from "./DisplayEventOverlay";
import { TimeoutBanner } from "./TimeoutBanner";
import { TeamLogo } from "./TeamLogo";
import {
  computeRemainingSeconds,
  formatTime,
  getTeam,
  hasUsedTimeoutInPeriod,
  matchStatusLabel,
  shotResultIcon,
} from "../utils";
import type { Match, Tournament } from "../types";
import { tournamentLiveEnabled } from "../auth/billing";
import { LiveLaunchGate } from "./LiveLaunchGate";

function SpectatorMobileShell({
  tournament,
  match,
  children,
}: {
  tournament: Tournament;
  match: Match;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add("spectator-mobile-route");
    return () => document.documentElement.classList.remove("spectator-mobile-route");
  }, []);

  const label = [match.courtLabel, match.label].filter(Boolean).join(" · ");

  return (
    <div className="spectator-mobile">
      <header className="spectator-mobile-top">
        <Link to={spectatorHubPath(tournament.id)} className="spectator-mobile-back">
          ← Matchs
        </Link>
        <div className="spectator-mobile-meta">
          <span className="spectator-mobile-tournament">{tournament.name}</span>
          {label && <span className="spectator-mobile-court">{label}</span>}
        </div>
        <span className={`spectator-mobile-status status-${match.status}`}>
          {matchStatusLabel(match.status)}
        </span>
      </header>
      <main className="spectator-mobile-main">{children}</main>
    </div>
  );
}

function SpectatorTeamRow({
  team,
  score,
  align,
}: {
  team: ReturnType<typeof getTeam>;
  score: number;
  align: "left" | "right";
}) {
  return (
    <div className={`spectator-mobile-team spectator-mobile-team--${align}`}>
      <TeamLogo team={team} size="lg" className="spectator-mobile-flag" />
      <span className="spectator-mobile-team-name">{team?.name ?? "Équipe"}</span>
      <span className="spectator-mobile-score">{score}</span>
    </div>
  );
}

function SpectatorTimeoutChips({
  tournament,
  match,
}: {
  tournament: Tournament;
  match: Match;
}) {
  const teamA = getTeam(tournament, match.teamAId);
  const teamB = getTeam(tournament, match.teamBId);
  if (!teamA || !teamB) return null;

  const period = match.period;
  const aUsed = hasUsedTimeoutInPeriod(match, match.teamAId, period);
  const bUsed = hasUsedTimeoutInPeriod(match, match.teamBId, period);

  return (
    <div className="spectator-mobile-tm-row" aria-label="Temps morts période en cours">
      <span className="spectator-mobile-tm-label">TM P{period}</span>
      <span className={`spectator-mobile-tm-chip${aUsed ? " spectator-mobile-tm-chip--used" : ""}`}>
        <TeamLogo team={teamA} size="sm" />
        {aUsed ? "Utilisé" : "Dispo"}
      </span>
      <span className={`spectator-mobile-tm-chip${bUsed ? " spectator-mobile-tm-chip--used" : ""}`}>
        <TeamLogo team={teamB} size="sm" />
        {bUsed ? "Utilisé" : "Dispo"}
      </span>
    </div>
  );
}

function SpectatorMatchView({
  tournament,
  match,
}: {
  tournament: Tournament;
  match: Match;
}) {
  const teamA = getTeam(tournament, match.teamAId);
  const teamB = getTeam(tournament, match.teamBId);
  const now = useClockTick(1000, match.timer.running || !!match.timeout?.timer.running);
  const remaining = computeRemainingSeconds(match, now);
  const highlight = useDisplayEventQueue(tournament, match);
  const highlightTeam =
    highlight?.teamSide === "A" ? teamA : highlight?.teamSide === "B" ? teamB : undefined;
  const isFinished = match.status === "finished";

  return (
    <SpectatorMobileShell tournament={tournament} match={match}>
      <div className="spectator-mobile-scoreboard">
        {match.timeout && (
          <TimeoutBanner tournament={tournament} timeout={match.timeout} variant="spectator" />
        )}

        {!isFinished && (
          <p className="spectator-mobile-period">
            Période {match.period} / 2
            {match.scheduledTime && ` · ${match.scheduledTime}`}
          </p>
        )}

        <div className="spectator-mobile-teams">
          <SpectatorTeamRow team={teamA} score={match.scoreA} align="left" />
          {!isFinished && (
            <div className="spectator-mobile-center">
              <span className="spectator-mobile-timer">{formatTime(remaining)}</span>
            </div>
          )}
          <SpectatorTeamRow team={teamB} score={match.scoreB} align="right" />
        </div>

        {!isFinished && <SpectatorTimeoutChips tournament={tournament} match={match} />}

        {isFinished && match.winnerTeamId && (
          <div className="spectator-mobile-winner">
            <TeamLogo team={getTeam(tournament, match.winnerTeamId)} size="lg" />
            <span>Vainqueur : {getTeam(tournament, match.winnerTeamId)?.name}</span>
          </div>
        )}
      </div>

      <div className="spectator-mobile-overlay-host">
        <DisplayEventOverlay event={highlight} team={highlightTeam} compact />
      </div>
    </SpectatorMobileShell>
  );
}

function SpectatorShootoutView({
  tournament,
  match,
}: {
  tournament: Tournament;
  match: Match;
}) {
  const shootout = match.shootout!;
  const teamA = getTeam(tournament, match.teamAId);
  const teamB = getTeam(tournament, match.teamBId);
  const highlight = useDisplayEventQueue(tournament, match);
  const highlightTeam =
    highlight?.teamSide === "A" ? teamA : highlight?.teamSide === "B" ? teamB : undefined;
  const scoreA = shootoutScore(shootout, match.teamAId);
  const scoreB = shootoutScore(shootout, match.teamBId);
  const isSuddenDeath =
    shootout.phase === "sudden_death" || shootout.suddenDeath;

  return (
    <SpectatorMobileShell tournament={tournament} match={match}>
      <div className="spectator-mobile-scoreboard spectator-mobile-scoreboard--so">
        <p className="spectator-mobile-so-title">Shoot-out</p>
        {isSuddenDeath && <p className="spectator-mobile-so-phase">Mort subite</p>}

        <div className="spectator-mobile-teams">
          <SpectatorTeamRow team={teamA} score={scoreA} align="left" />
          <span className="spectator-mobile-so-vs">vs</span>
          <SpectatorTeamRow team={teamB} score={scoreB} align="right" />
        </div>

        {!shootout.finished && shootout.phase !== "setup" && (
          <p className="hint spectator-mobile-so-progress">
            {getRegularShotProgress(shootout, match.teamAId)}/{REGULAR_SHOTS_PER_TEAM} ·{" "}
            {getRegularShotProgress(shootout, match.teamBId)}/{REGULAR_SHOTS_PER_TEAM} tirs
          </p>
        )}

        <div className="spectator-mobile-so-shots">
          {[teamA, teamB].map((team) => {
            if (!team) return null;
            const shots = shootout.shots.filter((s) => s.teamId === team.id);
            return (
              <div key={team.id} className="spectator-mobile-so-team-shots">
                <TeamLogo team={team} size="sm" />
                <div className="shot-row">
                  {shots.map((s) => (
                    <span key={s.id} className="shot-icon">
                      {shotResultIcon(s.result, s.points ?? 1)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="spectator-mobile-overlay-host">
        <DisplayEventOverlay event={highlight} team={highlightTeam} compact />
      </div>
    </SpectatorMobileShell>
  );
}

export function SpectatorMobileDisplay() {
  const { tournamentId, matchId } = useParams<{
    tournamentId: string;
    matchId: string;
  }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    const repo = getTournamentRepository();
    void repo.load(tournamentId).then((t) => {
      setTournament(t);
      setLoading(false);
    });
    return repo.subscribe(tournamentId, (remote) => {
      if (remote) setTournament(remote);
    });
  }, [tournamentId]);

  if (loading) {
    return (
      <main className="spectator-mobile spectator-mobile--loading">
        <p className="hint">Chargement du match…</p>
      </main>
    );
  }

  if (!tournament || !matchId) {
    return (
      <main className="spectator-mobile spectator-mobile--loading">
        <p className="hint">Match introuvable.</p>
        <Link to="/join/spectator" className="btn btn-outline">
          Retour
        </Link>
      </main>
    );
  }

  if (!tournamentLiveEnabled(tournament)) {
    return (
      <LiveLaunchGate
        tournamentName={tournament.name}
        variant="public"
        backTo="/join/spectator"
        backLabel="Changer de code"
      />
    );
  }

  const match = tournament.matches.find((m) => m.id === matchId);
  if (!match) {
    return (
      <main className="spectator-mobile spectator-mobile--loading">
        <p className="hint">Match introuvable.</p>
        <Link to={spectatorHubPath(tournament.id)} className="btn btn-outline">
          Autres matchs
        </Link>
      </main>
    );
  }

  if (match.mode === "shootout" && match.shootout) {
    return <SpectatorShootoutView tournament={tournament} match={match} />;
  }

  return <SpectatorMatchView tournament={tournament} match={match} />;
}
