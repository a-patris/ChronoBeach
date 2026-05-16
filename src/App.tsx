import { Navigate, Route, Routes, Link, useLocation } from "react-router-dom";
import { TournamentProvider } from "./context/TournamentContext";
import { TournamentSetup } from "./components/TournamentSetup";
import { AdminPanel } from "./components/AdminPanel";
import { PublicDisplay } from "./components/PublicDisplay";
import { StandingsPage } from "./components/StandingsPage";

function NavBar() {
  const location = useLocation();
  const isDisplay = location.pathname === "/display";

  if (isDisplay) return null;

  return (
    <nav className="app-nav">
      <Link to="/setup" className="nav-brand">
        ChronoBeach
      </Link>
      <div className="nav-links">
        <Link to="/setup">Configuration</Link>
        <Link to="/admin">Table de marque</Link>
        <Link to="/classement">Classement</Link>
        <Link to="/display?fs=1" target="_blank" rel="noopener noreferrer">
          Écran public ↗
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  const location = useLocation();
  const isDisplay = location.pathname === "/display";

  return (
    <TournamentProvider>
      <div className={`app-shell${isDisplay ? " app-shell--display" : ""}`}>
        <NavBar />
        <Routes>
          <Route path="/" element={<Navigate to="/setup" replace />} />
          <Route path="/setup" element={<TournamentSetup />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/display" element={<PublicDisplay />} />
          <Route path="/classement" element={<StandingsPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </div>
    </TournamentProvider>
  );
}
