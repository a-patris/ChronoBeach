import { Navigate } from "react-router-dom";
import { loadTournament } from "../storage";
import { legacyRedirectPath, type TournamentSegment } from "../routes/paths";

type Props = {
  segment: TournamentSegment;
  preserveSearch?: boolean;
};

/** Redirige /admin, /display… vers /t/:id/… */
export function LegacyRouteRedirect({ segment, preserveSearch }: Props) {
  const local = loadTournament();
  if (!local) return <Navigate to="/setup" replace />;
  const search = preserveSearch ? window.location.search : "";
  return <Navigate to={legacyRedirectPath(segment, local.id, search)} replace />;
}
