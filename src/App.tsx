import { Navigate, Outlet, Route, Routes, Link, useLocation, useParams } from "react-router-dom";
import { TournamentProvider } from "./context/TournamentContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { TournamentSetup } from "./components/TournamentSetup";
import { AdminPanel } from "./components/AdminPanel";
import { TabletPanel } from "./components/TabletPanel";
import { TabletJoin } from "./components/TabletJoin";
import { PublicDisplay } from "./components/PublicDisplay";
import { StandingsPage } from "./components/StandingsPage";
import { LegacyRouteRedirect } from "./components/LegacyRouteRedirect";
import { TournamentScopeGuard } from "./components/TournamentScopeGuard";
import { loadTournament } from "./storage";
import { tournamentPath } from "./routes/paths";
import {
  openPublicDisplayForMatch,
  requestDisplayFullscreen,
} from "./utils/displayWindow";
import { useTournamentContext } from "./context/TournamentContext";
import { AuthProvider } from "./context/AuthContext";
import { AuthGate } from "./components/AuthGate";
import { useAuth } from "./context/AuthContext";
import { HomePage } from "./components/HomePage";
import { UserManagementPage } from "./components/UserManagementPage";
import { ActivationRequestsPage } from "./components/ActivationRequestsPage";
import { usePendingActivationCount } from "./components/ActivationRequestsPanel";
import { JoinHubPage } from "./components/JoinHubPage";
import { MarkerJoinPage } from "./components/MarkerJoinPage";
import { SpectatorJoinPage } from "./components/SpectatorJoinPage";
import { SpectatorHubPage } from "./components/SpectatorHubPage";
import { SpectatorMobileDisplay } from "./components/SpectatorMobileDisplay";
import { isFirebaseConfigured } from "./config/firebase";
import { APP_NAME } from "./config/brand";
import { useRemoteTournamentSync } from "./hooks/useRemoteTournamentSync";

function NavBar() {
  const location = useLocation();
  const { tournament } = useTournamentContext();
  const { authRequired, user, signOutUser, canManageUsers, isPlatformStaff } = useAuth();
  const pendingRequests = usePendingActivationCount();
  const isKiosk =
    location.pathname.includes("/display") || location.pathname.includes("/tablet/");

  if (isKiosk || location.pathname.startsWith("/t/") || location.pathname === "/") return null;

  return (
    <nav className="app-nav">
      <Link to="/" className="nav-brand">
        {APP_NAME}
      </Link>
      <div className="nav-links">
        <Link to="/">Accueil</Link>
        {tournament && (
          <>
            <Link to={tournamentPath(tournament.id, "admin")}>Table de marque</Link>
            <Link to={tournamentPath(tournament.id, "tablet")}>Tablette</Link>
            <Link to={tournamentPath(tournament.id, "classement")}>Classement</Link>
          </>
        )}
        {authRequired && user && (
          <>
            {canManageUsers && (
              <>
                <Link to="/activation-requests" className="nav-users-link">
                  Demandes
                  {isPlatformStaff && pendingRequests > 0 && (
                    <span className="nav-badge">{pendingRequests}</span>
                  )}
                </Link>
                <Link to="/users">Comptes</Link>
              </>
            )}
            <button type="button" className="nav-link-btn" onClick={() => void signOutUser()}>
              Déconnexion
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function ScopedNavBar() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { tournament } = useTournamentContext();
  const { authRequired, user, signOutUser } = useAuth();
  const location = useLocation();
  const isKiosk =
    location.pathname.includes("/display") || /\/tablet\/[^/]+/.test(location.pathname);

  if (isKiosk || !tournamentId) return null;

  return (
    <nav className="app-nav app-nav--scoped">
      <Link to={tournamentPath(tournamentId, "admin")} className="nav-brand">
        {tournament?.name ?? APP_NAME}
      </Link>
      <div className="nav-links">
        <Link to="/">Accueil</Link>
        <Link to={tournamentPath(tournamentId, "setup")}>Config</Link>
        <Link to={tournamentPath(tournamentId, "admin")}>Admin</Link>
        <Link to={tournamentPath(tournamentId, "tablet")}>Tablette</Link>
        <Link to={tournamentPath(tournamentId, "classement")}>Classement</Link>
        {tournament?.activeMatchId && (
          <>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() =>
                openPublicDisplayForMatch(tournamentId, tournament.activeMatchId!)
              }
            >
              Écran actif ↗
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => requestDisplayFullscreen(tournament.activeMatchId!)}
            >
              FS écran actif
            </button>
          </>
        )}
        {authRequired && user && (
          <button type="button" className="nav-link-btn" onClick={() => void signOutUser()}>
            Déconnexion
          </button>
        )}
      </div>
    </nav>
  );
}

function TournamentScopedLayout() {
  const location = useLocation();
  const isDisplay = location.pathname.includes("/display");
  useRemoteTournamentSync();

  return (
    <WorkspaceProvider>
      <TournamentScopeGuard>
        {!isDisplay && <ScopedNavBar />}
        <div className={`app-shell${isDisplay ? " app-shell--display" : ""}`}>
          <Outlet />
        </div>
      </TournamentScopeGuard>
    </WorkspaceProvider>
  );
}

function TabletRoute() {
  const { tournament } = useTournamentContext();
  const { matchId } = useParams<{ matchId?: string }>();

  if (!tournament) return null;
  if (!matchId) return <TabletJoin tournament={tournament} />;
  return <TabletPanel />;
}

function SetupIndexRedirect() {
  if (isFirebaseConfigured()) return <Navigate to="/" replace />;
  const local = loadTournament();
  if (local) return <Navigate to={tournamentPath(local.id, "setup")} replace />;
  return <TournamentSetup />;
}

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <AuthGate>
          <div className="app-root">
            <NavBar />
            <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/activation-requests" element={<ActivationRequestsPage />} />
          <Route path="/join" element={<JoinHubPage />} />
          <Route path="/join/marker" element={<MarkerJoinPage />} />
          <Route path="/join/spectator" element={<SpectatorJoinPage />} />
          <Route path="/watch/:tournamentId/:matchId" element={<SpectatorMobileDisplay />} />
          <Route path="/watch/:tournamentId" element={<SpectatorHubPage />} />
          <Route path="/setup" element={<SetupIndexRedirect />} />

          <Route path="/t/:tournamentId" element={<TournamentScopedLayout />}>
            <Route path="setup" element={<TournamentSetup />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="tablet" element={<TabletRoute />} />
            <Route path="tablet/:matchId" element={<TabletRoute />} />
            <Route path="display/:matchId" element={<PublicDisplay />} />
            <Route path="display" element={<PublicDisplay />} />
            <Route path="classement" element={<StandingsPage />} />
            <Route index element={<Navigate to="admin" replace />} />
          </Route>

          <Route path="/admin" element={<LegacyRouteRedirect segment="admin" />} />
          <Route path="/tablet" element={<LegacyRouteRedirect segment="tablet" />} />
          <Route
            path="/display"
            element={<LegacyRouteRedirect segment="display" preserveSearch />}
          />
          <Route path="/classement" element={<LegacyRouteRedirect segment="classement" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </AuthGate>
      </TournamentProvider>
    </AuthProvider>
  );
}
