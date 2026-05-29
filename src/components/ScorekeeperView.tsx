import { useEffect, useState } from "react";
import type { GoalType, Match, StaffSlot, Team, Tournament } from "../types";
import {
  addSanction,
  backToSheetSetup,
  ensureMatchSheet,
  getEventTimeline,
  getPlayerName,
  getPlayerSheetStats,
  getPresentPlayers,
  getSanctionSubjectLabel,
  getStaffLabel,
  goalTypeLabel,
  isPlayerSelectable,
  isPlusTwoPlayer,
  playerDisplayName,
  resolveGoalForPlayer,
  playEventLabel,
  recordPlayEvent,
  sanctionLabel,
  setActiveSpecialist,
  undoLastEvent,
} from "../matchSheet";
import { applyScoreChange } from "../matchRules";
import {
  confirmShootoutStart,
  getShootoutPhaseLabel,
  recordShootoutShot,
  shootoutScore,
} from "../shootout";
import {
  computeRemainingSeconds,
  formatTime,
  getTeam,
  matchStatusLabel,
} from "../utils";
import { useClockTick } from "../hooks/useClockTick";
import type { ShotResult } from "../types";
import { GoldenGoalBanner } from "./GoldenGoalBanner";
import { TimeoutBanner } from "./TimeoutBanner";
import { TeamLogo } from "./TeamLogo";
import { DisciplineReportPanel } from "./DisciplineReportPanel";
import { MatchPdfExport } from "./MatchPdfExport";
import { ContactActivationCta } from "./ContactActivationCta";
import { useAuth } from "../context/AuthContext";

type SelectedSubject =
  | { kind: "player"; teamId: string; playerId: string; side: "A" | "B" }
  | { kind: "staff"; teamId: string; side: "A" | "B"; staffSlot: StaffSlot };

type Props = {
  tournament: Tournament;
  match: Match;
  teamA: Team;
  teamB: Team;
  variant?: "admin" | "tablet";
  onPatchMatch: (updater: (m: Match) => Match) => void;
  onTimerToggle: () => void;
  onTimeout: (teamId: string) => void;
  onEndPeriod: () => void;
  onNextPeriod: () => void;
  onFinishMatch: () => void;
  onStartShootout: (force?: boolean) => void;
  onExitShootout?: () => void;
  canStartShootout: boolean;
  canTimeoutA: boolean;
  canTimeoutB: boolean;
  liveLocked?: boolean;
  extraHeader?: import("react").ReactNode;
};

type PanelTab = "players" | "staff";

function sanctionChipClass(type: string): string {
  if (type === "warning") return "sk-sanction-chip sk-sanction-chip--warn";
  if (type === "exclusion") return "sk-sanction-chip sk-sanction-chip--excl";
  return "sk-sanction-chip sk-sanction-chip--disq";
}

