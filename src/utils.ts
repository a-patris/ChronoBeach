import type {
  Match,
  ShotResult,
  Team,
  TimeoutState,
  TimerMeta,
  Tournament,
} from "./types";

export {
  confirmShootoutStart,
  createShootout,
  getRegularShotProgress,
  getShootoutPhaseLabel,
  recordShootoutShot,
  REGULAR_SHOTS_PER_TEAM,
  resetShootout,
  shootoutScore,
  undoLastShootoutShot,
} from "./shootout";

export const TIMEOUT_DURATION_SECONDS = 60;

export function uid(): string {
  return crypto.randomUUID();
}

export function createTeam(name: string): Team {
  return { id: uid(), name: name.trim() };
}

export function defaultTimer(): TimerMeta {
  return { running: false };
}

export function defaultTimeoutsUsed(): Match["timeoutsUsed"] {
  return { period1: [], period2: [] };
}

function timeoutsPeriodKey(period: 1 | 2): "period1" | "period2" {
  return period === 1 ? "period1" : "period2";
}

export function hasUsedTimeoutInPeriod(
  match: Match,
  teamId: string,
  period: 1 | 2 = match.period,
): boolean {
  const key = timeoutsPeriodKey(period);
  return (match.timeoutsUsed?.[key] ?? []).includes(teamId);
}

export function markTimeoutUsed(match: Match, teamId: string): Match {
  const key = timeoutsPeriodKey(match.period);
  const current = match.timeoutsUsed ?? defaultTimeoutsUsed();
  if (current[key].includes(teamId)) return match;
  return {
    ...match,
    timeoutsUsed: {
      ...current,
      [key]: [...current[key], teamId],
    },
  };
}

export function canRequestTimeout(match: Match, teamId: string): boolean {
  return !hasUsedTimeoutInPeriod(match, teamId);
}

/** Lance un TM si l'équipe n'en a pas encore pris sur la période en cours. */
export function applyTeamTimeout(match: Match, teamId: string): Match | null {
  if (!canRequestTimeout(match, teamId)) return null;
  const withUsed = markTimeoutUsed(match, teamId);
  return {
    ...withUsed,
    status: "paused",
    timer: { running: false },
    timeout: startTimeout(teamId),
  };
}

export function createMatch(
  teamAId: string,
  teamBId: string,
  durationSeconds = 600,
  poolId?: string,
): Match {
  return {
    id: uid(),
    teamAId,
    teamBId,
    poolId,
    mode: "match",
    scoreA: 0,
    scoreB: 0,
    period: 1,
    periodScores: {},
    periodWinners: {},
    timeoutsUsed: defaultTimeoutsUsed(),
    status: "ready",
    durationSeconds,
    remainingSeconds: durationSeconds,
    timer: defaultTimer(),
  };
}

export function archiveCurrentPeriodScores(match: Match): Match {
  const key = match.period === 1 ? "period1" : "period2";
  return {
    ...match,
    periodScores: {
      ...match.periodScores,
      [key]: { scoreA: match.scoreA, scoreB: match.scoreB },
    },
  };
}

/** Fin de période : archive le set et remet le score à 0 (sauf P2). */
export function advanceToNextPeriod(match: Match): Match {
  if (match.period >= 2) return match;
  const archived = archiveCurrentPeriodScores(match);
  return {
    ...archived,
    period: 2,
    scoreA: 0,
    scoreB: 0,
    remainingSeconds: match.durationSeconds,
    timer: { running: false },
    status: "ready",
  };
}

/** Totaux buts d'un match (sets archivés + set en cours si non archivé). */
export function getMatchGoalTotals(match: Match): {
  teamA: { for: number; against: number };
  teamB: { for: number; against: number };
} {
  let aFor = 0;
  let aAgainst = 0;
  if (match.periodScores.period1) {
    aFor += match.periodScores.period1.scoreA;
    aAgainst += match.periodScores.period1.scoreB;
  }
  if (match.periodScores.period2) {
    aFor += match.periodScores.period2.scoreA;
    aAgainst += match.periodScores.period2.scoreB;
  }
  const p2Archived = !!match.periodScores.period2;
  const p1Archived = !!match.periodScores.period1;
  if (match.period === 1 && !p1Archived) {
    aFor += match.scoreA;
    aAgainst += match.scoreB;
  } else if (match.period === 2 && !p2Archived) {
    aFor += match.scoreA;
    aAgainst += match.scoreB;
  }
  return {
    teamA: { for: aFor, against: aAgainst },
    teamB: { for: aAgainst, against: aFor },
  };
}

export function computeTimeoutRemaining(timeout: TimeoutState, now = Date.now()): number {
  const { timer, remainingSeconds } = timeout;
  if (!timer.running || timer.startedAt == null || timer.remainingAtStart == null) {
    return remainingSeconds;
  }
  const elapsed = Math.floor((now - timer.startedAt) / 1000);
  return Math.max(0, timer.remainingAtStart - elapsed);
}

