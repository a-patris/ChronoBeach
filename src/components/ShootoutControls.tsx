import type { Match, Tournament } from "../types";
import {
  confirmShootoutStart,
  getRegularShotProgress,
  getShootoutPhaseLabel,
  recordShootoutShot,
  REGULAR_SHOTS_PER_TEAM,
  resetShootout,
  shootoutScore,
  undoLastShootoutShot,
} from "../shootout";
import type { ShotResult } from "../types";
import { getTeam, shotResultIcon } from "../utils";
import { TeamLogo } from "./TeamLogo";

type Props = {
  tournament: Tournament;
  match: Match;
  onPatchMatch: (updater: (match: Match) => Match) => void;
  onExitShootout: () => void;
};

export function ShootoutControls({
  tournament,
  match,
  onPatchMatch,
  onExitShootout,
}: Props) {
  const shootout = match.shootout;
  if (!shootout) return null;

  const teamA = getTeam(tournament, match.teamAId)!;
  const teamB = getTeam(tournament, match.teamBId)!;
  const currentTeam = getTeam(tournament, shootout.currentTeamId);
  const firstTeam = getTeam(tournament, shootout.firstShooterId);
  const scoreA = shootoutScore(shootout, match.teamAId);
  const scoreB = shootoutScore(shootout, match.teamBId);
  const progA = getRegularShotProgress(shootout, match.teamAId);
  const progB = getRegularShotProgress(shootout, match.teamBId);
  const isSetup = shootout.phase === "setup";
  const isSuddenDeath =
    shootout.phase === "sudden_death" || shootout.suddenDeath;

  const pickStarter = (teamId: string) => {
    onPatchMatch((m) => {
      if (!m.shootout) return m;
      return { ...m, shootout: confirmShootoutStart(m.shootout, teamId) };
    });
  };

  const record = (result: ShotResult, goalPoints = 1) => {
    if (shootout.finished || isSetup) return;
    onPatchMatch((m) => {
      if (!m.shootout) return m;
      const next = recordShootoutShot(
        m.shootout,
        m.teamAId,
        m.teamBId,
        result,
        goalPoints,
      );
      if (next.finished && next.winnerTeamId) {
        return {
          ...m,
          shootout: next,
          winnerTeamId: next.winnerTeamId,
          status: "finished",
          timer: { running: false },
        };
      }
      return { ...m, shootout: next };
    });
  };

  const undo = () => {
    onPatchMatch((m) => {
      if (!m.shootout) return m;
      const next = undoLastShootoutShot(m.shootout, m.teamAId, m.teamBId);
      return {
        ...m,
        shootout: next,
        winnerTeamId: undefined,
        status: m.status === "finished" ? "running" : m.status,
      };
    });
  };

  const reset = () => {
    onPatchMatch((m) => ({
      ...m,
      shootout: resetShootout(m.teamAId, m.teamBId),
      winnerTeamId: undefined,
      status: "running",
    }));
  };

  return (
    <section className="panel shootout-controls">
      <h2>Shoot-out</h2>
      <p className="shootout-phase-badge">{getShootoutPhaseLabel(shootout)}</p>

      {isSetup ? (
        <div className="shootout-setup">
          <p className="hint">
            Tirage au sort : choisissez l&apos;équipe qui tire en premier, puis 5 tirs par
            équipe.
          </p>
          <div className="btn-row btn-row-lg">
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => pickStarter(match.teamAId)}
            >
              <TeamLogo team={teamA} size="sm" />
              {teamA.name} commence
            </button>
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => pickStarter(match.teamBId)}
            >
              <TeamLogo team={teamB} size="sm" />
              {teamB.name} commence
            </button>
          </div>
        </div>
      ) : (
        <>
          {firstTeam && (
            <p className="hint shootout-first">
              Premier tireur : <strong>{firstTeam.name}</strong>
            </p>
          )}

          {isSuddenDeath && (
            <>
              <p className="sudden-death-label">⚡ MORT SUBITE</p>
            </>
          )}

          {!isSuddenDeath && (
            <p className="hint">
              Série initiale : {progA}/{REGULAR_SHOTS_PER_TEAM} tirs {teamA.name} · {progB}/
              {REGULAR_SHOTS_PER_TEAM} tirs {teamB.name}
            </p>
          )}

          <div className="shootout-scoreboard">
            <div className="shootout-team-col">
              <TeamLogo team={teamA} size="md" />
              <span>{teamA.name}</span>
              <strong>{scoreA}</strong>
            </div>
            <span className="shootout-vs">—</span>
            <div className="shootout-team-col">
              <TeamLogo team={teamB} size="md" />
              <span>{teamB.name}</span>
              <strong>{scoreB}</strong>
            </div>
          </div>

          {!shootout.finished && (
            <>
              <p className="shootout-turn">
                {isSuddenDeath ? (
                  <>
                    Manche {shootout.currentRound} —{" "}
                    <strong>{currentTeam?.name ?? "?"}</strong> tire
                  </>
                ) : (
                  <>
                    Tir {shootout.shots.length + 1}/10 —{" "}
                    <strong>{currentTeam?.name ?? "?"}</strong>
                  </>
                )}
              </p>
              <div className="btn-row btn-row-lg">
                <button type="button" className="btn btn-success" onClick={() => record("goal", 1)}>
                  BUT +1
                </button>
                <button type="button" className="btn btn-success" onClick={() => record("goal", 2)}>
                  BUT +2
                </button>
                <button type="button" className="btn btn-danger" onClick={() => record("miss")}>
                  RATÉ
                </button>
                <button type="button" className="btn btn-warning" onClick={() => record("save")}>
                  ARRÊT
                </button>
              </div>
            </>
          )}

          {shootout.finished && shootout.winnerTeamId && (
            <p className="shootout-winner">
              Vainqueur : {getTeam(tournament, shootout.winnerTeamId)?.name}
            </p>
          )}

          <div className="shootout-history">
            <h3>Historique</h3>
            <div className="shot-history-grid">
              {shootout.shots.map((shot) => (
                <span
                  key={shot.id}
                  className={`shot-chip ${shot.phase === "sudden_death" ? "shot-sd" : ""}`}
                  title={`${getTeam(tournament, shot.teamId)?.name} · ${shot.phase === "sudden_death" ? "MS" : "Série"}`}
                >
                  {shotResultIcon(shot.result, shot.points ?? 1)}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-outline"
          onClick={undo}
          disabled={!shootout.shots.length}
        >
          Annuler dernier tir
        </button>
        <button type="button" className="btn btn-outline" onClick={reset}>
          Réinitialiser shoot-out
        </button>
        <button type="button" className="btn btn-accent" onClick={onExitShootout}>
          Revenir au mode match
        </button>
      </div>
    </section>
  );
}
