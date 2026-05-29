import { isFirebaseConfigured } from "../config/firebase";
import { APP_NAME } from "../config/brand";
import type { Tournament } from "../types";
import { isPlatformStaff, type UserRole } from "./roles";

/** Statut commercial du compte organisateur. */
export type BillingStatus =
  | "discovery"
  | "active"
  | "past_due"
  | "canceled"
  | "lifetime_free";

export const BILLING_STATUSES: BillingStatus[] = [
  "discovery",
  "active",
  "past_due",
  "canceled",
  "lifetime_free",
];

export function normalizeBillingStatus(raw: unknown): BillingStatus {
  if (
    raw === "discovery" ||
    raw === "active" ||
    raw === "past_due" ||
    raw === "canceled" ||
    raw === "lifetime_free"
  ) {
    return raw;
  }
  return "discovery";
}

export function canGoLive(
  billingStatus: BillingStatus | undefined,
  role: UserRole | null,
): boolean {
  if (!isFirebaseConfigured()) return true;
  if (isPlatformStaff(role)) return true;
  if (billingStatus === "active" || billingStatus === "lifetime_free") return true;
  return false;
}

/** Tournoi dénormalisé — lecture publique sans accès au profil organisateur. */
export function tournamentLiveEnabled(tournament?: Pick<Tournament, "liveEnabled"> | null): boolean {
  if (!isFirebaseConfigured()) return true;
  if (!tournament) return false;
  if (tournament.liveEnabled === true) return true;
  if (tournament.liveEnabled === false) return false;
  return true;
}

export function stampTournamentLiveFlag(
  tournament: Tournament,
  billingStatus: BillingStatus | undefined,
  role: UserRole | null,
): Tournament {
  if (!isFirebaseConfigured()) return tournament;
  const liveEnabled = canGoLive(billingStatus, role);
  if (tournament.liveEnabled === liveEnabled) return tournament;
  return { ...tournament, liveEnabled };
}

export function billingStatusLabel(status: BillingStatus): string {
  switch (status) {
    case "discovery":
      return "Découverte";
    case "active":
      return "Actif";
    case "past_due":
      return "Impayé";
    case "canceled":
      return "Résilié";
    case "lifetime_free":
      return "Gratuit à vie";
  }
}

export const DISCOVERY_BANNER_TITLE = "Mode découverte";
export const DISCOVERY_BANNER_BODY =
  "Configurez votre tournoi librement. Le lancement (chrono, tablette, écrans publics, spectateurs) sera disponible une fois votre abonnement activé.";
export const DISCOVERY_LAUNCH_MESSAGE =
  "Vous pourrez lancer votre tournoi une fois abonné.";
export const LIVE_BLOCKED_PUBLIC_MESSAGE =
  `Ce tournoi n'est pas encore activé pour le direct. L'organisateur doit activer son abonnement ${APP_NAME}.`;
