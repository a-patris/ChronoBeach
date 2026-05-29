import { useState } from "react";
import type { Match, Team, Tournament } from "../types";
import {
  addDisciplineReport,
  ensureMatchSheet,
  getDisciplineReportSubjectLabel,
  getPresentPlayers,
  getStaffLabel,
  removeDisciplineReport,
} from "../matchSheet";
import { getTeam } from "../utils";

type Props = {
  tournament: Tournament;
  match: Match;
  onPatchMatch: (updater: (m: Match) => Match) => void;
  compact?: boolean;
};

function TeamReportForm({
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
  const [note, setNote] = useState("");
  const sheet = ensureMatchSheet(match);
  const sideData = sheet[side];
  const players = getPresentPlayers(team, match, side);

  const submit = () => {
    if (subjectId === "staff:coach1") {
      onPatchMatch((m) => addDisciplineReport(m, team.id, undefined, "coach1", note));
    } else if (subjectId === "staff:coach2") {
      onPatchMatch((m) => addDisciplineReport(m, team.id, undefined, "coach2", note));
    } else {
      onPatchMatch((m) =>
        addDisciplineReport(m, team.id, subjectId || undefined, undefined, note),
      );
    }
    setNote("");
  };

  return (
    <div className="discipline-team">
      <h4 className="discipline-team-title">{team.name}</h4>
      <select
        className="sheet-select discipline-select"
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
      <input
        type="text"
        className="sheet-input discipline-note"
        placeholder="Motif (optionnel)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-sm discipline-btn-report"
        onClick={submit}
        title="Carton bleu — rapport de discipline (feuille officielle)"
      >
        🟦 Rapport
      </button>
    </div>
  );
}

export function DisciplineReportPanel({
  tournament,
  match,
  onPatchMatch,
  compact = false,
}: Props) {
  const sheet = ensureMatchSheet(match);
  const reports = sheet.disciplineReports ?? [];
  const teamA = getTeam(tournament, match.teamAId)!;
  const teamB = getTeam(tournament, match.teamBId)!;

  return (
    <div className={`discipline-panel${compact ? " discipline-panel--compact" : ""}`}>
      <p className="hint discipline-hint">
        Carton bleu — feuille officielle en fin de match. Non affiché sur l&apos;écran public.
      </p>

      <div className="discipline-forms">
        <TeamReportForm
          team={teamA}
          side="teamA"
          match={match}
          onPatchMatch={onPatchMatch}
        />
        <TeamReportForm
          team={teamB}
          side="teamB"
          match={match}
          onPatchMatch={onPatchMatch}
        />
      </div>

      {reports.length > 0 && (
        <ul className="discipline-log">
          {[...reports].reverse().map((r) => {
            const team = getTeam(tournament, r.teamId);
            const sideKey = r.teamId === match.teamAId ? "teamA" : "teamB";
            const sideData = sheet[sideKey];
            return (
              <li key={r.id} className="discipline-log-item">
                <span className="discipline-log-icon" aria-hidden>
                  🟦
                </span>
                <span className="discipline-log-team">{team?.name}</span>
                <span className="discipline-log-subject">
                  {getDisciplineReportSubjectLabel(team, sideData, r)}
                </span>
                {r.note && <span className="discipline-log-note">{r.note}</span>}
                <button
                  type="button"
                  className="sheet-log-remove"
                  onClick={() => onPatchMatch((m) => removeDisciplineReport(m, r.id))}
                  aria-label="Retirer le rapport"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
