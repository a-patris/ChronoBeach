import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  activationRequestStatusLabel,
  countPendingRequests,
  subscribeActivationRequests,
  updateActivationRequestStatus,
  type ActivationRequest,
  type ActivationRequestStatus,
} from "../auth/activationRequests";
import { updateUserBillingStatus } from "../auth/userService";

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function ActivationRequestsPanel() {
  const { user, isPlatformStaff } = useAuth();
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlatformStaff) return;
    setLoading(true);
    return subscribeActivationRequests((next) => {
      setRequests(next);
      setLoading(false);
    });
  }, [isPlatformStaff]);

  if (!isPlatformStaff) return null;

  const pendingCount = countPendingRequests(requests);

  const setStatus = async (request: ActivationRequest, status: ActivationRequestStatus) => {
    if (!user) return;
    setBusyId(request.id);
    try {
      await updateActivationRequestStatus(request.id, status, user.uid);
    } finally {
      setBusyId(null);
    }
  };

  const approveAndActivate = async (request: ActivationRequest) => {
    if (!user) return;
    setBusyId(request.id);
    try {
      await updateUserBillingStatus(request.uid, "active");
      await updateActivationRequestStatus(request.id, "approved", user.uid);
    } catch {
      window.alert("Impossible d'approuver — vérifiez les permissions Firestore.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel activation-requests-panel">
      <div className="activation-requests-header">
        <h2>
          Demandes d&apos;activation
          {pendingCount > 0 && (
            <span className="activation-requests-badge">{pendingCount}</span>
          )}
        </h2>
        <p className="hint">
          Les organisateurs en mode découverte envoient leur demande ici. Vous recevez aussi un
          e-mail si la Cloud Function est déployée.
        </p>
      </div>

      {loading ? (
        <p className="hint">Chargement…</p>
      ) : requests.length === 0 ? (
        <p className="hint">Aucune demande pour l&apos;instant.</p>
      ) : (
        <ul className="activation-requests-list">
          {requests.map((r) => (
            <li
              key={r.id}
              className={`activation-request-card activation-request-card--${r.status}`}
            >
              <div className="activation-request-main">
                <strong>{r.displayName}</strong>
                <span className="hint">{r.email}</span>
                {r.tournamentName && (
                  <span className="hint">Tournoi : {r.tournamentName}</span>
                )}
                {r.message && <p className="activation-request-message">{r.message}</p>}
                <p className="hint activation-request-meta">
                  {formatWhen(r.createdAt)} · {activationRequestStatusLabel(r.status)}
                </p>
              </div>
              {r.status === "pending" && (
                <div className="activation-request-actions">
                  <button
                    type="button"
                    className="btn btn-accent btn-sm"
                    disabled={busyId === r.id}
                    onClick={() => void approveAndActivate(r)}
                  >
                    Activer le compte
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busyId === r.id}
                    onClick={() => void setStatus(r, "contacted")}
                  >
                    Marquer contacté
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busyId === r.id}
                    onClick={() => void setStatus(r, "dismissed")}
                  >
                    Archiver
                  </button>
                </div>
              )}
              {r.status === "contacted" && (
                <div className="activation-request-actions">
                  <button
                    type="button"
                    className="btn btn-accent btn-sm"
                    disabled={busyId === r.id}
                    onClick={() => void approveAndActivate(r)}
                  >
                    Activer le compte
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busyId === r.id}
                    onClick={() => void setStatus(r, "dismissed")}
                  >
                    Archiver
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Badge pour la nav — nombre de demandes en attente. */
export function usePendingActivationCount(): number {
  const { isPlatformStaff } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isPlatformStaff) return;
    return subscribeActivationRequests((requests) => {
      setCount(countPendingRequests(requests));
    });
  }, [isPlatformStaff]);

  return count;
}
