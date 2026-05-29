export type TournamentSegment =
  | "setup"
  | "admin"
  | "tablet"
  | "display"
  | "classement";

/** Chemin scopé tournoi — prêt pour Firebase (lien partageable). */
export function tournamentPath(
  tournamentId: string,
  segment: TournamentSegment,
  matchId?: string,
): string {
  const base = `/t/${encodeURIComponent(tournamentId)}`;
  if (segment === "tablet" && matchId) return `${base}/tablet/${encodeURIComponent(matchId)}`;
  if (segment === "display" && matchId) return `${base}/display/${encodeURIComponent(matchId)}`;
  return `${base}/${segment}`;
}

export function displayPath(
  tournamentId: string,
  matchId: string,
  opts?: { fullscreen?: boolean },
): string {
  const path = tournamentPath(tournamentId, "display", matchId);
  if (!opts?.fullscreen) return path;
  return `${path}?fs=1`;
}

/** Suivi mobile spectateur (buette, public). */
export function spectatorWatchPath(tournamentId: string, matchId: string): string {
  return `/watch/${encodeURIComponent(tournamentId)}/${encodeURIComponent(matchId)}`;
}

export function spectatorHubPath(tournamentId: string): string {
  return `/watch/${encodeURIComponent(tournamentId)}`;
}

export function legacyRedirectPath(
  segment: TournamentSegment,
  tournamentId: string,
  search?: string,
): string {
  return `${tournamentPath(tournamentId, segment)}${search ?? ""}`;
}
