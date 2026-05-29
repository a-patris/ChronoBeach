import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  countPendingRequests,
  subscribeActivationRequests,
} from "../auth/activationRequests";

/** Lien compact vers la page dédiée — utilisé sur /users si besoin. */
export function ActivationRequestsLink() {
  const { isPlatformStaff } = useAuth();
  const pending = usePendingActivationCount();

  if (!isPlatformStaff) return null;

  return (
    <Link to="/activation-requests" className="activation-requests-link-card">
      <span>Demandes d&apos;activation</span>
      {pending > 0 && <span className="activation-requests-badge">{pending}</span>}
      <span className="hint">Voir et traiter →</span>
    </Link>
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
