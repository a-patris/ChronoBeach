import type { Tournament, TournamentEventType } from "../types";
import {
  eventTypeLabel,
  FRIENDLY_ROSTER_OPTIONS,
  normalizeTournamentSettings,
  OFFICIAL_ROSTER_SIZE,
} from "../tournamentConfig";

type Props = {
  eventType: TournamentEventType;
  rosterSize: number;
  onEventTypeChange: (type: TournamentEventType) => void;
  onRosterSizeChange: (size: number) => void;
  compact?: boolean;
};

export function TournamentFormatFields({
  eventType,
  rosterSize,
  onEventTypeChange,
  onRosterSizeChange,
  compact,
}: Props) {
  return (
    <div className={`tournament-format${compact ? " tournament-format--compact" : ""}`}>
      <fieldset className="tournament-format-type">
        <legend>Type de tournoi</legend>
        <label className="format-option">
          <input
            type="radio"
            name="eventType"
            checked={eventType === "official"}
            onChange={() => {
              onEventTypeChange("official");
              onRosterSizeChange(OFFICIAL_ROSTER_SIZE);
            }}
          />
          <span>
            <strong>Officiel</strong>
            <small>10 joueurs max sur la feuille (FFHandball)</small>
          </span>
        </label>
        <label className="format-option">
          <input
            type="radio"
            name="eventType"
            checked={eventType === "friendly"}
            onChange={() => onEventTypeChange("friendly")}
          />
          <span>
            <strong>Amical</strong>
            <small>Effectif configurable sur la feuille</small>
          </span>
        </label>
      </fieldset>

      {eventType === "friendly" && (
        <label className="tournament-roster-select">
          Joueurs max sur la FDME (par équipe)
          <select
            value={rosterSize}
            onChange={(e) => onRosterSizeChange(parseInt(e.target.value, 10))}
          >
            {FRIENDLY_ROSTER_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} joueurs
              </option>
            ))}
          </select>
        </label>
      )}

      {eventType === "official" && (
        <p className="hint format-locked">Effectif fixé à {OFFICIAL_ROSTER_SIZE} joueurs.</p>
      )}
    </div>
  );
}

export function applyFormatPatch(
  tournament: Tournament,
  eventType: TournamentEventType,
  rosterSize: number,
): Tournament {
  return {
    ...tournament,
    ...normalizeTournamentSettings({ eventType, rosterSize }),
  };
}

export function formatSummary(tournament: Tournament): string {
  return eventTypeLabel(tournament.eventType ?? "official");
}
