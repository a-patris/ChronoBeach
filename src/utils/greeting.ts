function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Prénom ou pseudo court — évite d'afficher « amaury.patris » depuis l'e-mail. */
export function resolveFirstName(
  displayName?: string | null,
  email?: string | null,
): string {
  const fromDisplay = displayName?.trim().split(/\s+/)[0];
  if (fromDisplay && !fromDisplay.includes("@")) {
    return capitalize(fromDisplay.split(".")[0] ?? fromDisplay);
  }

  const localPart = email?.split("@")[0] ?? "";
  const firstSegment = localPart.split(".")[0] || localPart;
  return capitalize(firstSegment) || "organisateur";
}

export function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export type DashboardAudience = "staff" | "organizer" | "discovery";

export function dashboardKicker(audience: DashboardAudience): string {
  switch (audience) {
    case "staff":
      return "Console ChronoBeach";
    case "discovery":
      return "Mode découverte";
    default:
      return "Espace organisateur";
  }
}

/** Titre principal — sobre, présentable en démo. */
export function dashboardHeadline(
  displayName?: string | null,
  email?: string | null,
): string {
  const name = resolveFirstName(displayName, email);
  return `${timeOfDayGreeting()}, ${name}`;
}

/** Accroche sous le titre — un peu de beach, ton pro. */
export function dashboardTagline(audience: DashboardAudience): string {
  switch (audience) {
    case "staff":
      return "Organisateurs, demandes d'activation et tournois — tout au même endroit.";
    case "discovery":
      return "Testez la config en libre-service : équipes, poules et feuilles FDME.";
    default:
      return "De la feuille de match aux écrans publics — votre tournoi beach handball, prêt à partir.";
  }
}

/** Nom affiché dans les blocs club (préserve le nom complet si c'est un club). */
export function resolveWelcomeName(
  displayName?: string | null,
  email?: string | null,
): string {
  const trimmed = displayName?.trim();
  if (trimmed && trimmed.includes(" ")) return trimmed;
  return resolveFirstName(trimmed, email);
}
