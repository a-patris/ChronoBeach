import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resolveSpectatorTournamentId } from "../auth/markerSession";

export function SpectatorJoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tournamentId = await resolveSpectatorTournamentId(code);
      navigate(`/watch/${tournamentId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page panel auth-page join-code-page">
      <Link to="/join" className="hint home-back-link">
        ← Retour
      </Link>
      <h1>Suivi spectateur</h1>
      <p className="hint auth-page-lead">
        Entrez le code affiché sur le site ou communiqué par l&apos;organisation pour suivre les
        matchs en direct — idéal si vous vous éloignez du terrain.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Code spectateur</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex. XYZ 789"
            autoComplete="off"
            autoCapitalize="characters"
            required
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-accent auth-submit" disabled={submitting}>
          {submitting ? "Vérification…" : "Voir les matchs"}
        </button>
      </form>
    </main>
  );
}
