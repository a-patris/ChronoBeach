import type { CSSProperties } from "react";
import { TeamLogo } from "./TeamLogo";
import type { DisplayHighlight } from "../displayEvents";
import type { Team } from "../types";

type Props = {
  event: DisplayHighlight | null;
  team?: Team;
  /** Vue mobile spectateur — logo équipe mis en avant. */
  compact?: boolean;
};

export function DisplayEventOverlay({ event, team, compact = false }: Props) {
  if (!event) return null;

  const sideClass = `display-event--team-${event.teamSide.toLowerCase()}`;

  return (
    <div
      className={`display-event-overlay display-event--${event.variant} ${sideClass}${compact ? " display-event-overlay--compact" : ""}`}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="display-event-backdrop" aria-hidden />
      <div className="display-event-particles" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="display-event-particle" style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
      <div className="display-event-card">
        {team && (
          <TeamLogo
            team={team}
            size={compact ? "display" : "lg"}
            className="display-event-logo"
          />
        )}
        <span className="display-event-emoji" aria-hidden>
          {event.emoji}
        </span>
        {event.pointsBadge && (
          <span className="display-event-points">{event.pointsBadge}</span>
        )}
        <h2 className="display-event-headline">{event.headline}</h2>
        <p className="display-event-player">{event.playerLine}</p>
        <p className="display-event-team">{event.teamName}</p>
      </div>
    </div>
  );
}