/** Applique uniquement chrono / timeout sur le match le plus récent (évite d'écraser le shoot-out). */
export function mergeMatchTimerFields(base: Match, timerPatch: Match): Match {
  return {
    ...base,
    remainingSeconds: timerPatch.remainingSeconds,
    timer: timerPatch.timer,
    status: timerPatch.status,
    timeout: timerPatch.timeout,
  };
}

export function syncTimeoutRemaining(match: Match, now = Date.now()): Match {
  if (!match.timeout?.timer.running) return match;
  const remaining = computeTimeoutRemaining(match.timeout, now);
  if (remaining <= 0) {
    return { ...match, timeout: undefined };
  }
  return {
    ...match,
    timeout: { ...match.timeout, remainingSeconds: remaining },
  };
}

export function startTimeout(teamId: string): TimeoutState {
  return {
    teamId,
    durationSeconds: TIMEOUT_DURATION_SECONDS,
    remainingSeconds: TIMEOUT_DURATION_SECONDS,
    timer: {
      running: true,
      startedAt: Date.now(),
      remainingAtStart: TIMEOUT_DURATION_SECONDS,
    },
  };
}

export function getTeam(tournament: Tournament, teamId?: string): Team | undefined {
  return tournament.teams.find((t) => t.id === teamId);
}

export function getActiveMatch(tournament: Tournament): Match | undefined {
  return tournament.matches.find((m) => m.id === tournament.activeMatchId);
}

export function updateMatch(
  tournament: Tournament,
  matchId: string,
  updater: (match: Match) => Match,
): Tournament {
  return {
    ...tournament,
    matches: tournament.matches.map((m) =>
      m.id === matchId ? updater(m) : m,
    ),
  };
}

/** Calcule les secondes restantes à partir du timestamp (chrono fiable). */
export function computeRemainingSeconds(match: Match, now = Date.now()): number {
  const { timer, remainingSeconds } = match;
  if (!timer.running || timer.startedAt == null || timer.remainingAtStart == null) {
    return remainingSeconds;
  }
  const elapsed = Math.floor((now - timer.startedAt) / 1000);
  return Math.max(0, timer.remainingAtStart - elapsed);
}

export function syncTimerRemaining(match: Match, now = Date.now()): Match {
  if (!match.timer.running) return match;
  const remaining = computeRemainingSeconds(match, now);
  if (remaining <= 0) {
    return {
      ...match,
      remainingSeconds: 0,
      status: match.status === "running" ? "paused" : match.status,
      timer: { running: false },
    };
  }
  return { ...match, remainingSeconds: remaining };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function matchStatusLabel(status: Match["status"]): string {
  const labels: Record<Match["status"], string> = {
    ready: "Prêt",
    running: "En cours",
    paused: "Pause",
    finished: "Terminé",
  };
  return labels[status];
}

export function categorizeMatches(matches: Match[]) {
  return {
    upcoming: matches.filter((m) => m.status === "ready" && !m.winnerTeamId),
    live: matches.filter(
      (m) =>
        m.status === "running" ||
        m.status === "paused" ||
        (m.status !== "finished" && m.mode === "shootout"),
    ),
    finished: matches.filter((m) => m.status === "finished" || !!m.winnerTeamId),
  };
}

export function shotResultIcon(result: ShotResult, points = 1): string {
  if (result === "goal") return points >= 2 ? "✅²" : "✅";
  if (result === "miss") return "❌";
  return "🧤";
}

/** Les deux périodes ont chacune un vainqueur différent → shoot-out possible. */
export function canStartShootout(match: Match): boolean {
  const { period1, period2 } = match.periodWinners;
  return !!period1 && !!period2 && period1 !== period2 && match.mode === "match";
}

const LOGO_MAX_PX = 160;

/** Redimensionne une image pour stockage localStorage (data URL). */
export function fileToTeamLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Fichier image requis"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible"));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const scale = Math.min(1, LOGO_MAX_PX / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const webp = canvas.toDataURL("image/webp", 0.82);
        resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function getShootoutHint(match: Match, teamAName: string, teamBName: string): string {
  const { period1, period2 } = match.periodWinners;
  if (match.mode !== "match") return "";
  if (!period1 && !period2) {
    return `Indiquez le vainqueur de la P1 puis de la P2 (équipes différentes). Ex. : « ${teamAName} gagne P1 » puis « ${teamBName} gagne P2 ».`;
  }
  if (!period1) return "Définissez le vainqueur de la période 1.";
  if (!period2) return "Passez en période 2, puis définissez le vainqueur de la période 2.";
  if (period1 === period2) {
    return "Les deux périodes ne peuvent pas avoir le même vainqueur pour un shoot-out. Corrigez P1 ou P2.";
  }
  return "";
}
