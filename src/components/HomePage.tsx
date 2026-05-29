import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTournamentContext } from "../context/TournamentContext";
import { LoginForm } from "./LoginForm";
import { DiscoverySignupForm } from "./DiscoverySignupForm";
import { listTournamentSummaries, type TournamentSummary } from "../auth/userService";
import { generateUniqueAccessPair } from "../auth/accessCodes";
import { loadTournament } from "../storage";
import { roleLabel } from "../auth/roles";
import { billingStatusLabel } from "../auth/billing";
import { APP_NAME, APP_SHORT_TAGLINE, APP_TAGLINE } from "../config/brand";
import { tournamentPath } from "../routes/paths";
import { uid } from "../utils";
import { normalizeTournamentSettings, OFFICIAL_ROSTER_SIZE } from "../tournamentConfig";
import type { Tournament } from "../types";
import { DiscoveryWelcome } from "./DiscoveryWelcome";
import { usePendingActivationCount } from "./ActivationRequestsPanel";
import { AccountDeletePanel } from "./AccountDeletePanel";

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
  const createFormRef = useRef<HTMLDivElement>(null);
  const {
    user,
    profile,
    role,
    loading,
    profileLoading,
    authRequired,
    accessDenied,
    canManageUsers,
    isDiscoveryMode,
    isPlatformStaff,
    canGoLive,
    signOutUser,
  } = useAuth();
  const pendingRequests = usePendingActivationCount();
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

  const focusCreateForm = () => {
    createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    createFormRef.current?.querySelector("input")?.focus();
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
          <p className="home-kicker">{APP_NAME}</p>
          <h1>{APP_SHORT_TAGLINE}</h1>
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
      <main className="home-page home-page--guest">
        <section className="home-hero panel">
          <p className="home-kicker">{APP_NAME}</p>
          <h1>{APP_SHORT_TAGLINE}</h1>
          <p className="hint home-lead">{APP_TAGLINE}</p>
        </section>

        <div className="home-auth-grid">
          <section className="panel home-sandbox" id="sandbox">
            <span className="discovery-banner-badge">Gratuit</span>
            <h2>Découvrir l&apos;app</h2>
            <p className="hint home-sandbox-lead">
              Créez un compte sandbox en 30 secondes : équipes, poules, feuilles FDME, aperçu
              table de marque. Le direct (chrono, écrans, spectateurs) s&apos;active après
              abonnement.
            </p>
            <DiscoverySignupForm />
          </section>

          <section className="panel home-login">
            <h2>Déjà client ?</h2>
            <p className="hint">Connectez-vous avec le compte fourni par {APP_NAME}.</p>
            <LoginForm />
          </section>
        </div>

        <section className="panel join-hub join-hub--inline">
          <h2>Sur le terrain (code organisateur)</h2>
          <p className="hint">Vous avez reçu un code sur place ?</p>
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
        <p className="hint">Chargement…</p>
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
      {isDiscoveryMode ? (
        <DiscoveryWelcome
          displayName={profile?.displayName ?? user.email ?? undefined}
          userEmail={user.email ?? undefined}
          onCreateFocus={focusCreateForm}
        />
      ) : (
        <section className="home-dashboard-header panel">
          <div>
            <p className="home-kicker">Espace organisateur</p>
            <h1>Bonjour, {profile?.displayName ?? user.email}</h1>
            <p className="hint">
              {roleLabel(role)}
              {profile?.billingStatus && profile.billingStatus !== "active" && (
                <> · {billingStatusLabel(profile.billingStatus)}</>
              )}
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
              <Link to="/users" className="btn btn-outline nav-users-link">
                Gérer les comptes
                {isPlatformStaff && pendingRequests > 0 && (
                  <span className="nav-badge">{pendingRequests}</span>
                )}
              </Link>
            )}
            <button type="button" className="btn btn-outline" onClick={() => void signOutUser()}>
              Déconnexion
            </button>
          </div>
        </section>
      )}

      {isDiscoveryMode && (
        <section className="home-dashboard-header panel home-dashboard-header--compact">
          <p className="hint">
            Connecté en tant que <strong>{profile?.displayName ?? user.email}</strong>
          </p>
          <div className="home-header-actions">
            {canManageUsers && (
              <Link to="/users" className="btn btn-outline btn-sm nav-users-link">
                Admin
                {isPlatformStaff && pendingRequests > 0 && (
                  <span className="nav-badge">{pendingRequests}</span>
                )}
              </Link>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void signOutUser()}>
              Déconnexion
            </button>
          </div>
        </section>
      )}

      <section className="panel home-create" ref={createFormRef}>
        <h2>{isDiscoveryMode ? "Votre tournoi de test" : "Nouveau tournoi"}</h2>
        {isDiscoveryMode && (
          <p className="hint">
            Commencez ici : vous pourrez tout configurer sans lancer le direct.
          </p>
        )}
        <form className="home-create-form" onSubmit={handleCreateTournament}>
          <input
            type="text"
            placeholder="Nom du tournoi (ex. Open Beach 2026)"
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-accent" disabled={creating}>
            {creating ? "Création…" : isDiscoveryMode ? "Explorer la configuration" : "Créer et configurer"}
          </button>
        </form>
      </section>

      {canGoLive && (
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
      )}

      <section className="panel home-tournaments">
        <h2>{isDiscoveryMode ? "Tournois en préparation" : "Mes tournois"}</h2>
        {loadingTournaments ? (
          <p className="hint">Chargement des tournois…</p>
        ) : summaries.length === 0 ? (
          <p className="hint">
            {isDiscoveryMode
              ? "Aucun tournoi pour l'instant — créez-en un ci-dessus pour découvrir l'outil."
              : "Aucun tournoi en ligne pour l'instant."}
          </p>
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
                  {isDiscoveryMode ? (
                    <>
                      <Link to={tournamentPath(t.id, "setup")} className="btn btn-accent">
                        Continuer la config
                      </Link>
                      <Link to={tournamentPath(t.id, "admin")} className="btn btn-outline">
                        Aperçu table de marque
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to={tournamentPath(t.id, "admin")} className="btn btn-accent">
                        Admin
                      </Link>
                      <Link to={tournamentPath(t.id, "setup")} className="btn btn-outline">
                        Config
                      </Link>
                      <Link to={tournamentPath(t.id, "tablet")} className="btn btn-outline">
                        Tablette
                      </Link>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AccountDeletePanel />
    </main>
  );
}
