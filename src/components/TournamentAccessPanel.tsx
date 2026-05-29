import { useState } from "react";
import { useTournamentContext } from "../context/TournamentContext";
import { useAuth } from "../context/AuthContext";
import {
  canManageTournament,
  isPlatformStaff,
} from "../auth/roles";
import { useGoLiveAccess } from "../hooks/useGoLiveAccess";
import {
  formatAccessCode,
  regenerateTournamentAccess,
} from "../auth/accessCodes";
import { isFirebaseConfigured } from "../config/firebase";
import { ContactActivationCta } from "./ContactActivationCta";
import type { Tournament } from "../types";

type Props = {
  tournament: Tournament;
};

export function TournamentAccessPanel({ tournament }: Props) {
  const { setTournament } = useTournamentContext();
  const { user, role } = useAuth();
  const { canGoLive } = useGoLiveAccess(tournament);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!isFirebaseConfigured() || !tournament.access) return null;

  const canManage = canManageTournament(
    role,
    user?.uid,
    tournament.managerUid ?? tournament.ownerUid,
  );
  if (!canManage && !isPlatformStaff(role)) return null;

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const regenerate = async () => {
    if (
      !window.confirm(
        "Régénérer les codes ? Les anciens liens / codes ne fonctionneront plus.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const next = await regenerateTournamentAccess(tournament);
      setTournament(next);
    } finally {
      setBusy(false);
    }
  };

  const marker = tournament.access.markerCode;
  const spectator = tournament.access.spectatorCode;
  const origin = window.location.origin;

  return (
    <section className="panel tournament-access-panel">
      <h2>Codes d&apos;accès rapide</h2>
      <p className="hint">
        Partagez ces codes sur place : table de marque (tablette / PC) et suivi spectateur
        (buette, public).
      </p>
      {!canGoLive && (
        <>
          <p className="hint discovery-access-hint" role="status">
            Les codes seront actifs une fois votre abonnement activé. En mode découverte, la
            tablette et le suivi spectateur restent indisponibles.
          </p>
          <ContactActivationCta
            userName={user?.displayName ?? undefined}
            userEmail={user?.email ?? undefined}
            tournamentName={tournament.name}
            tournamentId={tournament.id}
            variant="compact"
          />
        </>
      )}

      <div className="access-code-grid">
        <div className="access-code-card">
          <span className="access-code-label">Table de marque</span>
          <strong className="access-code-value">{formatAccessCode(marker)}</strong>
          <p className="hint access-code-hint">
            Lien : {origin}/join/marker
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void copy("marker", marker)}
          >
            {copied === "marker" ? "Copié !" : "Copier le code"}
          </button>
        </div>

        <div className="access-code-card access-code-card--spectator">
          <span className="access-code-label">Spectateurs</span>
          <strong className="access-code-value">{formatAccessCode(spectator)}</strong>
          <p className="hint access-code-hint">
            Lien : {origin}/join/spectator
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void copy("spectator", spectator)}
          >
            {copied === "spectator" ? "Copié !" : "Copier le code"}
          </button>
        </div>
      </div>

      {canManage && (
        <button
          type="button"
          className="btn btn-outline access-regenerate-btn"
          disabled={busy}
          onClick={() => void regenerate()}
        >
          {busy ? "Régénération…" : "Régénérer les codes"}
        </button>
      )}
    </section>
  );
}
