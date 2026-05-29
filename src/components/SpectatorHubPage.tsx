import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTournamentRepository } from "../data/tournamentRepository";
import { spectatorWatchPath, tournamentPath } from "../routes/paths";
import type { Match, Tournament } from "../types";
import { getTeam, matchStatusLabel } from "../utils";
import { tournamentLiveEnabled } from "../auth/billing";
import { LiveLaunchGate } from "./LiveLaunchGate";

function matchTitle(tournament: Tournament, match: Match): string {
  const a = getTeam(tournament, match.teamAId)?.name ?? "?";
  const b = getTeam(tournament, match.teamBId)?.name ?? "?";
  return [match.courtLabel, match.label, `${a} vs ${b}`].filter(Boolean).join(" · ");
}

function MatchSpectatorCard({
  tournament,
  match,
}: {
  tournament: Tournament;
  match: Match;
}) {
  const live =
    match.status === "running" ||
    match.status === "paused" ||
    (match.mode === "shootout" && match.status !== "finished");

  return (
    <Link
      to={spectatorWatchPath(tournament.id, match.id)}
      className={`spectator-match-card${live ? " spectator-match-card--live" : ""}`}
    >
      {live && <span className="spectator-live-badge">En cours</span>}
      <h3>{matchTitle(tournament, match)}</h3>
      <p className="spectator-match-score">
        {match.scoreA} – {match.scoreB}
        {match.scheduledTime && ` · ${match.scheduledTime}`}
      </p>
      <p className="hint">{matchStatusLabel(match.status)}</p>
      <span className="join-hub-cta">Suivre ce match →</span>
    </Link>
  );
}

export function SpectatorHubPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    const repo = getTournamentRepository();
    void repo.load(tournamentId).then((t) => {
      setTournament(t);
      setLoading(false);
    });
    return repo.subscribe(tournamentId, (remote) => {
      if (remote) setTournament(remote);
    });
  }, [tournamentId]);

  if (loading) {
    return (
      <main className="page panel">
        <p className="hint">Chargement…</p>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="page panel">
        <h2>Tournoi introuvable</h2>
        <Link to="/join/spectator" className="btn btn-outline">
          Réessayer
        </Link>
      </main>
    );
  }

  if (!tournamentLiveEnabled(tournament)) {
    return (
      <LiveLaunchGate
        tournamentName={tournament.name}
        variant="public"
        backTo="/join/spectator"
        backLabel="Changer de code"
      />
    );
  }

  const live = tournament.matches.filter(
    (m) =>
      m.status === "running" ||
      m.status === "paused" ||
      (m.mode === "shootout" && m.status !== "finished"),
  );
  const others = tournament.matches.filter(
    (m) =>
      m.status !== "running" &&
      m.status !== "paused" &&
      !(m.mode === "shootout" && m.status !== "finished") &&
      m.status !== "finished",
  );
  const finished = tournament.matches.filter((m) => m.status === "finished");

  return (
    <main className="page spectator-hub">
      <header className="panel spectator-hub-header">
        <Link to="/join/spectator" className="hint home-back-link">
          ← Changer de code
        </Link>
        <h1>{tournament.name}</h1>
        <p className="hint">Choisissez le match à suivre.</p>
        <Link to={tournamentPath(tournament.id, "classement")} className="btn btn-outline btn-sm">
          Voir le classement
        </Link>
      </header>

      {live.length > 0 && (
        <section className="panel">
          <h2>En direct</h2>
          <div className="spectator-match-grid">
            {live.map((m) => (
              <MatchSpectatorCard key={m.id} tournament={tournament} match={m} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="panel">
          <h2>À venir</h2>
          <div className="spectator-match-grid">
            {others.map((m) => (
              <MatchSpectatorCard key={m.id} tournament={tournament} match={m} />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="panel">
          <h2>Terminés</h2>
          <div className="spectator-match-grid">
            {finished.map((m) => (
              <MatchSpectatorCard key={m.id} tournament={tournament} match={m} />
            ))}
          </div>
        </section>
      )}

      {tournament.matches.length === 0 && (
        <p className="hint panel">Aucun match programmé pour l&apos;instant.</p>
      )}
    </main>
  );
}
