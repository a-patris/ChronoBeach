import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { joinWithMarkerCode } from "../auth/markerSession";
import { tournamentPath } from "../routes/paths";

export function MarkerJoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tournamentId = await joinWithMarkerCode(code);
      navigate(tournamentPath(tournamentId, "tablet"), { replace: true });
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
      <h1>Table de marque</h1>
      <p className="hint auth-page-lead">
        Saisissez le code fourni par le responsable du tournoi pour piloter un match sur cette
        tablette ou ce PC.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Code table de marque</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex. ABC 123"
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
          {submitting ? "Connexion…" : "Rejoindre le tournoi"}
        </button>
      </form>

      <p className="hint auth-page-foot">
        Compte organisateur ?{" "}
        <Link to="/">Connectez-vous</Link> depuis l&apos;accueil.
      </p>
    </main>
  );
}
