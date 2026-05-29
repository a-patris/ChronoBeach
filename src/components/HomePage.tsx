import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTournamentContext } from "../context/TournamentContext";
import { LoginForm } from "./LoginForm";
import { listTournamentSummaries, type TournamentSummary } from "../auth/userService";
import { generateUniqueAccessPair } from "../auth/accessCodes";
import { loadTournament } from "../storage";
import { roleLabel } from "../auth/roles";
import { tournamentPath } from "../routes/paths";
import { uid } from "../utils";
import { normalizeTournamentSettings, OFFICIAL_ROSTER_SIZE } from "../tournamentConfig";
import type { Tournament } from "../types";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function HomePage() {
  const navigate = useNavigate();
  const { user, profile, role, loading, profileLoading, authRequired, accessDenied, canManageUsers, signOutUser } =
    useAuth();
  const { tournament, setTournament } = useTournamentContext();
  const [summaries, setSummaries] = useState<TournamentSummary[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authRequired || !user || !role || accessDenied) return;

    setLoadingTournaments(true);
    void listTournamentSummaries(user.uid, role)
      .then(setSummaries)
      .catch(() => setSummaries([]))
      .finally(() => setLoadingTournaments(false));
  }, [authRequired, user, role, accessDenied]);

  const handleCreateTournament = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim() || !user) return;

    setCreating(true);
    const format = normalizeTournamentSettings({
      eventType: "official",
      rosterSize: OFFICIAL_ROSTER_SIZE,
    });
    const t: Tournament = {
      id: uid(),
      name: newTournamentName.trim(),
      teams: [],
      pools: [],
      matches: [],
      ownerUid: user.uid,
      managerUid: user.uid,
      createdAt: new Date().toISOString(),
      access: generateUniqueAccessPair(),
      ...format,
    };
    setTournament(t);
    setCreating(false);
    navigate(tournamentPath(t.id, "setup"));
  };

  if (authRequired && loading) {
    return (
      <main className="page panel">
        <p className="hint">Chargement…</p>
      </main>
    );
  }

  if (!authRequired) {
    const local = loadTournament();
    return (
      <main className="home-page">
        <section className="home-hero panel">
          <p className="home-kicker">ChronoBeach</p>
          <h1>Table de marque beach handball</h1>
          <p className="hint home-lead">
            Mode local — sans compte. Configurez un tournoi sur cet appareil.
          </p>
          <div className="home-actions">
            {local ? (
              <Link to={tournamentPath(local.id, "admin")} className="btn btn-accent">
                Reprendre « {local.name} »
              </Link>
            ) : (
              <Link to="/setup" className="btn btn-accent">
                Nouveau tournoi
              </Link>
            )}
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="home-page">
        <section className="home-hero panel">
          <p className="home-kicker">ChronoBeach</p>
          <h1>Table de marque beach handball</h1>
          <p className="hint home-lead">
            Chronomètre, scores, feuilles FDME et écrans publics synchronisés pour vos
            tournois officiels et amicaux.
          </p>
        </section>
        <section className="home-login panel">
          <h2>Connexion organisateur</h2>
          <p className="hint">Accès réservé aux comptes autorisés.</p>
          <LoginForm />
        </section>
        <section className="panel join-hub join-hub--inline">
          <h2>Sur place sans compte ?</h2>
          <div className="join-hub-grid join-hub-grid--compact">
            <Link to="/join/marker" className="btn btn-outline">
              Code table de marque
            </Link>
            <Link to="/join/spectator" className="btn btn-outline">
              Code spectateur
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (profileLoading) {
    return (
      <main className="page panel">
        <p className="hint">Chargement du profil…</p>
      </main>
    );
  }

  if (accessDenied || !role) {
    return (
      <main className="page panel home-denied">
        <h2>Accès refusé</h2>
        <p className="hint">{accessDenied ?? "Compte non autorisé."}</p>
        <button type="button" className="btn btn-outline" onClick={() => void signOutUser()}>
          Se déconnecter
        </button>
      </main>
    );
  }

  return (
    <main className="home-page home-page--dashboard">
      <section className="home-dashboard-header panel">
        <div>
          <p className="home-kicker">Espace organisateur</p>
          <h1>Bonjour, {profile?.displayName ?? user.email}</h1>
          <p className="hint">
            {roleLabel(role)}
            {tournament && (
              <>
                {" "}
                · session locale : <strong>{tournament.name}</strong>
              </>
            )}
          </p>
        </div>
        <div className="home-header-actions">
          {canManageUsers && (
            <Link to="/users" className="btn btn-outline">
              Gérer les comptes
            </Link>
          )}
          <button type="button" className="btn btn-outline" onClick={() => void signOutUser()}>
            Déconnexion
          </button>
        </div>
      </section>

      <section className="panel home-create">
        <h2>Nouveau tournoi</h2>
        <form className="home-create-form" onSubmit={handleCreateTournament}>
          <input
            type="text"
            placeholder="Nom du tournoi (ex. Open Beach 2026)"
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-accent" disabled={creating}>
            {creating ? "Création…" : "Créer et configurer"}
          </button>
        </form>
      </section>

      <section className="panel join-hub join-hub--inline">
        <h2>Accès rapide sur le terrain</h2>
        <p className="hint">Partagez les codes depuis la configuration du tournoi.</p>
        <div className="join-hub-grid join-hub-grid--compact">
          <Link to="/join/marker" className="btn btn-outline">
            Table de marque (code)
          </Link>
          <Link to="/join/spectator" className="btn btn-outline">
            Spectateurs (code)
          </Link>
        </div>
      </section>

      <section className="panel home-tournaments">
        <h2>Mes tournois</h2>
        {loadingTournaments ? (
          <p className="hint">Chargement des tournois…</p>
        ) : summaries.length === 0 ? (
          <p className="hint">Aucun tournoi en ligne pour l&apos;instant.</p>
        ) : (
          <ul className="home-tournament-list">
            {summaries.map((t) => (
              <li key={t.id} className="home-tournament-card">
                <div>
                  <h3>{t.name}</h3>
                  <p className="hint">
                    {t.matchCount} match{t.matchCount !== 1 ? "s" : ""} · créé le{" "}
                    {formatDate(t.createdAt)}
                  </p>
                </div>
                <div className="home-tournament-links">
                  <Link to={tournamentPath(t.id, "admin")} className="btn btn-accent">
                    Admin
                  </Link>
                  <Link to={tournamentPath(t.id, "setup")} className="btn btn-outline">
                    Config
                  </Link>
                  <Link to={tournamentPath(t.id, "tablet")} className="btn btn-outline">
                    Tablette
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
