import { APP_NAME } from "../config/brand";
import { DISCOVERY_LAUNCH_MESSAGE } from "../auth/billing";
import { resolveWelcomeName } from "../utils/greeting";
import { ContactActivationCta } from "./ContactActivationCta";

type Props = {
  displayName?: string;
  userEmail?: string;
  onCreateFocus?: () => void;
};

export function DiscoveryWelcome({ displayName, userEmail, onCreateFocus }: Props) {
  const welcomeName = resolveWelcomeName(displayName, userEmail);

  return (
    <section className="panel discovery-welcome">
      <span className="discovery-banner-badge">Mode découverte</span>
      <h2>
        Bienvenue{welcomeName ? `, ${welcomeName}` : ""}
      </h2>
      <p className="discovery-welcome-lead">
        Explorez {APP_NAME} librement : créez un tournoi, ajoutez vos équipes, préparez poules
        et feuilles FDME. Le direct s&apos;active quand vous êtes prêt.
      </p>

      <div className="discovery-welcome-grid">
        <div className="discovery-welcome-col discovery-welcome-col--ok">
          <h3>Inclus maintenant</h3>
          <ul>
            <li>Créer et configurer un ou plusieurs tournois</li>
            <li>Équipes, logos, poules, planning</li>
            <li>Feuilles de match et parcours admin</li>
            <li>Aperçu de la table de marque</li>
          </ul>
        </div>
        <div className="discovery-welcome-col discovery-welcome-col--locked">
          <h3>Après abonnement</h3>
          <ul>
            <li>Chrono et marquage en live</li>
            <li>Tablette et codes table de marque</li>
            <li>Écrans publics et suivi spectateur</li>
            <li>Export PDF officiel</li>
          </ul>
        </div>
      </div>

      <p className="hint discovery-welcome-note">{DISCOVERY_LAUNCH_MESSAGE}</p>

      <ContactActivationCta
        userName={displayName}
        userEmail={userEmail}
      />

      {onCreateFocus && (
        <div className="discovery-welcome-actions">
          <button type="button" className="btn btn-outline" onClick={onCreateFocus}>
            Créer mon tournoi de test
          </button>
        </div>
      )}
    </section>
  );
}