function PlayerGrid({
  team,
  side,
  match,
  selected,
  onSelect,
  onSetActiveSpecialist,
}: {
  team: Team;
  side: "A" | "B";
  match: Match;
  selected: SelectedSubject | null;
  onSelect: (p: SelectedSubject | null) => void;
  onSetActiveSpecialist: (sideKey: "teamA" | "teamB", playerId: string) => void;
}) {
  const [tab, setTab] = useState<PanelTab>("players");
  const sheet = ensureMatchSheet(match);
  const sideKey = side === "A" ? "teamA" : "teamB";
  const sideData = sheet[sideKey];
  const players = getPresentPlayers(team, match, sideKey);
  const activeId = sideData.activeSpecialistId;
  const plusTwoPlayers = players.filter(isPlusTwoPlayer);

  const handleSelectPlayer = (p: (typeof players)[0]) => {
    if (!isPlayerSelectable(match, team.id, p.id)) return;
    const isActive =
      selected?.kind === "player" && selected.playerId === p.id && selected.side === side;
    if (isActive) {
      onSelect(null);
      return;
    }
    onSelect({ kind: "player", teamId: team.id, playerId: p.id, side });
    if (isPlusTwoPlayer(p)) {
      onSetActiveSpecialist(sideKey, p.id);
    }
  };

  const handleSelectStaff = (staffSlot: StaffSlot) => {
    const isActive =
      selected?.kind === "staff" &&
      selected.staffSlot === staffSlot &&
      selected.side === side;
    if (isActive) {
      onSelect(null);
      return;
    }
    onSelect({ kind: "staff", teamId: team.id, staffSlot, side });
  };

  const staffRows: { slot: StaffSlot; label: string }[] = [
    { slot: "coach1", label: "R" },
  ];
  if (sideData.staffName2?.trim()) {
    staffRows.push({ slot: "coach2", label: "R2" });
  }

  return (
    <div className={`sk-panel sk-panel--${side.toLowerCase()}`}>
      <header className="sk-panel-head">
        <TeamLogo team={team} size="sm" />
        <h3 className="sk-panel-title">{team.name}</h3>
      </header>

      {plusTwoPlayers.length > 0 && tab === "players" && (
        <p className="sk-plus-two-hint">
          GK/S en jeu :{" "}
          {activeId ? (
            <strong>
              {playerDisplayName(
                plusTwoPlayers.find((x) => x.id === activeId) ?? plusTwoPlayers[0],
              )}
            </strong>
          ) : (
            <span className="hint">sélectionnez un GK ou S</span>
          )}
        </p>
      )}

      <nav className="sk-panel-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "players"}
          className={`sk-panel-tab${tab === "players" ? " sk-panel-tab--active" : ""}`}
          onClick={() => setTab("players")}
        >
          Joueurs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "staff"}
          className={`sk-panel-tab${tab === "staff" ? " sk-panel-tab--active" : ""}`}
          onClick={() => setTab("staff")}
        >
          Staff
        </button>
      </nav>

      {tab === "players" ? (
        <div className="sk-card-grid">
          {players.map((p) => {
            const isSelected =
              selected?.kind === "player" && selected.playerId === p.id && selected.side === side;
            const isInPlay = activeId === p.id && isPlusTwoPlayer(p);
            const isCaptain = sideData.captainId === p.id;
            const stats = getPlayerSheetStats(sheet, team.id, p.id);
            const selectable = isPlayerSelectable(match, team.id, p.id);
            const sideline = !selectable;
            const roleClass = p.isSpecialist
              ? " sk-card--spec"
              : p.isGoalkeeper
                ? " sk-card--gk"
                : "";
            return (
              <button
                key={p.id}
                type="button"
                className={`sk-card${isSelected ? " sk-card--selected" : ""}${roleClass}${isInPlay ? " sk-card--inplay" : ""}${sideline ? " sk-card--out" : ""}`}
                disabled={sideline}
                title={
                  sideline
                    ? stats.sanctions.some((s) => s.type === "disqualification")
                      ? "Disqualifié — ne peut plus jouer"
                      : "Exclu — reprend à la prochaine possession de balle"
                    : undefined
                }
                onClick={() => handleSelectPlayer(p)}
              >
                <div className="sk-card-tags">
                  {isCaptain && <span className="sk-card-tag sk-card-tag--cap">CAP</span>}
                  {p.isGoalkeeper && <span className="sk-card-tag sk-card-tag--gk">G</span>}
                  {p.isSpecialist && <span className="sk-card-tag sk-card-tag--spec">S</span>}
                  {isInPlay && <span className="sk-card-tag sk-card-tag--play">▶</span>}
                </div>
                <div className="sk-card-main">
                  <span className="sk-card-num">{p.number}</span>
                  <span className="sk-card-name">{playerDisplayName(p) || "—"}</span>
                </div>
                {(stats.sanctions.length > 0 || stats.goals > 0) && (
                  <div className="sk-card-meta">
                    {stats.sanctions.map((s) => (
                      <span key={s.id} className={sanctionChipClass(s.type)} aria-hidden />
                    ))}
                    {stats.goals > 0 && (
                      <span className="sk-card-goals" title="Buts">
                        {stats.goals}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
          {players.length === 0 && (
            <p className="hint sk-grid-empty">Aucun joueur coché présent</p>
          )}
        </div>
      ) : (
        <div className="sk-staff-list">
          {staffRows.map(({ slot, label }) => {
            const isSelected =
              selected?.kind === "staff" &&
              selected.staffSlot === slot &&
              selected.side === side;
            return (
              <button
                key={slot}
                type="button"
                className={`sk-staff-card${isSelected ? " sk-staff-card--selected" : ""}`}
                onClick={() => handleSelectStaff(slot)}
              >
                <span className="sk-staff-card-role">{label}</span>
                <span className="sk-staff-card-name">{getStaffLabel(sideData, slot)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function eventIcon(kind: string, sub?: string): string {
  if (kind === "goal") return "⚽";
  if (kind === "play") return sub === "save" ? "🛡️" : "💨";
  if (kind === "sanction") {
    if (sub === "warning") return "🟨";
    if (sub === "exclusion") return "↩";
    return "🟥";
  }
  return "•";
}

function eventMetaLine(
  period: number,
  elapsedSeconds?: number,
  suffix?: string,
): string {
  const parts: string[] = [];
  if (elapsedSeconds != null) parts.push(formatTime(elapsedSeconds));
  parts.push(`P${period}`);
  if (suffix) parts.push(suffix);
  return parts.join(" · ");
}

function EventLog({
  tournament,
  match,
}: {
  tournament: Tournament;
  match: Match;
}) {
  const timeline = getEventTimeline(match);
  if (timeline.length === 0) {
    return (
      <p className="hint sk-events-empty">
        Aucun fait de match — sélectionnez un joueur puis une action.
      </p>
    );
  }

  let runA = 0;
  let runB = 0;
  const reversed = [...timeline].reverse();

  return (
    <ul className="sk-events-list">
      {reversed.map((entry) => {
        const isTeamA =
          entry.kind === "goal"
            ? entry.goal.teamId === match.teamAId
            : entry.kind === "play"
              ? entry.play.teamId === match.teamAId
              : entry.sanction.teamId === match.teamAId;
        const sideClass = isTeamA ? "sk-event--a" : "sk-event--b";

        if (entry.kind === "goal") {
          const g = entry.goal;
          const team = getTeam(tournament, g.teamId);
          if (g.teamId === match.teamAId) runA += g.points;
          else runB += g.points;
          const scoreAfter = `${runA} - ${runB}`;
          const label =
            g.points === 2 && g.goalType && g.goalType !== "classic"
              ? `But +2 · ${goalTypeLabel(g.goalType).replace(" (+2)", "")}`
              : `But +${g.points}`;
          return (
            <li key={g.id} className={`sk-event ${sideClass}`}>
              <span className="sk-event-icon">{eventIcon("goal")}</span>
              <div className="sk-event-body">
                <span className="sk-event-action">{label}</span>
                <span className="sk-event-subject">{getPlayerName(team, g.playerId)}</span>
              </div>
              <span className="sk-event-meta">
                {eventMetaLine(g.period, g.elapsedSeconds, scoreAfter)}
              </span>
            </li>
          );
        }

        if (entry.kind === "play") {
          const pl = entry.play;
          const team = getTeam(tournament, pl.teamId);
          return (
            <li key={pl.id} className={`sk-event ${sideClass}`}>
              <span className="sk-event-icon">{eventIcon("play", pl.type)}</span>
              <div className="sk-event-body">
                <span className="sk-event-action">{playEventLabel(pl.type)}</span>
                <span className="sk-event-subject">{getPlayerName(team, pl.playerId)}</span>
              </div>
              <span className="sk-event-meta">
                {eventMetaLine(pl.period, pl.elapsedSeconds)}
              </span>
            </li>
          );
        }

        if (entry.kind === "sanction") {
          const s = entry.sanction;
          const team = getTeam(tournament, s.teamId);
          const sideKey = s.teamId === match.teamAId ? "teamA" : "teamB";
          const sideData = ensureMatchSheet(match)[sideKey];
          return (
            <li key={s.id} className={`sk-event ${sideClass} sk-event--sanction-${s.type}`}>
              <span className="sk-event-icon">{eventIcon("sanction", s.type)}</span>
              <div className="sk-event-body">
                <span className="sk-event-action">{sanctionLabel(s.type)}</span>
                <span className="sk-event-subject">
                  {getSanctionSubjectLabel(team, sideData, s)}
                </span>
              </div>
              <span className="sk-event-meta">
                {eventMetaLine(s.period, s.elapsedSeconds)}
              </span>
            </li>
          );
        }

        return null;
      })}
    </ul>
  );
}

export function ScorekeeperView({
  tournament,
  match,
  teamA,
  teamB,
  variant = "admin",
  onPatchMatch,
  onTimerToggle,
  onTimeout,
  onEndPeriod,
  onNextPeriod,
  onFinishMatch,
  onStartShootout,
  onExitShootout,
  canStartShootout,
  canTimeoutA,
  canTimeoutB,
  liveLocked = false,
  extraHeader,
}: Props) {
  const [selected, setSelected] = useState<SelectedSubject | null>(null);
  const { user, profile } = useAuth();
  const now = useClockTick(1000, match.timer.running || !!match.timeout?.timer.running);
  const remaining = computeRemainingSeconds(match, now);

  useEffect(() => {
    if (!selected || selected.kind !== "player") return;
    if (!isPlayerSelectable(match, selected.teamId, selected.playerId)) {
      setSelected(null);
    }
  }, [match, selected]);

  const isShootout = match.mode === "shootout" && match.shootout;
  const shootout = match.shootout;

  const applyGoal = (points: 1 | 2, goalType?: GoalType) => {
    if (!selected || selected.kind !== "player") return;
    const team = selected.side === "A" ? teamA : teamB;
    const player = team.players?.find((p) => p.id === selected.playerId);
    const resolved = resolveGoalForPlayer(player, points, goalType);
    onPatchMatch((m) =>
      applyScoreChange(m, selected.side, resolved.points, {
        goalType: resolved.goalType,
        playerId: selected.playerId,
      }),
    );
  };

  const handleSetActiveSpecialist = (sideKey: "teamA" | "teamB", playerId: string) => {
    onPatchMatch((m) => setActiveSpecialist(m, sideKey, playerId));
  };

  const applySanction = (type: "warning" | "exclusion" | "disqualification") => {
    if (!selected) return;
    if (selected.kind === "staff") {
      onPatchMatch((m) =>
        addSanction(m, selected.teamId, type, undefined, selected.staffSlot),
      );
      return;
    }
    onPatchMatch((m) => addSanction(m, selected.teamId, type, selected.playerId));
    if (type === "exclusion" || type === "disqualification") {
      setSelected(null);
    }
  };

  const applyPlay = (type: "shot_miss" | "save") => {
    if (!selected || selected.kind !== "player") return;
    onPatchMatch((m) => recordPlayEvent(m, selected.teamId, type, selected.playerId));
  };

  const defendingGkId = (shootingTeamId: string): string | undefined => {
    const defendingTeamId =
      shootingTeamId === match.teamAId ? match.teamBId : match.teamAId;
    const sideKey = defendingTeamId === match.teamAId ? "teamA" : "teamB";
    const sheet = ensureMatchSheet(match);
    if (sheet[sideKey].activeSpecialistId) return sheet[sideKey].activeSpecialistId;
    const team = defendingTeamId === match.teamAId ? teamA : teamB;
    return team.players?.find(isPlusTwoPlayer)?.id;
  };

  const recordShot = (result: ShotResult, goalPoints = 1) => {
    if (!shootout || shootout.finished || shootout.phase === "setup") return;
    const shooterId = selected?.kind === "player" ? selected.playerId : undefined;
    const shootingTeamId = shootout.currentTeamId;
    onPatchMatch((m) => {
      if (!m.shootout || !shootingTeamId) return m;
      const playerId =
        result === "save" ? defendingGkId(shootingTeamId) : shooterId;
      const next = recordShootoutShot(
        m.shootout,
        m.teamAId,
        m.teamBId,
        result,
        goalPoints,
        playerId,
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

  const pickStarter = (teamId: string) => {
    onPatchMatch((m) => {
      if (!m.shootout) return m;
      return { ...m, shootout: confirmShootoutStart(m.shootout, teamId) };
    });
  };

  const selectedLabel = (() => {
    if (!selected) return null;
    if (selected.kind === "staff") {
      const sideKey = selected.side === "A" ? "teamA" : "teamB";
      return getStaffLabel(ensureMatchSheet(match)[sideKey], selected.staffSlot);
    }
    return getPlayerName(selected.side === "A" ? teamA : teamB, selected.playerId);
  })();

  const selectedPlayer =
    selected?.kind === "player"
      ? (selected.side === "A" ? teamA : teamB).players?.find((p) => p.id === selected.playerId)
      : undefined;

  const isStaffSelected = selected?.kind === "staff";

  const butLabel =
    selectedPlayer && isPlusTwoPlayer(selectedPlayer) ? "But +2" : "But +1";

  return (
    <div className={`scorekeeper sk--${variant}`}>
      {match.timeout && (
        <TimeoutBanner tournament={tournament} timeout={match.timeout} variant="display" />
      )}
      <GoldenGoalBanner match={match} />
      {extraHeader}

      <div className="sk-top">
        <button
          type="button"
          className="sk-tm sk-tm--a"
          disabled={!canTimeoutA}
          onClick={() => onTimeout(match.teamAId)}
        >
          T.M.E
        </button>

        <div className="sk-team-block sk-team-block--a">
          <TeamLogo team={teamA} size="sm" />
          <h2 className="sk-team-name">{teamA.name}</h2>
          <span className="sk-team-score">
            {isShootout && shootout
              ? shootoutScore(shootout, match.teamAId)
              : match.scoreA}
          </span>
        </div>

        <div className="sk-center">
          <span className="sk-period">Période {match.period}/2</span>
          <button
            type="button"
            className={`sk-timer${match.timer.running ? " sk-timer--on" : ""}`}
            onClick={onTimerToggle}
          >
            {formatTime(remaining)}
          </button>
          <button
            type="button"
            className={`sk-start${match.timer.running ? " sk-start--pause" : ""}${liveLocked ? " sk-start--locked" : ""}`}
            onClick={onTimerToggle}
          >
            {match.timer.running ? "PAUSE" : "START"}
          </button>
          {liveLocked && (
            <div className="sk-live-locked-block">
              <p className="sk-live-locked-hint">
                Vous pourrez lancer votre tournoi une fois abonné.
              </p>
              <ContactActivationCta
                userName={profile?.displayName ?? user?.displayName ?? undefined}
                userEmail={user?.email ?? undefined}
                tournamentName={tournament.name}
                tournamentId={tournament.id}
                variant="inline"
              />
            </div>
          )}
          <span className="sk-status">{matchStatusLabel(match.status)}</span>
        </div>

        <div className="sk-team-block sk-team-block--b">
          <TeamLogo team={teamB} size="sm" />
          <h2 className="sk-team-name">{teamB.name}</h2>
          <span className="sk-team-score">
            {isShootout && shootout
              ? shootoutScore(shootout, match.teamBId)
              : match.scoreB}
          </span>
        </div>

        <button
          type="button"
          className="sk-tm sk-tm--b"
          disabled={!canTimeoutB}
          onClick={() => onTimeout(match.teamBId)}
        >
          T.M.E
        </button>
      </div>

      {isShootout && shootout ? (
        <div className="sk-shootout">
          <p className="sk-shootout-phase">{getShootoutPhaseLabel(shootout)}</p>
          {shootout.phase === "setup" ? (
            <div className="sk-so-setup">
              <p>Tirage au sort — qui tire en premier ?</p>
              <div className="btn-row">
                <button type="button" className="btn btn-accent" onClick={() => pickStarter(match.teamAId)}>
                  {teamA.name}
                </button>
                <button type="button" className="btn btn-accent" onClick={() => pickStarter(match.teamBId)}>
                  {teamB.name}
                </button>
              </div>
            </div>
          ) : (
            !shootout.finished && (
              <div className="sk-actions sk-actions--so">
                <button type="button" className="sk-act sk-act--goal" onClick={() => recordShot("goal", 1)}>
                  BUT +1
                </button>
                <button type="button" className="sk-act sk-act--goal2" onClick={() => recordShot("goal", 2)}>
                  BUT +2
                </button>
                <button type="button" className="sk-act sk-act--miss" onClick={() => recordShot("miss")}>
                  Raté
                </button>
                <button type="button" className="sk-act sk-act--save" onClick={() => recordShot("save")}>
                  Arrêt
                </button>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="sk-body">
          <div className="sk-body-main">
            <div className="sk-grids">
              <PlayerGrid
                team={teamA}
                side="A"
                match={match}
                selected={selected}
                onSelect={setSelected}
                onSetActiveSpecialist={handleSetActiveSpecialist}
              />
              <PlayerGrid
                team={teamB}
                side="B"
                match={match}
                selected={selected}
                onSelect={setSelected}
                onSetActiveSpecialist={handleSetActiveSpecialist}
              />
            </div>

            <p className="sk-selection">
              {selectedLabel ? (
                <>
                  {isStaffSelected ? "Entraîneur sélectionné" : "Joueur sélectionné"} :{" "}
                  <strong>{selectedLabel}</strong>
                  {selectedPlayer && isPlusTwoPlayer(selectedPlayer) && (
                    <span className="sk-selection-plus2"> · but = +2 auto</span>
                  )}
                  {isStaffSelected && (
                    <span className="sk-selection-staff"> · sanctions uniquement</span>
                  )}
                </>
              ) : (
                <span className="hint">
                  Sélectionnez un joueur ou un entraîneur (onglet Staff), puis une action
                </span>
              )}
            </p>

            <div className="sk-actions">
              <button
                type="button"
                className="sk-act sk-act--undo"
                onClick={() => onPatchMatch((m) => undoLastEvent(m))}
              >
                Annul.
              </button>
              <button
                type="button"
                className="sk-act sk-act--warn"
                disabled={!selected}
                onClick={() => applySanction("warning")}
              >
                Avert.
              </button>
              <button
                type="button"
                className="sk-act sk-act--excl"
                disabled={!selected}
              onClick={() => applySanction("exclusion")}
            >
              Excl.
            </button>
              <button
                type="button"
                className="sk-act sk-act--disq"
                disabled={!selected}
                onClick={() => applySanction("disqualification")}
              >
                Disqual.
              </button>
              <button
                type="button"
                className="sk-act sk-act--miss"
                disabled={!selectedPlayer}
                onClick={() => applyPlay("shot_miss")}
              >
                Tir
              </button>
              <button
                type="button"
                className="sk-act sk-act--save"
                disabled={!selectedPlayer}
                onClick={() => applyPlay("save")}
              >
                Arrêt
              </button>
              <button
                type="button"
                className={`sk-act sk-act--goal${selectedPlayer && isPlusTwoPlayer(selectedPlayer) ? " sk-act--goal-auto2" : ""}`}
                disabled={!selectedPlayer}
                onClick={() => applyGoal(1)}
              >
                {butLabel}
              </button>
              <button
                type="button"
                className="sk-act sk-act--goal2"
                disabled={!selectedPlayer}
                onClick={() => applyGoal(2, "360")}
              >
                360°
              </button>
              <button
                type="button"
                className="sk-act sk-act--goal2"
                disabled={!selectedPlayer}
                onClick={() => applyGoal(2, "kungfu")}
              >
                Kung-fu
              </button>
              <button
                type="button"
                className="sk-act sk-act--goal2"
                disabled={!selectedPlayer}
                onClick={() => applyGoal(2, "goalkeeper")}
              >
                GK
              </button>
              <button
                type="button"
                className="sk-act sk-act--goal2"
                disabled={!selectedPlayer}
                onClick={() => applyGoal(2, "penalty6m")}
              >
                6 m
              </button>
            </div>
          </div>

          <aside className="sk-events-panel">
            <h3 className="sk-events-title">Faits de match</h3>
            <div className="sk-events-scroll">
              <EventLog tournament={tournament} match={match} />
            </div>
          </aside>
        </div>
      )}

      <details className="sk-mgmt">
        <summary>Gestion match</summary>
        <div className="sk-mgmt-body">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onPatchMatch((m) => backToSheetSetup(m))}>
            ← FDME
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={onEndPeriod}>
            Fin période
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onNextPeriod}
            disabled={match.period >= 2}
          >
            Période suivante
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onFinishMatch}>
            Fin match
          </button>
          {canStartShootout && (
            <button type="button" className="btn btn-accent btn-sm" onClick={() => onStartShootout(false)}>
              Shoot-out
            </button>
          )}
          {isShootout && onExitShootout && (
            <button type="button" className="btn btn-outline btn-sm" onClick={onExitShootout}>
              Quitter shoot-out
            </button>
          )}
        </div>
        <details className="sk-discipline">
          <summary>Rapport de discipline</summary>
          <DisciplineReportPanel
            tournament={tournament}
            match={match}
            onPatchMatch={onPatchMatch}
            compact
          />
        </details>
        <div className="sk-pdf-export">
          <MatchPdfExport
            tournament={tournament}
            match={match}
            teamA={teamA}
            teamB={teamB}
            compact
          />
        </div>
      </details>
    </div>
  );
}
