import { Link, Navigate } from "react-router-dom";
import { useTournamentContext } from "../context/TournamentContext";
import { computeStandings } from "../standings";
import { getTeam } from "../utils";
import { TeamLogo } from "./TeamLogo";

export function StandingsPage() {
  const { tournament } = useTournamentContext();

  if (!tournament) {
    return <Navigate to="/setup" replace />;
  }

  const pools =
    tournament.pools.length > 0
      ? tournament.pools
      : [{ id: "_all", name: "Tournoi" }];

  return (
    <main className="page standings-page">
      <header className="page-header">
        <h1>Classement — {tournament.name}</h1>
        <Link to="/admin" className="btn btn-outline">
          ← Table de marque
        </Link>
      </header>

      {pools.map((pool) => {
        const poolId = pool.id === "_all" ? undefined : pool.id;
        const rows = computeStandings(tournament, poolId);

        return (
          <section key={pool.id} className="panel standings-block">
            <h2>{pool.name}</h2>
            {rows.length === 0 ? (
              <p className="hint">Aucune équipe dans cette poule.</p>
            ) : (
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Équipe</th>
                    <th>J</th>
                    <th>V</th>
                    <th>D</th>
                    <th>BP</th>
                    <th>BC</th>
                    <th>+/-</th>
                    <th title="Sets de période gagnés (P1 + P2)">Sets G</th>
                    <th title="Sets de période perdus">Sets P</th>
                    <th title="Sets gagnés au shoot-out">SO</th>
                    <th title="Différentiel sets (périodes + shoot-out)">Set +/-</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const team = getTeam(tournament, row.teamId);
                    return (
                      <tr key={row.teamId}>
                        <td>{i + 1}</td>
                        <td className="standings-team">
                          <TeamLogo team={team} size="xs" />
                          {team?.name ?? "?"}
                        </td>
                        <td>{row.played}</td>
                        <td>{row.won}</td>
                        <td>{row.lost}</td>
                        <td>{row.goalsFor}</td>
                        <td>{row.goalsAgainst}</td>
                        <td className={row.goalDiff >= 0 ? "diff-pos" : "diff-neg"}>
                          {row.goalDiff > 0 ? "+" : ""}
                          {row.goalDiff}
                        </td>
                        <td>{row.periodSetsWon}</td>
                        <td>{row.periodSetsLost}</td>
                        <td>{row.shootoutSetsWon}</td>
                        <td className={row.setDiff >= 0 ? "diff-pos" : "diff-neg"}>
                          {row.setDiff > 0 ? "+" : ""}
                          {row.setDiff}
                        </td>
                        <td>
                          <strong>{row.points}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      <p className="hint">
        Matchs terminés · 2 pts par victoire · Départage auto : points → sets avg global → GA
        global. Égalité parfaite : à trancher manuellement.
      </p>
    </main>
  );
}
