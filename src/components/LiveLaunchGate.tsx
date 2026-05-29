import { Link } from "react-router-dom";
import { APP_NAME } from "../config/brand";
import { DISCOVERY_BANNER_BODY, LIVE_BLOCKED_PUBLIC_MESSAGE } from "../auth/billing";
import { ContactActivationCta } from "./ContactActivationCta";

type Props = {
  tournamentName?: string;
  /** Organisateur connecté en mode découverte vs spectateur public. */
  variant?: "organizer" | "public";
  backTo?: string;
  backLabel?: string;
  userName?: string;
  userEmail?: string;
};

export function LiveLaunchGate({
  tournamentName,
  variant = "public",
  backTo = "/",
  backLabel = "Retour",
  userName,
  userEmail,
}: Props) {
  const isOrganizer = variant === "organizer";

  return (
    <main className="live-launch-gate">
      <div className="live-launch-gate-card panel">
        <span className="discovery-banner-badge">Découverte</span>
        <h1>{tournamentName ?? APP_NAME}</h1>
        <h2>{isOrganizer ? "Mode découverte" : "Direct non disponible"}</h2>
        <p>{isOrganizer ? DISCOVERY_BANNER_BODY : LIVE_BLOCKED_PUBLIC_MESSAGE}</p>
        {isOrganizer && (
          <ContactActivationCta
            userName={userName}
            userEmail={userEmail}
            tournamentName={tournamentName}
            variant="compact"
          />
        )}
        <Link to={backTo} className="btn btn-outline">
          {backLabel}
        </Link>
      </div>
    </main>
  );
}
