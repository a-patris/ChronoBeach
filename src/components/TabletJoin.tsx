import { Link } from "react-router-dom";
import type { Match, Tournament } from "../types";
import { getTeam, matchStatusLabel } from "../utils";
import { tournamentPath } from "../routes/paths";

type Props = {
  tournament: Tournament;
};

function matchTitle(tournament: Tournament, match: Match): string {
  const a = getTeam(tournament, match.teamAId)?.name ?? "?";
  const b = getTeam(tournament, match.teamBId)?.name ?? "?";
  const parts = [match.courtLabel, match.label, `${a} vs ${b}`].filter(Boolean);
  return parts.join(" · ");
}

function MatchJoinCard({
  tournament,
  match,
}: {
  tournament: Tournament;
  match: Match;
}) {
  return (
    <Link
      to={tournamentPath(tournament.id, "tablet", match.id)}
      className="tablet-join-card"
    >
      <div className="tablet-join-card-head">
        {match.courtLabel && (
          <span className="tablet-join-court">{match.courtLabel}</span>
        )}
        {match.label && <span className="tablet-join-label">{match.label}</span>}
      </div>
      <p className="tablet-join-title">{matchTitle(tournament, match)}</p>
      <p className="tablet-join-meta">
        {match.scheduledTime && `${match.scheduledTime} · `}
        {match.scoreA}-{match.scoreB} · {matchStatusLabel(match.status)}
        {match.mode === "shootout" && " · SO"}
      </p>
      <span className="tablet-join-action">Rejoindre la table de marque →</span>
    </Link>
  );
}

export function TabletJoin({ tournament }: Props) {
  const { live, upcoming } = (() => {
    const live: Match[] = [];
    const upcoming: Match[] = [];
    for (const m of tournament.matches) {
      if (
        m.status === "running" ||
        m.status === "paused" ||
        (m.mode === "shootout" && m.status !== "finished")
      ) {
        live.push(m);
      } else if (m.status === "ready" && !m.winnerTeamId) {
        upcoming.push(m);
      }
    }
    return { live, upcoming };
  })();

  const list = [...live, ...upcoming];

  return (
    <main className="tablet-join-page">
      <header className="tablet-join-header">
        <h1>{tournament.name}</h1>
        <p className="hint">Choisissez le match à piloter sur cette tablette.</p>
        <Link to={tournamentPath(tournament.id, "admin")} className="tablet-link">
          ← Admin PC
        </Link>
      </header>

      {list.length === 0 ? (
        <p className="hint panel">Aucun match disponible pour le moment.</p>
      ) : (
        <div className="tablet-join-grid">
          {list.map((m) => (
            <MatchJoinCard key={m.id} tournament={tournament} match={m} />
          ))}
        </div>
      )}
    </main>
  );
}
