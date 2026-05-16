import { useState } from "react";
import { Link } from "react-router-dom";
import { clearTournament } from "../storage";
import { useTournamentContext } from "../context/TournamentContext";
import { createMatch, createTeam, uid } from "../utils";
import type { Pool, Tournament } from "../types";
import { TeamLogoUpload } from "./TeamLogoUpload";

export function TournamentSetup() {
  const { tournament, setTournament } = useTournamentContext();
  const [name, setName] = useState(tournament?.name ?? "");
  const [teamName, setTeamName] = useState("");
  const [poolName, setPoolName] = useState("");

  const createNew = () => {
    if (!name.trim()) return;
    const t: Tournament = {
      id: uid(),
      name: name.trim(),
      teams: [],
      pools: [],
      matches: [],
    };
    setTournament(t);
  };

  const addTeam = () => {
    if (!tournament || !teamName.trim()) return;
    const defaultPoolId = tournament.pools[0]?.id;
    setTournament({
      ...tournament,
      teams: [...tournament.teams, { ...createTeam(teamName), poolId: defaultPoolId }],
    });
    setTeamName("");
  };

  const addPool = () => {
    if (!tournament || !poolName.trim()) return;
    const pool: Pool = { id: uid(), name: poolName.trim() };
    setTournament({
      ...tournament,
      pools: [...tournament.pools, pool],
    });
    setPoolName("");
  };

  const removePool = (poolId: string) => {
    if (!tournament) return;
    setTournament({
      ...tournament,
      pools: tournament.pools.filter((p) => p.id !== poolId),
      teams: tournament.teams.map((t) =>
        t.poolId === poolId ? { ...t, poolId: undefined } : t,
      ),
      matches: tournament.matches.map((m) =>
        m.poolId === poolId ? { ...m, poolId: undefined } : m,
      ),
    });
  };

  const setTeamPool = (teamId: string, poolId: string) => {
    if (!tournament) return;
    setTournament({
      ...tournament,
      teams: tournament.teams.map((t) =>
        t.id === teamId ? { ...t, poolId: poolId || undefined } : t,
      ),
    });
  };

  const removeTeam = (id: string) => {
    if (!tournament) return;
    setTournament({
      ...tournament,
      teams: tournament.teams.filter((t) => t.id !== id),
      matches: tournament.matches.filter((m) => m.teamAId !== id && m.teamBId !== id),
    });
  };

  const updateTeamLogo = (teamId: string, logo: string | undefined) => {
    if (!tournament) return;
    setTournament({
      ...tournament,
      teams: tournament.teams.map((t) => (t.id === teamId ? { ...t, logo } : t)),
    });
  };

  const resetAll = () => {
    if (confirm("Effacer tout le tournoi ?")) {
      clearTournament();
      setTournament(null);
      setName("");
    }
  };

  if (!tournament) {
    return (
      <main className="page setup-page">
        <h1>Nouveau tournoi</h1>
        <div className="setup-form panel">
          <label>
            Nom du tournoi
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Beach Handball Open 2026"
            />
          </label>
          <button type="button" className="btn btn-accent btn-lg" onClick={createNew}>
            Créer le tournoi
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page setup-page">
      <header className="page-header">
        <h1>{tournament.name}</h1>
        <div className="header-actions">
          <Link to="/classement" className="btn btn-outline">
            Classement
          </Link>
          <Link to="/admin" className="btn btn-accent">
            Table de marque →
          </Link>
          <button type="button" className="btn btn-outline" onClick={resetAll}>
            Réinitialiser tout
          </button>
        </div>
      </header>

      <section className="panel">
        <h2>Poules</h2>
        <p className="hint">Créez des poules puis assignez chaque équipe à une poule.</p>
        <div className="add-team-row">
          <input
            value={poolName}
            onChange={(e) => setPoolName(e.target.value)}
            placeholder="Nom de la poule (ex. Poule A)"
            onKeyDown={(e) => e.key === "Enter" && addPool()}
          />
          <button type="button" className="btn btn-accent" onClick={addPool}>
            Ajouter poule
          </button>
        </div>
        <ul className="pool-list">
          {tournament.pools.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removePool(p.id)}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Équipes ({tournament.teams.length})</h2>
        <div className="add-team-row">
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Nom de l'équipe"
            onKeyDown={(e) => e.key === "Enter" && addTeam()}
          />
          <button type="button" className="btn btn-accent" onClick={addTeam}>
            Ajouter
          </button>
        </div>
        <ul className="team-list">
          {tournament.teams.map((t) => (
            <li key={t.id} className="team-list-item">
              <div className="team-list-main">
                <span className="team-list-name">{t.name}</span>
                {tournament.pools.length > 0 && (
                  <select
                    value={t.poolId ?? ""}
                    onChange={(e) => setTeamPool(t.id, e.target.value)}
                    className="pool-select"
                  >
                    <option value="">— Poule —</option>
                    {tournament.pools.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
                <TeamLogoUpload team={t} onChange={(logo) => updateTeamLogo(t.id, logo)} />
              </div>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeTeam(t.id)}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Créer un match</h2>
        {tournament.teams.length < 2 ? (
          <p className="hint">Ajoutez au moins 2 équipes.</p>
        ) : (
          <CreateMatchForm tournament={tournament} setTournament={setTournament} />
        )}
      </section>

      <p className="hint">
        {tournament.matches.length} match(s) ·{" "}
        <Link to="/classement">Voir le classement</Link> ·{" "}
        <Link to="/admin">Table de marque</Link>
      </p>
    </main>
  );
}

function CreateMatchForm({
  tournament,
  setTournament,
}: {
  tournament: Tournament;
  setTournament: (t: Tournament) => void;
}) {
  const defaultPool = tournament.pools[0]?.id ?? "";
  const [poolId, setPoolId] = useState(defaultPool);
  const poolTeams = poolId
    ? tournament.teams.filter((t) => t.poolId === poolId)
    : tournament.teams;
  const [a, setA] = useState(poolTeams[0]?.id ?? "");
  const [b, setB] = useState(poolTeams[1]?.id ?? "");

  const add = () => {
    if (!a || !b || a === b) return;
    const match = createMatch(a, b, 600, poolId || undefined);
    setTournament({
      ...tournament,
      matches: [...tournament.matches, match],
      activeMatchId: tournament.activeMatchId ?? match.id,
    });
  };

  return (
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
      <select value={a} onChange={(e) => setA(e.target.value)}>
        {poolTeams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <span>vs</span>
      <select value={b} onChange={(e) => setB(e.target.value)}>
        {poolTeams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-accent" onClick={add}>
        Créer match
      </button>
    </div>
  );
}
