import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTournamentContext } from "../context/TournamentContext";
import {
  computeGoalkeeperStandings,
  computePlayerStandings,
  findPlayer,
  playerStatsLabel,
  playerTeamName,
} from "../playerStandings";
import { computeStandings } from "../standings";
import { playerDisplayName } from "../matchSheet";
import { getTeam } from "../utils";
import { tournamentPath } from "../routes/paths";
import { TeamLogo } from "./TeamLogo";

type Tab = "teams" | "players" | "gk";

export function StandingsPage() {
  const { tournament } = useTournamentContext();
  const [tab, setTab] = useState<Tab>("teams");

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
        <Link to={tournamentPath(tournament.id, "admin")} className="btn btn-outline">
          ← Table de marque
        </Link>
      </header>

      <nav className="standings-tabs">
        <button
          type="button"
          className={`standings-tab${tab === "teams" ? " standings-tab--active" : ""}`}
          onClick={() => setTab("teams")}
        >
          Équipes
        </button>
        <button
          type="button"
          className={`standings-tab${tab === "players" ? " standings-tab--active" : ""}`}
          onClick={() => setTab("players")}
        >
          Joueurs
        </button>
        <button
          type="button"
          className={`standings-tab${tab === "gk" ? " standings-tab--active" : ""}`}
          onClick={() => setTab("gk")}
        >
          GK / Spécialistes
        </button>
      </nav>

      {pools.map((pool) => {
        const poolId = pool.id === "_all" ? undefined : pool.id;

        return (
          <section key={pool.id} className="panel standings-block">
            <h2>{pool.name}</h2>

            {tab === "teams" && <TeamStandingsTable tournament={tournament} poolId={poolId} />}
            {tab === "players" && <PlayerStandingsTable tournament={tournament} poolId={poolId} />}
            {tab === "gk" && <GkStandingsTable tournament={tournament} poolId={poolId} />}
          </section>
        );
      })}
    </main>
  );
}

function TeamStandingsTable({
  tournament,
  poolId,
}: {
  tournament: NonNullable<ReturnType<typeof useTournamentContext>["tournament"]>;
  poolId?: string;
}) {
  const rows = computeStandings(tournament, poolId);

  if (rows.length === 0) {
    return <p className="hint">Aucune équipe dans cette poule.</p>;
  }

  return (
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
          <th title="Sets de période gagnés">Sets G</th>
          <th title="Sets de période perdus">Sets P</th>
          <th title="Sets shoot-out">SO</th>
          <th title="Différentiel sets">Set +/-</th>
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
              <td className="pts-cell">{row.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PlayerStandingsTable({
  tournament,
  poolId,
}: {
  tournament: NonNullable<ReturnType<typeof useTournamentContext>["tournament"]>;
  poolId?: string;
}) {
  const rows = computePlayerStandings(tournament, poolId);

  if (rows.length === 0) {
    return (
      <p className="hint">
        Aucune stat joueur — marquez les actions avec un joueur sélectionné à la table de marque.
      </p>
    );
  }

  return (
    <table className="standings-table player-stats-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Joueur</th>
          <th>Équipe</th>
          <th title="Buts marqués">Buts</th>
          <th title="Points marqués">Pts</th>
          <th title="Tirs ratés">Tirs</th>
          <th title="Buts shoot-out">SO</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const player = findPlayer(tournament, row.teamId, row.playerId);
          const team = getTeam(tournament, row.teamId);
          return (
            <tr key={`${row.teamId}:${row.playerId}`}>
              <td>{i + 1}</td>
              <td className="standings-team">
                {player ? `#${player.number} ${playerDisplayName(player)}` : "?"}
              </td>
              <td>
                <TeamLogo team={team} size="xs" />
                {playerTeamName(tournament, row.teamId)}
              </td>
              <td>{row.goals}</td>
              <td className="pts-cell">{row.points}</td>
              <td>{row.shotsMissed}</td>
              <td>{row.shootoutGoals}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GkStandingsTable({
  tournament,
  poolId,
}: {
  tournament: NonNullable<ReturnType<typeof useTournamentContext>["tournament"]>;
  poolId?: string;
}) {
  const rows = computeGoalkeeperStandings(tournament, poolId);

  if (rows.length === 0) {
    return (
      <p className="hint">
        Aucune stat GK — cochez GK/S sur la feuille et enregistrez les arrêts à la table.
      </p>
    );
  }

  return (
    <table className="standings-table player-stats-table">
      <thead>
        <tr>
          <th>#</th>
          <th>GK / Spécialiste</th>
          <th>Équipe</th>
          <th title="Arrêts">Arrêts</th>
          <th title="Buts marqués">Buts</th>
          <th title="Points">Pts</th>
          <th title="Tirs ratés">Tirs</th>
          <th title="Buts shoot-out">SO</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const player = findPlayer(tournament, row.teamId, row.playerId);
          const team = getTeam(tournament, row.teamId);
          return (
            <tr key={`${row.teamId}:${row.playerId}`}>
              <td>{i + 1}</td>
              <td className="standings-team">
                {player ? `#${player.number} ${playerDisplayName(player)}` : playerStatsLabel(tournament, row)}
              </td>
              <td>
                <TeamLogo team={team} size="xs" />
                {playerTeamName(tournament, row.teamId)}
              </td>
              <td className="pts-cell">{row.saves}</td>
              <td>{row.goals}</td>
              <td>{row.points}</td>
              <td>{row.shotsMissed}</td>
              <td>{row.shootoutGoals}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
