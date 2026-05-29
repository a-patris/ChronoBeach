import { LoginForm } from "./LoginForm";

export function LoginPage() {
  return (
    <main className="page panel auth-page">
      <h2>Connexion organisateur</h2>
      <p className="hint auth-page-lead">
        Accès réservé aux comptes autorisés (table de marque, admin, configuration).
      </p>
      <LoginForm />
      <p className="hint auth-page-foot">
        Les comptes sont créés par le super administrateur ChronoBeach.
      </p>
    </main>
  );
}
