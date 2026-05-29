import type { Tournament, TournamentEventType } from "./types";

export type { TournamentEventType };

export const OFFICIAL_ROSTER_SIZE = 10;
export const FRIENDLY_ROSTER_OPTIONS = [10, 12, 14] as const;

export function getTournamentEventType(t: Tournament): TournamentEventType {
  return t.eventType ?? "official";
}

export function getTournamentRosterLimit(t: Tournament): number {
  if (t.rosterSize != null) return t.rosterSize;
  return getTournamentEventType(t) === "official" ? OFFICIAL_ROSTER_SIZE : 12;
}

export function eventTypeLabel(type: TournamentEventType): string {
  return type === "official" ? "Tournoi officiel" : "Tournoi amical";
}

export function rosterLimitLabel(t: Tournament): string {
  const n = getTournamentRosterLimit(t);
  const kind = getTournamentEventType(t);
  return kind === "official"
    ? `${n} joueurs (officiel FFHandball)`
    : `${n} joueurs max sur la feuille`;
}

export function normalizeTournamentSettings(
  patch: Partial<Pick<Tournament, "eventType" | "rosterSize">>,
): Partial<Pick<Tournament, "eventType" | "rosterSize">> {
  const eventType = patch.eventType ?? "official";
  if (eventType === "official") {
    return { eventType, rosterSize: OFFICIAL_ROSTER_SIZE };
  }
  const size = patch.rosterSize ?? 12;
  const allowed = FRIENDLY_ROSTER_OPTIONS.includes(
    size as (typeof FRIENDLY_ROSTER_OPTIONS)[number],
  )
    ? size
    : 12;
  return { eventType, rosterSize: allowed };
}
