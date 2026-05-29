import { useState } from "react";
import type { GoalType, Match, Player, SanctionType, Team, Tournament } from "../types";
import {
  addSanction,
  createPlayer,
  ensureMatchSheet,
  getPlayerName,
  getSanctionSubjectLabel,
  getStaffLabel,
  goalTypeLabel,
  removeSanction,
  removeTeamPlayer,
  sanctionLabel,
  setCaptain,
  togglePlayerPresent,
  upsertTeamPlayer,
} from "../matchSheet";
import { getTournamentRosterLimit } from "../tournamentConfig";
import { getTeam } from "../utils";
import { DisciplineReportPanel } from "./DisciplineReportPanel";
import { MatchPdfExport } from "./MatchPdfExport";
import { TeamLogo } from "./TeamLogo";

type Props = {
  tournament: Tournament;
  match: Match;
  onPatchMatch: (updater: (m: Match) => Match) => void;
  onPatchTournament: (updater: (t: Tournament) => Tournament) => void;
};

function PlayerRow({
  team,
  player,
  side,
  match,
  onPatchMatch,
  onPatchTournament,
}: {
  team: Team;
  player: Player;
  side: "teamA" | "teamB";
  match: Match;
  onPatchMatch: Props["onPatchMatch"];
  onPatchTournament: Props["onPatchTournament"];
}) {
  const sheet = ensureMatchSheet(match);
  const present = sheet[side].presentPlayerIds.includes(player.id);
  const isCaptain = sheet[side].captainId === player.id;

  return (
    <div className={`sheet-player-row${present ? " sheet-player-row--present" : ""}`}>
      <label className="sheet-present-check">
        <input
          type="checkbox"
          checked={present}
          onChange={() =>
            onPatchMatch((m) => togglePlayerPresent(m, side, player.id))
          }
        />
      </label>
      <input
        type="number"
        className="sheet-input sheet-input--num"
        min={1}
        max={99}
        value={player.number}
        onChange={(e) => {
          const number = parseInt(e.target.value, 10) || player.number;
          onPatchTournament((t) =>
            upsertTeamPlayer(t, team.id, { ...player, number }),
          );
        }}
      />
      <input
        type="text"
        className="sheet-input sheet-input--name"
        value={player.name}
        placeholder="Nom"
        onChange={(e) => {
          onPatchTournament((t) =>
            upsertTeamPlayer(t, team.id, { ...player, name: e.target.value }),
          );
        }}
      />
      <label className="sheet-flag" title="Gardien">
        <input
          type="checkbox"
          checked={!!player.isGoalkeeper}
          onChange={(e) => {
            onPatchTournament((t) =>
              upsertTeamPlayer(t, team.id, { ...player, isGoalkeeper: e.target.checked }),
            );
          }}
        />
        GK
      </label>
      <button
        type="button"
        className={`btn btn-sm ${isCaptain ? "btn-accent" : "btn-outline"}`}
        title="Capitaine"
        onClick={() =>
          onPatchMatch((m) =>
            setCaptain(m, side, isCaptain ? undefined : player.id),
          )
        }
      >
        C
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline sheet-remove"
        onClick={() => {
          onPatchTournament((t) => removeTeamPlayer(t, team.id, player.id));
        }}
      >
        ×
      </button>
    </div>
  );
}

