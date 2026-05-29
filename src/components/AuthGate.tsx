import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasMarkerAccess } from "../auth/markerSession";
import { LoginPage } from "./LoginPage";
import { SetPasswordPage } from "./SetPasswordPage";

type Props = {
  children: React.ReactNode;
};

/** Accueil, join, watch, display et classement publics ; tablette via code marker. */
export function AuthGate({ children }: Props) {
  const {
    user,
    loading,
    profileLoading,
    authRequired,
    accessDenied,
    role,
    mustChangePassword,
    signOutUser,
  } = useAuth();
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isJoin = location.pathname.startsWith("/join");
  const isWatch = location.pathname.startsWith("/watch");
  const isPublicDisplay = /\/display(\/|$)/.test(location.pathname);
  const isPublicStandings = /\/classement(\/|$)/.test(location.pathname);
  const isPublicReadOnly = isPublicDisplay || isPublicStandings;

  const tabletMatch = location.pathname.match(/^\/t\/([^/]+)\/tablet/);
  const markerTabletAccess = tabletMatch ? hasMarkerAccess(tabletMatch[1]) : false;

  if (!authRequired) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <main className="page panel">
        <p className="hint">Vérification de la session…</p>
      </main>
    );
  }

  if (user && !user.isAnonymous) {
    if (profileLoading) {
      return (
        <main className="page panel">
          <p className="hint">Chargement du profil…</p>
        </main>
      );
    }
    if (mustChangePassword) {
      return <SetPasswordPage />;
    }
  }

  if (isHome || isJoin || isWatch || isPublicReadOnly) {
    return <>{children}</>;
  }

  if (markerTabletAccess) {
    return <>{children}</>;
  }

  if (!user) {
    return <LoginPage />;
  }

  if (accessDenied || !role) {
    return (
      <main className="page panel home-denied">
        <h2>Accès refusé</h2>
        <p className="hint">{accessDenied ?? "Compte non autorisé."}</p>
        <p className="hint">
          Table de marque sur tablette ?{" "}
          <a href="/join/marker">Utilisez le code tournoi</a>.
        </p>
        <button type="button" className="btn btn-outline" onClick={() => void signOutUser()}>
          Se déconnecter
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
