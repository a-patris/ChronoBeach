import { Link } from "react-router-dom";

export function JoinHubPage() {
  return (
    <main className="page home-page">
      <section className="panel join-hub">
        <Link to="/" className="hint home-back-link">
          ← Accueil
        </Link>
        <h1>Rejoindre un tournoi</h1>
        <p className="hint home-lead">
          Choisissez votre mode d&apos;accès. Les codes vous sont communiqués par le responsable
          du tournoi sur place.
        </p>

        <div className="join-hub-grid">
          <Link to="/join/marker" className="join-hub-card">
            <span className="join-hub-icon">📋</span>
            <h2>Table de marque</h2>
            <p className="hint">
              Tablette ou PC pour chronométrer et saisir le score d&apos;un match.
            </p>
            <span className="join-hub-cta">Entrer le code arbitre →</span>
          </Link>

          <Link to="/join/spectator" className="join-hub-card join-hub-card--spectator">
            <span className="join-hub-icon">👀</span>
            <h2>Spectateur</h2>
            <p className="hint">
              Suivre un match à distance (buette, gradins) — choix du terrain si plusieurs matchs.
            </p>
            <span className="join-hub-cta">Entrer le code public →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
