import { Link, Navigate } from "react-router-dom";
import {
  useActiveMatch,
  useTournamentContext,
} from "../context/TournamentContext";
import { MatchInfo } from "./MatchInfo";
import { MatchSelector } from "./MatchSelector";
import { ScoreControls } from "./ScoreControls";
import { TimerControls } from "./TimerControls";
import { ShootoutControls } from "./ShootoutControls";
import { TimeoutBanner } from "./TimeoutBanner";
import { PeriodScoresPanel } from "./PeriodScoresPanel";
import {
  advanceToNextPeriod,
  archiveCurrentPeriodScores,
  canStartShootout,
  computeRemainingSeconds,
  createMatch,
  createShootout,
  getMatchGoalTotals,
  getShootoutHint,
  getTeam,
  applyTeamTimeout,
  canRequestTimeout,
  hasUsedTimeoutInPeriod,
} from "../utils";
import type { Match } from "../types";

export function AdminPanel() {
  const { tournament, setTournament } = useTournamentContext();
  const match = useActiveMatch(tournament);

  if (!tournament) {
    return <Navigate to="/setup" replace />;
  }

  /** Mise à jour fonctionnelle pour éviter les scores « perdus » (état obsolète). */
  const patchMatch = (updater: (m: Match) => Match) => {
    setTournament((prev) => {
      if (!prev?.activeMatchId) return prev;
      return {
        ...prev,
        matches: prev.matches.map((m) =>
          m.id === prev.activeMatchId ? updater(m) : m,
        ),
      };
    });
  };

  const handleScore = (team: "A" | "B", delta: number) => {
    patchMatch((m) => {
      const next = { ...m };
      if (team === "A") next.scoreA = Math.max(0, m.scoreA + delta);
      else next.scoreB = Math.max(0, m.scoreB + delta);
      return next;
    });
  };

  const handleTimerStart = () => {
    patchMatch((m) => ({
      ...m,
      status: m.status === "ready" ? "running" : m.status === "paused" ? "running" : m.status,
      timer: {
        running: true,
        startedAt: Date.now(),
        remainingAtStart: computeRemainingSeconds(m),
      },
    }));
  };

  const handleTimerPause = () => {
    patchMatch((m) => ({
      ...m,
      status: "paused",
      remainingSeconds: computeRemainingSeconds(m),
      timer: { running: false },
    }));
  };

  const handleTimerReset = () => {
    patchMatch((m) => ({
      ...m,
      remainingSeconds: m.durationSeconds,
      timer: { running: false },
    }));
  };

  const handleTimerAdjust = (delta: number) => {
    patchMatch((m) => {
      const base = m.timer.running ? computeRemainingSeconds(m) : m.remainingSeconds;
      const remaining = Math.max(0, base + delta);
      if (m.timer.running) {
        return {
          ...m,
          remainingSeconds: remaining,
          timer: {
            running: true,
            startedAt: Date.now(),
            remainingAtStart: remaining,
          },
        };
      }
      return { ...m, remainingSeconds: remaining };
    });
  };

  const handleDuration = (seconds: number) => {
    patchMatch((m) => ({
      ...m,
      durationSeconds: seconds,
      remainingSeconds: seconds,
      timer: { running: false },
    }));
  };

  const setPeriodWinner = (period: 1 | 2, teamId: string) => {
    const key = period === 1 ? "period1" : "period2";
    patchMatch((m) => ({
      ...m,
      periodWinners: { ...m.periodWinners, [key]: teamId },
    }));
  };

  const endPeriod = () => {
    patchMatch((m) => ({
      ...m,
      status: "paused",
      timer: { running: false },
      remainingSeconds: computeRemainingSeconds(m),
    }));
  };

  const nextPeriod = () => {
    patchMatch((m) => advanceToNextPeriod(m));
  };

  const finishMatch = () => {
    patchMatch((m) => {
      const key = m.period === 1 ? "period1" : "period2";
      let u = m.periodScores[key] ? m : archiveCurrentPeriodScores(m);

      let winner = u.winnerTeamId;
      if (!winner) {
        const totals = getMatchGoalTotals(u);
        if (totals.teamA.for > totals.teamB.for) winner = u.teamAId;
        else if (totals.teamB.for > totals.teamA.for) winner = u.teamBId;
        else if (u.scoreA > u.scoreB) winner = u.teamAId;
        else if (u.scoreB > u.scoreA) winner = u.teamBId;
      }

      return {
        ...u,
        status: "finished",
        timer: { running: false },
        timeout: undefined,
        winnerTeamId: winner,
      };
    });
  };

  const resetMatch = () => {
    if (!match || !confirm("Réinitialiser ce match ?")) return;
    const fresh = createMatch(
      match.teamAId,
      match.teamBId,
      match.durationSeconds,
      match.poolId,
    );
    patchMatch(() => ({ ...fresh, id: match.id }));
  };

  const startShootout = (force = false) => {
    if (!match) return;
    if (!force && !canStartShootout(match)) return;
    if (
      force &&
      !canStartShootout(match) &&
      !confirm("Lancer le shoot-out sans condition classique (1 victoire par période) ?")
    ) {
      return;
    }
    patchMatch((m) => ({
      ...m,
      mode: "shootout",
      status: "running",
      timer: { running: false },
      shootout: createShootout(m.teamAId, m.teamBId),
    }));
  };

  const exitShootout = () => {
    patchMatch((m) => ({
      ...m,
      mode: "match",
      shootout: undefined,
    }));
  };

  const teamA = match ? getTeam(tournament, match.teamAId) : undefined;
  const teamB = match ? getTeam(tournament, match.teamBId) : undefined;
  const teamAName = teamA?.name ?? "A";
  const teamBName = teamB?.name ?? "B";

  return (
    <main className="page admin-page">
      <header className="admin-header">
        <div>
          <h1>{tournament.name}</h1>
          <p className="subtitle">Table de marque</p>
        </div>
        <div className="header-actions">
          <Link to="/classement" className="btn btn-outline">
            Classement
          </Link>
          <Link to="/display" target="_blank" className="btn btn-outline">
            Écran public ↗
          </Link>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <MatchSelector
            tournament={tournament}
            onSetActive={(id) =>
              setTournament((prev) => (prev ? { ...prev, activeMatchId: id } : prev))
            }
            onCreateMatch={(teamAId, teamBId, poolId) => {
              const m = createMatch(teamAId, teamBId, 600, poolId);
              setTournament((prev) =>
                prev
                  ? {
                      ...prev,
                      matches: [...prev.matches, m],
                      activeMatchId: m.id,
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

        <div className="admin-main">
          {!match ? (
            <p className="hint panel">Sélectionnez ou créez un match actif.</p>
          ) : (
            <>
              <TimeoutBanner tournament={tournament} timeout={match.timeout} />
              <MatchInfo tournament={tournament} match={match} />
              {match.mode === "match" && (
                <PeriodScoresPanel tournament={tournament} match={match} />
              )}

              {match.mode === "shootout" ? (
                <ShootoutControls
                  tournament={tournament}
                  match={match}
                  onPatchMatch={patchMatch}
                  onExitShootout={exitShootout}
                />
              ) : (
                <>
                  <ScoreControls
                    match={match}
                    teamA={teamA}
                    teamB={teamB}
                    onScore={handleScore}
                  />
                  <TimerControls
                    match={match}
                    teamAName={teamAName}
                    teamBName={teamBName}
                    canTimeoutA={canRequestTimeout(match, match.teamAId) && !match.timeout}
                    canTimeoutB={canRequestTimeout(match, match.teamBId) && !match.timeout}
                    onDurationChange={handleDuration}
                    onStart={handleTimerStart}
                    onPause={handleTimerPause}
                    onReset={handleTimerReset}
                    onAdjust={handleTimerAdjust}
                    onTimeoutA={() => patchMatch((m) => applyTeamTimeout(m, m.teamAId) ?? m)}
                    onTimeoutB={() => patchMatch((m) => applyTeamTimeout(m, m.teamBId) ?? m)}
                    onCancelTimeout={() => patchMatch((m) => ({ ...m, timeout: undefined }))}
                  />

                  <section className="panel match-management">
                    <h2>Gestion du match</h2>
                    <div className="btn-row">
                      <button type="button" className="btn btn-outline" onClick={() => patchMatch((m) => ({ ...m, status: "ready" }))}>
                        Prêt
                      </button>
                      <button type="button" className="btn btn-success" onClick={() => patchMatch((m) => ({ ...m, status: "running" }))}>
                        En cours
                      </button>
                      <button type="button" className="btn btn-warning" onClick={() => patchMatch((m) => ({ ...m, status: "paused", timer: { running: false } }))}>
                        Pause match
                      </button>
                    </div>
                    <div className="btn-row">
                      <button type="button" className="btn btn-outline" onClick={endPeriod}>
                        Terminer période
                      </button>
                      <button
                        type="button"
                        className="btn btn-accent"
                        onClick={nextPeriod}
                        disabled={match.period >= 2}
                        title="Archive le set et remet le score à 0"
                      >
                        Période suivante (score → 0)
                      </button>
                      <button type="button" className="btn btn-danger" onClick={finishMatch}>
                        Terminer match
                      </button>
                      <button type="button" className="btn btn-outline" onClick={resetMatch}>
                        Réinitialiser match
                      </button>
                    </div>

                    <h3>Vainqueurs de période</h3>
                    <p className="hint shootout-hint">
                      Pour débloquer le shoot-out : une équipe gagne la P1, l&apos;autre la P2.
                    </p>
                    <div className="period-winners-grid">
                      <div className="period-block">
                        <span className="period-label">Période 1</span>
                        <div className="btn-row">
                          <button type="button" className="btn btn-accent btn-sm" onClick={() => setPeriodWinner(1, match.teamAId)}>
                            {teamAName}
                          </button>
                          <button type="button" className="btn btn-accent btn-sm" onClick={() => setPeriodWinner(1, match.teamBId)}>
                            {teamBName}
                          </button>
                        </div>
                      </div>
                      <div className="period-block">
                        <span className="period-label">Période 2</span>
                        <div className="btn-row">
                          <button type="button" className="btn btn-accent btn-sm" onClick={() => setPeriodWinner(2, match.teamAId)}>
                            {teamAName}
                          </button>
                          <button type="button" className="btn btn-accent btn-sm" onClick={() => setPeriodWinner(2, match.teamBId)}>
                            {teamBName}
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="hint timeout-hint-inline">
                      TM : 1 par équipe et par période (P{match.period}) — {teamAName}{" "}
                      {hasUsedTimeoutInPeriod(match, match.teamAId) ? "✓ utilisé" : "dispo"} · {teamBName}{" "}
                      {hasUsedTimeoutInPeriod(match, match.teamBId) ? "✓ utilisé" : "dispo"}
                    </p>

                    <h3>Shoot-out</h3>
                    {getShootoutHint(match, teamAName, teamBName) && (
                      <p className="hint shootout-hint">{getShootoutHint(match, teamAName, teamBName)}</p>
                    )}
                    <div className="btn-row shootout-actions">
                      <button
                        type="button"
                        className="btn btn-accent btn-lg shootout-enter"
                        onClick={() => startShootout(false)}
                        disabled={!canStartShootout(match)}
                      >
                        Passer en mode Shoot-out
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => startShootout(true)}
                      >
                        Forcer le shoot-out
                      </button>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
