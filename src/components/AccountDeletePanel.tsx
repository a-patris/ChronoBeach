import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { createAccountDeletionErrorMessage } from "../auth/userService";

export function AccountDeletePanel() {
  const { user, canSelfDeleteAccount, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !canSelfDeleteAccount) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== "SUPPRIMER") return;

    setError(null);
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      const code =
        err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
      setError(createAccountDeletionErrorMessage(code));
      setDeleting(false);
    }
  };

  return (
    <section className="panel account-delete-panel">
      <h2>Supprimer mon compte</h2>
      <p className="hint">
        Cette action est définitive : profil, tournois en ligne et demandes d&apos;activation
        seront effacés.
      </p>

      {!open ? (
        <button type="button" className="btn btn-outline btn-danger-outline" onClick={() => setOpen(true)}>
          Supprimer mon compte
        </button>
      ) : (
        <form className="account-delete-form" onSubmit={handleSubmit}>
          <p className="hint">
            Tapez <strong>SUPPRIMER</strong> pour confirmer la suppression de{" "}
            <strong>{user.email}</strong>.
          </p>
          <label className="auth-field">
            <span>Confirmation</span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              placeholder="SUPPRIMER"
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="account-delete-actions">
            <button
              type="button"
              className="btn btn-outline"
              disabled={deleting}
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={deleting || confirmText.trim().toUpperCase() !== "SUPPRIMER"}
            >
              {deleting ? "Suppression…" : "Confirmer la suppression"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