function TeamRoster({
  team,
  side,
  match,
  tournament,
  onPatchMatch,
  onPatchTournament,
}: {
  team: Team;
  side: "teamA" | "teamB";
  match: Match;
  tournament: Tournament;
  onPatchMatch: Props["onPatchMatch"];
  onPatchTournament: Props["onPatchTournament"];
}) {
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const players = team.players ?? [];
  const maxRoster = getTournamentRosterLimit(tournament);

  const addPlayer = () => {
    const number = parseInt(num, 10);
    if (!number || !name.trim()) return;
    if (players.length >= maxRoster) return;
    const player = createPlayer(number, name);
    onPatchTournament((t) => upsertTeamPlayer(t, team.id, player));
    onPatchMatch((m) => togglePlayerPresent(m, side, player.id));
    setNum("");
    setName("");
  };

  return (
    <div className="sheet-roster-col">
      <div className="sheet-roster-head">
        <TeamLogo team={team} size="sm" />
        <h3>{team.name}</h3>
        <span className="hint">{players.length}/{maxRoster}</span>
      </div>
      <div className="sheet-player-list">
        {players.length === 0 && (
          <p className="hint">Ajoutez les joueurs présents (8+3 max).</p>
        )}
        {players.map((p) => (
          <PlayerRow
            key={p.id}
            team={team}
            player={p}
            side={side}
            match={match}
            onPatchMatch={onPatchMatch}
            onPatchTournament={onPatchTournament}
          />
        ))}
      </div>
      <div className="sheet-add-player">
        <input
          type="number"
          className="sheet-input sheet-input--num"
          placeholder="#"
          min={1}
          max={99}
          value={num}
          onChange={(e) => setNum(e.target.value)}
        />
        <input
          type="text"
          className="sheet-input sheet-input--name"
          placeholder="Nom du joueur"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
        />
        <button type="button" className="btn btn-accent btn-sm" onClick={addPlayer}>
          +
        </button>
      </div>
    </div>
  );
}

function SanctionActions({
  team,
  side,
  match,
  onPatchMatch,
}: {
  team: Team;
  side: "teamA" | "teamB";
  match: Match;
  onPatchMatch: Props["onPatchMatch"];
}) {
  const [subjectId, setSubjectId] = useState("");
  const players = team.players ?? [];
  const sheet = ensureMatchSheet(match);
  const sideData = sheet[side];

  const apply = (type: SanctionType) => {
    if (subjectId === "staff:coach1") {
      onPatchMatch((m) => addSanction(m, team.id, type, undefined, "coach1"));
      return;
    }
    if (subjectId === "staff:coach2") {
      onPatchMatch((m) => addSanction(m, team.id, type, undefined, "coach2"));
      return;
    }
    onPatchMatch((m) => addSanction(m, team.id, type, subjectId || undefined));
  };

  return (
    <div className="sheet-sanction-col">
      <h4>{team.name}</h4>
      <select
        className="sheet-select"
        value={subjectId}
        onChange={(e) => setSubjectId(e.target.value)}
      >
        <option value="">Joueur (optionnel)</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            #{p.number} {p.name}
          </option>
        ))}
        <option value="staff:coach1">{getStaffLabel(sideData, "coach1")}</option>
        {sideData.staffName2?.trim() && (
          <option value="staff:coach2">{getStaffLabel(sideData, "coach2")}</option>
        )}
      </select>
      <div className="btn-row sheet-sanction-btns">
        <button
          type="button"
          className="btn btn-warning btn-sm"
          onClick={() => apply("warning")}
          title="Carton jaune / avertissement verbal"
        >
          Avert.
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm sheet-btn-exclusion"
          onClick={() => apply("exclusion")}
          title="Exclusion beach — reprend à la prochaine possession de balle · 2e exclusion = disqualification"
        >
          Excl.
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => apply("disqualification")}
          title="Disqualification (rouge)"
        >
          Disq.
        </button>
      </div>
    </div>
  );
}

