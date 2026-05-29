import type { Tournament } from "../types";
import type { TimeoutState } from "../types";
import { computeTimeoutRemaining, formatTime, getTeam } from "../utils";
import { TeamLogo } from "./TeamLogo";

type Props = {
  tournament: Tournament;
  timeout?: TimeoutState;
  variant?: "admin" | "display" | "spectator";
};

export function TimeoutBanner({ tournament, timeout, variant = "admin" }: Props) {
  if (!timeout) return null;

  const team = getTeam(tournament, timeout.teamId);
  if (!team) return null;

  const remaining = computeTimeoutRemaining(timeout);

  return (
    <div className={`timeout-banner timeout-${variant}`}>
      <span className="timeout-title">TEMPS MORT</span>
      <p className="timeout-chrono">{formatTime(remaining)}</p>
      <div className="timeout-team-row">
        <TeamLogo
          team={team}
          size={variant === "display" ? "display" : variant === "spectator" ? "lg" : "lg"}
        />
        <span className="timeout-team">{team.name}</span>
      </div>
    </div>
  );
}
