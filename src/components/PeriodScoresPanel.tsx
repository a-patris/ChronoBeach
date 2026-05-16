import type { Match, Tournament } from "../types";
import { getMatchGoalTotals, getTeam, hasUsedTimeoutInPeriod } from "../utils";

type Props = {
  tournament: Tournament;
  match: Match;
};

export function PeriodScoresPanel({ tournament, match }: Props) {
  const teamA = getTeam(tournament, match.teamAId)?.name ?? "A";
  const teamB = getTeam(tournament, match.teamBId)?.name ?? "B";
  const totals = getMatchGoalTotals(match);

  return (
    <section className="panel period-scores-panel">
      <h2>Historique des sets</h2>
      <table className="period-scores-table">
        <thead>
          <tr>
            <th>Set</th>
            <th>{teamA}</th>
            <th>{teamB}</th>
          </tr>
        </thead>
        <tbody>
          {match.periodScores.period1 && (
            <tr>
              <td>Période 1</td>
              <td>{match.periodScores.period1.scoreA}</td>
              <td>{match.periodScores.period1.scoreB}</td>
            </tr>
          )}
          {match.periodScores.period2 && (
            <tr>
              <td>Période 2</td>
              <td>{match.periodScores.period2.scoreA}</td>
              <td>{match.periodScores.period2.scoreB}</td>
            </tr>
          )}
          <tr className="period-scores-current">
            <td>Set en cours (P{match.period})</td>
            <td>{match.scoreA}</td>
            <td>{match.scoreB}</td>
          </tr>
          <tr className="period-scores-total">
            <td>Total match</td>
            <td>{totals.teamA.for}</td>
            <td>{totals.teamB.for}</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">
        Goal average : {teamA} {totals.teamA.for}–{totals.teamA.against} · {teamB}{" "}
        {totals.teamB.for}–{totals.teamB.against}
      </p>
      <p className="hint timeout-history">
        TM P1 : {teamA}{" "}
        {hasUsedTimeoutInPeriod(match, match.teamAId, 1) ? "✓" : "—"} · {teamB}{" "}
        {hasUsedTimeoutInPeriod(match, match.teamBId, 1) ? "✓" : "—"}
        {match.period >= 2 || match.periodScores.period2 ? (
          <>
            {" "}
            · TM P2 : {teamA}{" "}
            {hasUsedTimeoutInPeriod(match, match.teamAId, 2) ? "✓" : "—"} · {teamB}{" "}
            {hasUsedTimeoutInPeriod(match, match.teamBId, 2) ? "✓" : "—"}
          </>
        ) : null}
      </p>
    </section>
  );
}
