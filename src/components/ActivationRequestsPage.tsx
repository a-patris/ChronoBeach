import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  subscribeActivationRequests,
  type ActivationRequest,
  type ActivationRequestStatus,
} from "../auth/activationRequests";
import { ActivationRequestsList } from "./ActivationRequestsList";

type FilterKey = "pending" | "contacted" | "approved" | "dismissed" | "all";

const FILTERS: { key: FilterKey; label: string; statuses?: ActivationRequestStatus[] }[] = [
  { key: "pending", label: "En attente", statuses: ["pending"] },
  { key: "contacted", label: "Contactées", statuses: ["contacted"] },
  { key: "approved", label: "Activées", statuses: ["approved"] },
  { key: "dismissed", label: "Archivées", statuses: ["dismissed"] },
  { key: "all", label: "Toutes" },
];

function countForFilter(requests: ActivationRequest[], filter: FilterKey): number {
  const def = FILTERS.find((f) => f.key === filter);
  if (!def?.statuses) return requests.length;
  return requests.filter((r) => def.statuses!.includes(r.status)).length;
}

export function ActivationRequestsPage() {
  const { authRequired, profileLoading, isPlatformStaff } = useAuth();
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("pending");

  useEffect(() => {
    if (!isPlatformStaff) return;
    setLoading(true);
    return subscribeActivationRequests((next) => {
      setRequests(next);
      setLoading(false);
    });
  }, [isPlatformStaff]);

  const filtered = useMemo(() => {
    const def = FILTERS.find((f) => f.key === filter);
    if (!def?.statuses) return requests;
    return requests.filter((r) => def.statuses!.includes(r.status));
  }, [requests, filter]);

  if (!authRequired) {
    return <Navigate to="/" replace />;
  }

  if (profileLoading) {
    return (
      <main className="page panel">
        <p className="hint">Chargement…</p>
      </main>
    );
  }

  if (!isPlatformStaff) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="page home-page home-page--activation-requests">
      <section className="panel">
        <Link to="/" className="hint home-back-link">
          ← Accueil
        </Link>
        <div className="activation-requests-page-header">
          <div>
            <h1>Demandes d&apos;activation</h1>
            <p className="hint">
              Organisateurs en mode découverte — vous recevez aussi un e-mail à chaque nouvelle
              demande.
            </p>
          </div>
          <Link to="/users" className="btn btn-outline btn-sm">
            Gestion des comptes
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="activation-requests-filters" role="tablist" aria-label="Filtrer les demandes">
          {FILTERS.map((f) => {
            const count = countForFilter(requests, f.key);
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`activation-requests-filter${active ? " activation-requests-filter--active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {count > 0 && (
                  <span className={`activation-requests-filter-count${f.key === "pending" && count > 0 ? " activation-requests-filter-count--alert" : ""}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filter !== "all" && !loading && (
          <p className="hint activation-requests-filter-hint">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {loading ? (
          <p className="hint">Chargement…</p>
        ) : (
          <ActivationRequestsList
            requests={filtered}
            busyId={busyId}
            onBusyChange={setBusyId}
          />
        )}
      </section>
    </main>
  );
}
