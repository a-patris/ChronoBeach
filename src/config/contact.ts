import { APP_NAME } from "./brand";

export type ContactContext = {
  userName?: string;
  userEmail?: string;
  tournamentName?: string;
  tournamentId?: string;
};

function readEnv(key: string): string {
  const raw = import.meta.env[key];
  return typeof raw === "string" ? raw.trim() : "";
}

/** E-mail commercial — VITE_CONTACT_EMAIL ou 1er super admin. */
export function getContactEmail(): string {
  const explicit = readEnv("VITE_CONTACT_EMAIL");
  if (explicit) return explicit;
  const admins = readEnv("VITE_SUPER_ADMIN_EMAILS");
  const first = admins.split(",")[0]?.trim();
  return first ?? "";
}

/** Lien formulaire externe (Tally, Google Forms, Typeform…). */
export function getContactFormUrl(): string {
  return readEnv("VITE_CONTACT_FORM_URL");
}

export function hasContactChannel(): boolean {
  return Boolean(getContactEmail() || getContactFormUrl());
}

export function buildActivationMailtoUrl(
  ctx: ContactContext = {},
  extraMessage?: string,
): string {
  const email = getContactEmail();
  if (!email) return "";

  const subject = `Activation abonnement ${APP_NAME}`;
  const lines = [
    "Bonjour,",
    "",
    "Je souhaite activer mon abonnement pour lancer mon tournoi en direct.",
    "",
  ];

  if (ctx.userName) lines.push(`Nom : ${ctx.userName}`);
  if (ctx.userEmail) lines.push(`E-mail : ${ctx.userEmail}`);
  if (ctx.tournamentName) lines.push(`Tournoi : ${ctx.tournamentName}`);
  if (extraMessage?.trim()) {
    lines.push("", "Message :", extraMessage.trim());
  }
  lines.push("", "Merci.");

  const params = new URLSearchParams({
    subject,
    body: lines.join("\n"),
  });

  return `mailto:${email}?${params.toString()}`;
}
