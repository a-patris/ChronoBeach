import { useAuth } from "../context/AuthContext";
import {
  activationRequestStatusLabel,
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

type Props = {
  requests: ActivationRequest[];
  busyId: string | null;
  onBusyChange: (id: string | null) => void;
};

export function ActivationRequestsList({ requests, busyId, onBusyChange }: Props) {
  const { user } = useAuth();

  const setStatus = async (request: ActivationRequest, status: ActivationRequestStatus) => {
    if (!user) return;
    onBusyChange(request.id);
    try {
      await updateActivationRequestStatus(request.id, status, user.uid);
    } finally {
      onBusyChange(null);
    }
  };

  const approveAndActivate = async (request: ActivationRequest) => {
    if (!user) return;
    onBusyChange(request.id);
    try {
      await updateUserBillingStatus(request.uid, "active");
      await updateActivationRequestStatus(request.id, "approved", user.uid);
    } catch {
      window.alert("Impossible d'approuver — vérifiez les permissions Firestore.");
    } finally {
      onBusyChange(null);
    }
  };

  if (requests.length === 0) {
    return <p className="hint">Aucune demande dans cette catégorie.</p>;
  }

  return (
    <ul className="activation-requests-list">
      {requests.map((r) => (
        <li
          key={r.id}
          className={`activation-request-card activation-request-card--${r.status}`}
        >
          <div className="activation-request-main">
            <strong>{r.displayName}</strong>
            <span className="hint">{r.email}</span>
            {r.tournamentName && <span className="hint">Tournoi : {r.tournamentName}</span>}
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
  );
}
