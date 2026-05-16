import type { Match, Tournament } from "../types";
import { getTeam, hasUsedTimeoutInPeriod } from "../utils";
import { TeamLogo } from "./TeamLogo";

type Props = {
  tournament: Tournament;
  match: Match;
  /** Intégré au panneau chrono (sans encadré séparé) */
  inline?: boolean;
};

function TmBadge({ used, label }: { used: boolean; label: string }) {
  return (
    <span className={`display-tm-badge ${used ? "display-tm-badge--used" : ""}`}>
      {label}
      <span className="display-tm-state">{used ? "TM utilisé" : "—"}</span>
    </span>
  );
}

export function DisplayTimeoutStatus({ tournament, match, inline = false }: Props) {
  const teamA = getTeam(tournament, match.teamAId);
  const teamB = getTeam(tournament, match.teamBId);
  if (!teamA || !teamB) return null;

  const a1 = hasUsedTimeoutInPeriod(match, match.teamAId, 1);
  const b1 = hasUsedTimeoutInPeriod(match, match.teamBId, 1);
  const a2 = hasUsedTimeoutInPeriod(match, match.teamAId, 2);
  const b2 = hasUsedTimeoutInPeriod(match, match.teamBId, 2);

  const Wrapper = inline ? "div" : "aside";

  return (
    <Wrapper
      className={`display-timeout-status${inline ? " display-timeout-status--inline" : ""}`}
      aria-label="Temps morts par période"
    >
      {!inline && <p className="display-timeout-title">Temps morts</p>}
      <div className="display-tm-grid">
        <div className="display-tm-period-col">
          <span className="display-tm-period-label">Période 1</span>
          <div className="display-tm-team-row">
            <TeamLogo team={teamA} size="sm" />
            <TmBadge used={a1} label={teamA.name} />
          </div>
          <div className="display-tm-team-row">
            <TeamLogo team={teamB} size="sm" />
            <TmBadge used={b1} label={teamB.name} />
          </div>
        </div>
        <div className="display-tm-period-col">
          <span className="display-tm-period-label">Période 2</span>
          <div className="display-tm-team-row">
            <TeamLogo team={teamA} size="sm" />
            <TmBadge used={a2} label={teamA.name} />
          </div>
          <div className="display-tm-team-row">
            <TeamLogo team={teamB} size="sm" />
            <TmBadge used={b2} label={teamB.name} />
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
