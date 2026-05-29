import { useState } from "react";
import { Link } from "react-router-dom";
import { clearTournament } from "../storage";
import { useTournamentContext } from "../context/TournamentContext";
import { generatePoolSchedule } from "../schedule";
import { createMatch, createTeam, fileToTeamLogo, sortMatchesBySchedule, uid } from "../utils";
import { autoRecallTeams } from "../teamRecall";
import type { Pool, Tournament, TournamentEventType } from "../types";
import { MatchFormFields } from "./MatchFormFields";
import { TeamLogo } from "./TeamLogo";
import { TeamLogoUpload } from "./TeamLogoUpload";
import { TEAM_LOGO_UPLOAD_HINT } from "../teamLogo";
import {
  applyFormatPatch,
  TournamentFormatFields,
} from "./TournamentFormatFields";
import { getTournamentEventType, getTournamentRosterLimit, normalizeTournamentSettings, OFFICIAL_ROSTER_SIZE } from "../tournamentConfig";
import { tournamentPath } from "../routes/paths";
import { TournamentAccessPanel } from "./TournamentAccessPanel";

export function TournamentSetup() {
  const { tournament, setTournament } = useTournamentContext();
  const [name, setName] = useState(tournament?.name ?? "");
  const [teamName, setTeamName] = useState("");
  const [poolName, setPoolName] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState<string | undefined>();
  const [newTeamLogoLoading, setNewTeamLogoLoading] = useState(false);
  const [newTeamLogoError, setNewTeamLogoError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<TournamentEventType>("official");
  const [rosterSize, setRosterSize] = useState(OFFICIAL_ROSTER_SIZE);

  const createNew = () => {
    if (!name.trim()) return;
    const format = normalizeTournamentSettings({ eventType, rosterSize });
    const t: Tournament = {
      id: uid(),
      name: name.trim(),
      teams: [],
      pools: [],
      matches: [],
      ...format,
    };
    setTournament(t);
  };

  const addTeam = () => {
    if (!tournament || !teamName.trim()) return;
    const defaultPoolId = tournament.pools[0]?.id;
    const team = { ...createTeam(teamName), poolId: defaultPoolId };
    if (newTeamLogo) team.logo = newTeamLogo;
    setTournament({
      ...tournament,
      teams: [...tournament.teams, team],
    });
    setTeamName("");
    setNewTeamLogo(undefined);
    setNewTeamLogoError(null);
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
          <TournamentFormatFields
            eventType={eventType}
            rosterSize={rosterSize}
            onEventTypeChange={setEventType}
            onRosterSizeChange={setRosterSize}
          />
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
          <Link to={tournamentPath(tournament.id, "classement")} className="btn btn-outline">
            Classement
          </Link>
          <Link to={tournamentPath(tournament.id, "admin")} className="btn btn-accent">
            Table de marque →
          </Link>
          <button type="button" className="btn btn-outline" onClick={resetAll}>
            Réinitialiser tout
          </button>
        </div>
      </header>

      <TournamentAccessPanel tournament={tournament} />

      <section className="panel setup-options">
        <h2>Options tournoi</h2>
        <TournamentFormatFields
          eventType={getTournamentEventType(tournament)}
          rosterSize={getTournamentRosterLimit(tournament)}
          onEventTypeChange={(type) =>
            setTournament(
              applyFormatPatch(
                tournament,
                type,
                type === "official" ? OFFICIAL_ROSTER_SIZE : getTournamentRosterLimit(tournament),
              ),
            )
          }
          onRosterSizeChange={(size) =>
            setTournament(applyFormatPatch(tournament, "friendly", size))
          }
          compact
        />
      </section>

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
        <div className="add-team-row add-team-row--with-logo">
          <TeamLogo
            team={newTeamLogo ? { name: teamName || "?", logo: newTeamLogo } : { name: teamName || "?", logo: undefined }}
            size="md"
          />
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Nom de l'équipe"
            onKeyDown={(e) => e.key === "Enter" && addTeam()}
          />
          <label className="btn btn-outline btn-sm add-team-logo-btn">
            {newTeamLogoLoading ? "…" : newTeamLogo ? "Changer logo" : "Logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setNewTeamLogoError(null);
                setNewTeamLogoLoading(true);
                try {
                  setNewTeamLogo(await fileToTeamLogo(file));
                } catch (err) {
                  setNewTeamLogoError(err instanceof Error ? err.message : "Erreur logo");
                } finally {
                  setNewTeamLogoLoading(false);
                }
              }}
            />
          </label>
          {newTeamLogo && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setNewTeamLogo(undefined)}>
              Sans logo
            </button>
          )}
          <button type="button" className="btn btn-accent" onClick={addTeam}>
            Ajouter
          </button>
        </div>
        {newTeamLogoError && <p className="logo-error">{newTeamLogoError}</p>}
        <p className="hint team-logo-hint">{TEAM_LOGO_UPLOAD_HINT}</p>
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
        <h2>Programme des matchs</h2>
        <p className="hint">
          Générez les matchs de poule (round robin). Avec 2 poules de 3 équipes, le planning
          V&apos;Hand (horaires 09H30–12H50) est appliqué automatiquement. Phase finale : créez
          les matchs à la main avec un titre (Finale, Grande finale…).
        </p>
        {tournament.pools.length > 0 && (
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => {
              const created = generatePoolSchedule(tournament);
              if (!created.length) {
                alert("Tous les matchs de poule existent déjà, ou les poules sont incomplètes.");
                return;
              }
              setTournament({
                ...tournament,
                matches: sortMatchesBySchedule([...tournament.matches, ...created]),
              });
            }}
          >
            Générer matchs de poule
          </button>
        )}
        {tournament.matches.length > 0 && (
          <ul className="match-schedule-preview">
            {sortMatchesBySchedule(tournament.matches).map((m) => {
              const a = tournament.teams.find((t) => t.id === m.teamAId)?.name ?? "?";
              const b = tournament.teams.find((t) => t.id === m.teamBId)?.name ?? "?";
              return (
                <li key={m.id}>
                  {m.scheduledTime && <span className="match-time">{m.scheduledTime}</span>}
                  {m.label && <span className="match-tag">{m.label}</span>}
                  {a} vs {b}
                </li>
              );
            })}
          </ul>
        )}
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
        <Link to={tournamentPath(tournament.id, "classement")}>Voir le classement</Link> ·{" "}
        <Link to={tournamentPath(tournament.id, "admin")}>Table de marque</Link>
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
  const [label, setLabel] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const add = () => {
    if (!a || !b || a === b) return;
    const maxOrder = tournament.matches.reduce((max, m) => Math.max(max, m.sortOrder ?? 0), 0);
    const match = autoRecallTeams(
      tournament,
      createMatch(a, b, 600, {
        poolId: poolId || undefined,
        label: label || undefined,
        scheduledTime: scheduledTime || undefined,
        sortOrder: maxOrder + 1,
      }),
    );
    setTournament({
      ...tournament,
      matches: sortMatchesBySchedule([...tournament.matches, match]),
      activeMatchId: tournament.activeMatchId ?? match.id,
    });
    setLabel("");
    setScheduledTime("");
  };

  return (
    <div className="create-match-block">
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
      <MatchFormFields
        label={label}
        scheduledTime={scheduledTime}
        onLabelChange={setLabel}
        onScheduledTimeChange={setScheduledTime}
      />
    </div>
  );
}
