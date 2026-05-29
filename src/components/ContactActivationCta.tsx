import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { APP_CONTACT_HINT } from "../config/brand";
import { isFirebaseConfigured } from "../config/firebase";
import {
  buildActivationMailtoUrl,
  getContactEmail,
  getContactFormUrl,
  hasContactChannel,
  type ContactContext,
} from "../config/contact";
import {
  createActivationRequest,
  hasPendingActivationRequest,
} from "../auth/activationRequests";

type Props = ContactContext & {
  variant?: "default" | "compact" | "inline";
};

export function ContactActivationCta({
  userName,
  userEmail,
  tournamentName,
  tournamentId,
  variant = "default",
}: Props) {
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(variant === "default");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [alreadyPending, setAlreadyPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formUrl = getContactFormUrl();
  const email = getContactEmail();
  const ctx = { userName, userEmail, tournamentName };
  const useFirebase = isFirebaseConfigured() && !!user && !user.isAnonymous;

  useEffect(() => {
    if (!useFirebase || !user) return;
    void hasPendingActivationRequest(user.uid).then(setAlreadyPending);
  }, [useFirebase, user]);

  const isCompact = variant === "compact";
  const isInline = variant === "inline";

  if (sent || alreadyPending) {
    return (
      <div className={`contact-activation contact-activation--success${isCompact ? " contact-activation--compact" : ""}`}>
        <p className="contact-activation-success">
          {alreadyPending && !sent
            ? "Demande déjà envoyée — nous revenons vers vous rapidement."
            : "Demande envoyée ! Nous activerons votre compte sous 24–48 h ouvrées."}
        </p>
      </div>
    );
  }

  const openMailto = (body?: string) => {
    const url = buildActivationMailtoUrl(ctx, body);
    if (!url) return;
    window.location.href = url;
  };

  const handleFirebaseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setError(null);
    setSubmitting(true);
    try {
      await createActivationRequest({
        uid: user.uid,
        email: user.email,
        displayName: userName ?? user.displayName ?? user.email,
        tournamentName,
        tournamentId,
        message: message.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  if (useFirebase) {
    return (
      <div
        className={`contact-activation${isCompact ? " contact-activation--compact" : ""}${isInline ? " contact-activation--inline" : ""}`}
      >
        {!isInline && !isCompact && (
          <>
            <h3 className="contact-activation-title">Prêt à lancer en direct ?</h3>
            <p className="hint contact-activation-lead">{APP_CONTACT_HINT}</p>
          </>
        )}

        {(formOpen || isInline || isCompact) && (
          <form className="contact-activation-form" onSubmit={handleFirebaseSubmit}>
            {!isInline && !isCompact && (
              <p className="hint">
                Votre demande arrive directement dans notre espace admin — pas besoin d&apos;e-mail
                séparé.
              </p>
            )}
            {(userName || userEmail) && !isInline && (
              <p className="hint contact-activation-prefill">
                {userName && <span>{userName}</span>}
                {userName && userEmail && " · "}
                {userEmail && <span>{userEmail}</span>}
                {tournamentName && (
                  <>
                    <br />
                    Tournoi : {tournamentName}
                  </>
                )}
              </p>
            )}
            {!isInline && (
              <label className="auth-field">
                <span>Message (optionnel)</span>
                <textarea
                  rows={isCompact ? 2 : 4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex. Club XYZ, tournoi le 15 juin, formule club annuelle…"
                />
              </label>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-accent" disabled={submitting}>
              {submitting
                ? "Envoi…"
                : isCompact || isInline
                  ? "Demander l'activation"
                  : "Envoyer ma demande d'activation"}
            </button>
          </form>
        )}

        {!formOpen && !isInline && !isCompact && (
          <div className="contact-activation-actions">
            <button type="button" className="btn btn-accent" onClick={() => setFormOpen(true)}>
              Demander l&apos;activation
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!hasContactChannel()) {
    return (
      <p className="hint contact-activation-fallback">
        Contact non configuré — connectez-vous en ligne ou définissez{" "}
        <code>VITE_CONTACT_EMAIL</code>.
      </p>
    );
  }

  return (
    <div
      className={`contact-activation${isCompact ? " contact-activation--compact" : ""}${isInline ? " contact-activation--inline" : ""}`}
    >
      {!isInline && !isCompact && (
        <>
          <h3 className="contact-activation-title">Prêt à lancer en direct ?</h3>
          <p className="hint contact-activation-lead">{APP_CONTACT_HINT}</p>
        </>
      )}
      <div className="contact-activation-actions">
        {email && (
          <button type="button" className="btn btn-accent" onClick={() => openMailto(message)}>
            {isCompact || isInline ? "Demander l'activation" : "Me contacter par e-mail"}
          </button>
        )}
        {formUrl && (
          <a href={formUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            Formulaire en ligne
          </a>
        )}
      </div>
    </div>
  );
}
