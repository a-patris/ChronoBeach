import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createUserAccount,
  createUserCreationErrorMessage,
  createAccountDeletionErrorMessage,
  listUserProfiles,
  updateUserBillingStatus,
  type BillingStatus,
} from "../auth/userService";
import {
  canCreateRole,
  canDeleteUser,
  creatableRoles,
  roleLabel,
  type UserProfile,
  type UserRole,
} from "../auth/roles";
import {
  BILLING_STATUSES,
  billingStatusLabel,
  normalizeBillingStatus,
} from "../auth/billing";
import { ActivationRequestsLink } from "./ActivationRequestsPanel";

export function UserManagementPage() {
  const { user, role, profileLoading, authRequired, canManageUsers, isSuperAdmin, deleteAccount } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("tournament_manager");
  const [newBillingStatus, setNewBillingStatus] = useState<BillingStatus>("discovery");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const allowedRoles = creatableRoles(role);

  useEffect(() => {
    if (!canManageUsers || !user) return;
    setLoading(true);
    void listUserProfiles()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [canManageUsers, user]);

  useEffect(() => {
    if (allowedRoles.length > 0 && !allowedRoles.includes(newRole)) {
      setNewRole(allowedRoles[0]!);
    }
  }, [allowedRoles, newRole]);

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

  if (!canManageUsers) {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !canCreateRole(role, newRole)) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const billingStatus =
        newRole === "tournament_manager" ? newBillingStatus : ("active" as BillingStatus);
      const created = await createUserAccount(
        user.uid,
        email,
        password,
        displayName,
        newRole,
        billingStatus,
      );
      setUsers((prev) =>
        [...prev, created].sort((a, b) => a.displayName.localeCompare(b.displayName, "fr")),
      );
      setEmail("");
      setPassword("");
      setDisplayName("");
      setSuccess(
        `Compte ${roleLabel(newRole)} créé pour ${created.email}. La personne choisira son mot de passe à la première connexion.`,
      );
    } catch (err) {
      const code = err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
      setError(createUserCreationErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBillingChange = async (uid: string, billingStatus: BillingStatus) => {
    if (!isSuperAdmin) return;
    setUpdatingUid(uid);
    try {
      await updateUserBillingStatus(uid, billingStatus);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, billingStatus } : u)),
      );
    } catch {
      window.alert("Impossible de mettre à jour le statut commercial.");
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleDeleteUser = async (target: UserProfile) => {
    if (!user || !canDeleteUser(role, user.uid, target)) return;
    const ok = window.confirm(
      `Supprimer définitivement le compte « ${target.displayName} » (${target.email}) ?\n\nTournois et données associées seront effacés.`,
    );
    if (!ok) return;

    setDeletingUid(target.uid);
    try {
      await deleteAccount(target.uid);
      setUsers((prev) => prev.filter((u) => u.uid !== target.uid));
      setSuccess(`Compte ${target.email} supprimé.`);
      setError(null);
    } catch (err) {
      const code =
        err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
      setError(createAccountDeletionErrorMessage(code));
    } finally {
      setDeletingUid(null);
    }
  };

  return (
    <main className="page home-page home-page--users">
      <section className="panel user-mgmt-intro">
        <Link to="/" className="hint home-back-link">
          ← Accueil
        </Link>
        <h1>Gestion des comptes</h1>
        <p className="hint">
          {role === "super_admin"
            ? "Créez des administrateurs ou des responsables de tournoi. Le statut « Découverte » permet de configurer sans lancer le direct."
            : "Créez des responsables de tournoi pour vos événements."}
        </p>
        <ActivationRequestsLink />
      </section>

      <section className="panel">
        <h2>Nouveau compte</h2>
        <form className="auth-form user-create-form" onSubmit={handleCreate}>
          <label className="auth-field">
            <span>Rôle</span>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              disabled={allowedRoles.length <= 1}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
          {isSuperAdmin && newRole === "tournament_manager" && (
            <label className="auth-field">
              <span>Statut commercial</span>
              <select
                value={newBillingStatus}
                onChange={(e) =>
                  setNewBillingStatus(normalizeBillingStatus(e.target.value))
                }
              >
                {BILLING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {billingStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="auth-field">
            <span>Nom affiché</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex. Marie Dupont"
            />
          </label>
          <label className="auth-field">
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Mot de passe temporaire</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" className="btn btn-accent" disabled={submitting}>
            {submitting ? "Création…" : "Créer le compte"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Comptes existants ({users.length})</h2>
        {loading ? (
          <p className="hint">Chargement…</p>
        ) : (
          <ul className="user-list">
            {users.map((u) => (
              <li key={u.uid} className="user-list-item">
                <div>
                  <strong>{u.displayName}</strong>
                  <span className="hint user-list-email">{u.email}</span>
                </div>
                <div className="user-list-meta">
                  <span className="user-role-badge">{roleLabel(u.role)}</span>
                  {isSuperAdmin && u.role === "tournament_manager" ? (
                    <select
                      className="user-billing-select"
                      value={u.billingStatus ?? "discovery"}
                      disabled={updatingUid === u.uid || deletingUid === u.uid}
                      onChange={(e) =>
                        void handleBillingChange(u.uid, normalizeBillingStatus(e.target.value))
                      }
                    >
                      {BILLING_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {billingStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    u.billingStatus && (
                      <span className="user-billing-badge">
                        {billingStatusLabel(u.billingStatus)}
                      </span>
                    )
                  )}
                  {user && canDeleteUser(role, user.uid, u) && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm btn-danger-outline"
                      disabled={deletingUid === u.uid}
                      onClick={() => void handleDeleteUser(u)}
                    >
                      {deletingUid === u.uid ? "Suppression…" : "Supprimer"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