export function MatchSheetPanel({
  tournament,
  match,
  onPatchMatch,
  onPatchTournament,
}: Props) {
  const sheet = ensureMatchSheet(match);
  const teamA = getTeam(tournament, match.teamAId)!;
  const teamB = getTeam(tournament, match.teamBId)!;

  const sortedGoals = [...sheet.goals].sort(
    (a, b) => sheet.goals.indexOf(a) - sheet.goals.indexOf(b),
  );

  return (
    <section className="panel match-sheet-panel">
      <div className="match-sheet-panel-head">
        <h2>Feuille de match</h2>
        <MatchPdfExport
          tournament={tournament}
          match={match}
          teamA={teamA}
          teamB={teamB}
          compact
        />
      </div>
      <p className="hint sheet-rules-hint">
        Règles FFHandball : but classique +1 · 360° / Kung-fu / gardien / 6 m → +2 ·
        2e exclusion = disqualification · 1-1 en sets → shoot-out (choix du premier tireur).
      </p>

      <div className="sheet-officials">
        <label>
          Arbitres
          <input
            type="text"
            className="sheet-input"
            placeholder="Noms des arbitres"
            value={sheet.officials?.referees ?? ""}
            onChange={(e) =>
              onPatchMatch((m) => {
                const s = ensureMatchSheet(m);
                return {
                  ...m,
                  matchSheet: {
                    ...s,
                    officials: { ...s.officials, referees: e.target.value },
                  },
                };
              })
            }
          />
        </label>
        <label>
          Secrétaire
          <input
            type="text"
            className="sheet-input"
            placeholder="Nom"
            value={sheet.officials?.scorekeeper ?? ""}
            onChange={(e) =>
              onPatchMatch((m) => {
                const s = ensureMatchSheet(m);
                return {
                  ...m,
                  matchSheet: {
                    ...s,
                    officials: { ...s.officials, scorekeeper: e.target.value },
                  },
                };
              })
            }
          />
        </label>
      </div>

      <h3>Effectifs</h3>
      <div className="sheet-rosters">
        <TeamRoster
          team={teamA}
          side="teamA"
          match={match}
          tournament={tournament}
          onPatchMatch={onPatchMatch}
          onPatchTournament={onPatchTournament}
        />
        <TeamRoster
          team={teamB}
          side="teamB"
          match={match}
          tournament={tournament}
          onPatchMatch={onPatchMatch}
          onPatchTournament={onPatchTournament}
        />
      </div>

      <h3>Sanctions</h3>
      <div className="sheet-sanctions">
        <SanctionActions team={teamA} side="teamA" match={match} onPatchMatch={onPatchMatch} />
        <SanctionActions team={teamB} side="teamB" match={match} onPatchMatch={onPatchMatch} />
      </div>

      {sheet.sanctions.length > 0 && (
        <div className="sheet-log">
          <h4>Journal sanctions</h4>
          <ul className="sheet-log-list">
            {[...sheet.sanctions].reverse().map((s) => {
              const team = getTeam(tournament, s.teamId);
              const sideKey = s.teamId === match.teamAId ? "teamA" : "teamB";
              const sideData = sheet[sideKey];
              const typeClass =
                s.type === "warning"
                  ? "sheet-log--warn"
                  : s.type === "exclusion"
                    ? "sheet-log--excl"
                    : "sheet-log--disq";
              return (
                <li key={s.id} className={typeClass}>
                  <span>P{s.period}</span>
                  <span>{team?.name}</span>
                  <span>{getSanctionSubjectLabel(team, sideData, s)}</span>
                  <span>{sanctionLabel(s.type)}</span>
                  <button
                    type="button"
                    className="sheet-log-remove"
                    onClick={() => onPatchMatch((m) => removeSanction(m, s.id))}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {sortedGoals.length > 0 && (
        <div className="sheet-log">
          <h4>Journal buts</h4>
          <ul className="sheet-log-list">
            {[...sortedGoals].reverse().map((g) => {
              const team = getTeam(tournament, g.teamId);
              return (
                <li key={g.id} className="sheet-log--goal">
                  <span>P{g.period}</span>
                  <span>{team?.name}</span>
                  <span>{getPlayerName(team, g.playerId)}</span>
                  <span>
                    +{g.points}
                    {g.goalType && g.goalType !== "classic"
                      ? ` (${goalTypeLabel(g.goalType).replace(" (+2)", "")})`
                      : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <h3>Rapport de discipline</h3>
      <DisciplineReportPanel
        tournament={tournament}
        match={match}
        onPatchMatch={onPatchMatch}
      />
    </section>
  );
}

export type ScoreHandler = (
  team: "A" | "B",
  delta: number,
  goalType?: GoalType,
) => void;
