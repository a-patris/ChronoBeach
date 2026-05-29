/** Ouvre l'écran public d'un match précis (multi-terrains). */
export function openPublicDisplayForMatch(
  tournamentId: string,
  matchId: string,
  opts?: { fullscreen?: boolean },
): void {
  const url = new URL(
    `/t/${encodeURIComponent(tournamentId)}/display/${encodeURIComponent(matchId)}`,
    window.location.origin,
  );
  if (opts?.fullscreen !== false) url.searchParams.set("fs", "1");
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

/** Ouvre l'écran du match actif admin (legacy). */
export function openPublicDisplayFullscreen(
  tournamentId?: string,
  matchId?: string,
): void {
  if (tournamentId && matchId) {
    openPublicDisplayForMatch(tournamentId, matchId);
    return;
  }
  const url = new URL("/display", window.location.origin);
  url.searchParams.set("fs", "1");
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

export { requestDisplayFullscreen } from "../displaySync";

export function publicDisplayHref(
  tournamentId: string,
  matchId: string,
  withFullscreen = true,
): string {
  const path = `/t/${encodeURIComponent(tournamentId)}/display/${encodeURIComponent(matchId)}`;
  return withFullscreen ? `${path}?fs=1` : path;
}
