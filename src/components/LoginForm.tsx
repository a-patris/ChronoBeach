import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou mot de passe incorrect.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    case "auth/invalid-email":
      return "Adresse e-mail invalide.";
    default:
      return "Connexion impossible. Vérifiez vos identifiants.";
  }
}

type Props = {
  compact?: boolean;
  onSuccess?: () => void;
};

export function LoginForm({ compact = false, onSuccess }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      onSuccess?.();
    } catch (err) {
      const code = err instanceof Error && "code" in err ? String((err as { code: string }).code) : "";
      setError(authErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={`auth-form${compact ? " auth-form--compact" : ""}`} onSubmit={handleSubmit}>
      <label className="auth-field">
        <span>E-mail</span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="auth-field">
        <span>Mot de passe</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-accent auth-submit" disabled={submitting}>
        {submitting ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
