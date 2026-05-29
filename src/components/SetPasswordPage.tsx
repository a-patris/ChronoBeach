import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { createPasswordChangeErrorMessage } from "../auth/userService";

export function SetPasswordPage() {
  const { profile, completePasswordSetup, signOutUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("8 caractères minimum.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await completePasswordSetup(password);
    } catch (err) {
      const code = err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
      setError(createPasswordChangeErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page panel auth-page">
      <h2>Choisissez votre mot de passe</h2>
      <p className="hint auth-page-lead">
        Bonjour {profile?.displayName ?? profile?.email} — remplacez le mot de passe temporaire
        avant d&apos;accéder à ChronoBeach.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Nouveau mot de passe</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label className="auth-field">
          <span>Confirmer</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-accent auth-submit" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Continuer"}
        </button>
      </form>

      <button
        type="button"
        className="btn btn-outline auth-signout-link"
        onClick={() => void signOutUser()}
      >
        Se déconnecter
      </button>
    </main>
  );
}
