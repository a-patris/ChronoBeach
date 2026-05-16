import type { Match, Tournament } from "../types";
import { getTeam, hasUsedTimeoutInPeriod, matchStatusLabel } from "../utils";
import { TeamLogo } from "./TeamLogo";

type Props = {
  tournament: Tournament;
  match: Match;
};

export function MatchInfo({ tournament, match }: Props) {
  const teamA = getTeam(tournament, match.teamAId);
  const teamB = getTeam(tournament, match.teamBId);
  const p1 = match.periodWinners.period1
    ? getTeam(tournament, match.periodWinners.period1)?.name
    : "—";
  const p2 = match.periodWinners.period2
    ? getTeam(tournament, match.periodWinners.period2)?.name
    : "—";

  return (
    <section className="panel match-info">
      <h2>Match actif</h2>
      <div className="match-info-grid">
        <div>
          <span className="label">Équipe A</span>
          <strong className="team-info-row">
            <TeamLogo team={teamA} size="sm" />
            {teamA?.name ?? "?"}
          </strong>
        </div>
        <div>
          <span className="label">Équipe B</span>
          <strong className="team-info-row">
            <TeamLogo team={teamB} size="sm" />
            {teamB?.name ?? "?"}
          </strong>
        </div>
        <div>
          <span className="label">Score</span>
          <strong className="score-line">
            {match.scoreA} — {match.scoreB}
          </strong>
        </div>
        <div>
          <span className="label">Période</span>
          <strong>{match.period} / 2</strong>
        </div>
        <div>
          <span className="label">Statut</span>
          <strong className={`status-badge status-${match.status}`}>
            {matchStatusLabel(match.status)}
          </strong>
        </div>
        <div>
          <span className="label">Mode</span>
          <strong>{match.mode === "shootout" ? "Shoot-out" : "Match"}</strong>
        </div>
        <div className="span-2">
          <span className="label">Vainqueurs périodes</span>
          <strong>
            P1 : {p1} · P2 : {p2}
          </strong>
        </div>
        <div className="span-2">
          <span className="label">Temps morts (P{match.period})</span>
          <strong>
            {teamA?.name} : {hasUsedTimeoutInPeriod(match, match.teamAId) ? "utilisé" : "dispo"} ·{" "}
            {teamB?.name} : {hasUsedTimeoutInPeriod(match, match.teamBId) ? "utilisé" : "dispo"}
          </strong>
        </div>
      </div>
    </section>
  );
}
