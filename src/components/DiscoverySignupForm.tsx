import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { createDiscoverySignupErrorMessage } from "../auth/userService";
import { APP_NAME } from "../config/brand";

type Props = {
  onSuccess?: () => void;
};

export function DiscoverySignupForm({ onSuccess }: Props) {
  const { signUpDiscovery } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUpDiscovery(email, password, displayName);
      onSuccess?.();
    } catch (err) {
      const code = err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
      if (code) {
        setError(createDiscoverySignupErrorMessage(code));
      } else if (err instanceof Error && err.message.includes("permission")) {
        setError(
          "Inscription impossible — publiez les règles Firestore mises à jour (inscription découverte).",
        );
      } else {
        setError(err instanceof Error ? err.message : "Inscription impossible.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form discovery-signup-form" onSubmit={handleSubmit}>
      <label className="auth-field">
        <span>Club / organisateur</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ex. Beach Handball Club Marseille"
          required
        />
      </label>
      <label className="auth-field">
        <span>E-mail</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="auth-field">
        <span>Mot de passe</span>
        <input
          type="password"
          autoComplete="new-password"
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

      <button type="submit" className="btn btn-accent auth-submit" disabled={submitting}>
        {submitting ? "Création…" : `Démarrer la sandbox ${APP_NAME}`}
      </button>
      <p className="hint discovery-signup-foot">
        Compte gratuit en mode découverte — configurez un tournoi test, sans lancer le direct.
      </p>
    </form>
  );
}
