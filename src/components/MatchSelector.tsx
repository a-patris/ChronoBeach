import { useEffect, useState } from "react";
import type { Match, Tournament } from "../types";
import { categorizeMatches, getTeam, matchStatusLabel } from "../utils";

type Props = {
  tournament: Tournament;
  onSetActive: (matchId: string) => void;
  onCreateMatch: (teamAId: string, teamBId: string, poolId?: string) => void;
  onDeleteMatch: (matchId: string) => void;
};

function MatchList({
  title,
  matches,
  tournament,
  activeId,
  onSetActive,
}: {
  title: string;
  matches: Match[];
  tournament: Tournament;
  activeId?: string;
  onSetActive: (id: string) => void;
}) {
  if (!matches.length) return null;

  return (
    <div className="match-list-block">
      <h4>{title}</h4>
      <ul className="match-list">
        {matches.map((m) => {
          const a = getTeam(tournament, m.teamAId)?.name ?? "?";
          const b = getTeam(tournament, m.teamBId)?.name ?? "?";
          const pool = tournament.pools.find((p) => p.id === m.poolId)?.name;
          const isActive = m.id === activeId;
          return (
            <li key={m.id} className={isActive ? "active" : ""}>
              <button type="button" className="match-list-btn" onClick={() => onSetActive(m.id)}>
                <span>
                  {a} vs {b}
                </span>
                <span className="match-meta">
                  {pool && `${pool} · `}
                  {m.scoreA}-{m.scoreB} · {matchStatusLabel(m.status)}
                  {m.mode === "shootout" && " · SO"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MatchSelector({
  tournament,
  onSetActive,
  onCreateMatch,
  onDeleteMatch,
}: Props) {
  const { upcoming, live, finished } = categorizeMatches(tournament.matches);
  const defaultPool = tournament.pools[0]?.id ?? "";
  const [poolId, setPoolId] = useState(defaultPool);

  const poolTeams = poolId
    ? tournament.teams.filter((t) => t.poolId === poolId)
    : tournament.teams;

  const [teamA, setTeamA] = useState(poolTeams[0]?.id ?? "");
  const [teamB, setTeamB] = useState(poolTeams[1]?.id ?? "");

  useEffect(() => {
    if (!poolTeams.find((t) => t.id === teamA)) setTeamA(poolTeams[0]?.id ?? "");
    if (!poolTeams.find((t) => t.id === teamB)) setTeamB(poolTeams[1]?.id ?? "");
  }, [poolId, poolTeams, teamA, teamB]);

  return (
    <section className="panel match-selector">
      <h2>Matchs</h2>

      {tournament.teams.length >= 2 && (
        <div className="create-match">
          {tournament.pools.length > 0 && (
            <select value={poolId} onChange={(e) => setPoolId(e.target.value)}>
              {tournament.pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <select value={teamA} onChange={(e) => setTeamA(e.target.value)}>
            {poolTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span>vs</span>
          <select value={teamB} onChange={(e) => setTeamB(e.target.value)}>
            {poolTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-accent"
            disabled={!teamA || !teamB || teamA === teamB}
            onClick={() => onCreateMatch(teamA, teamB, poolId || undefined)}
          >
            Créer match
          </button>
        </div>
      )}

      <MatchList
        title="En cours"
        matches={live}
        tournament={tournament}
        activeId={tournament.activeMatchId}
        onSetActive={onSetActive}
      />
      <MatchList
        title="À venir"
        matches={upcoming}
        tournament={tournament}
        activeId={tournament.activeMatchId}
        onSetActive={onSetActive}
      />
      <MatchList
        title="Terminés"
        matches={finished}
        tournament={tournament}
        activeId={tournament.activeMatchId}
        onSetActive={onSetActive}
      />

      {tournament.activeMatchId && (
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onDeleteMatch(tournament.activeMatchId!)}
        >
          Supprimer le match actif
        </button>
      )}
    </section>
  );
}
