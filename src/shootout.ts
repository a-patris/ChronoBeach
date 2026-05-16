import type { Shot, ShotResult, Shootout } from "./types";

function newId(): string {
  return crypto.randomUUID();
}

export const REGULAR_SHOTS_PER_TEAM = 5;

export type ShootoutPhase = "setup" | "regular" | "sudden_death";

export function otherTeam(teamAId: string, teamBId: string, teamId: string): string {
  return teamId === teamAId ? teamBId : teamAId;
}

/** Nouveau shoot-out : choix de l'équipe qui commence (tirage au sort). */
export function createShootout(teamAId: string, _teamBId: string): Shootout {
  return {
    active: true,
    finished: false,
    phase: "setup",
    suddenDeath: false,
    firstShooterId: teamAId,
    shots: [],
    currentRound: 1,
    currentTeamId: undefined,
  };
}

/** Valide le tirage au sort et démarre la série de 5 tirs. */
export function confirmShootoutStart(
  shootout: Shootout,
  firstShooterId: string,
): Shootout {
  if (shootout.finished || shootout.shots.length > 0) return shootout;
  return {
    ...shootout,
    firstShooterId: firstShooterId,
    phase: "regular",
    suddenDeath: false,
    currentTeamId: firstShooterId,
    currentRound: 1,
  };
}

export function shootoutScore(shootout: Shootout, teamId: string): number {
  return shootout.shots
    .filter((s) => s.teamId === teamId && s.result === "goal")
    .reduce((sum, s) => sum + (s.points ?? 1), 0);
}

function teamShotCount(shootout: Shootout, teamId: string): number {
  return shootout.shots.filter((s) => s.teamId === teamId).length;
}

function regularComplete(shootout: Shootout, teamAId: string, teamBId: string): boolean {
  return (
    teamShotCount(shootout, teamAId) >= REGULAR_SHOTS_PER_TEAM &&
    teamShotCount(shootout, teamBId) >= REGULAR_SHOTS_PER_TEAM
  );
}

/** Prochain tireur en phase régulière (alternance depuis firstShooterId). */
function nextRegularShooter(
  shotCount: number,
  firstId: string,
  teamAId: string,
  teamBId: string,
): string {
  return shotCount % 2 === 0 ? firstId : otherTeam(teamAId, teamBId, firstId);
}

function shotPoints(shot: Shot): number {
  if (shot.result !== "goal") return 0;
  return shot.points ?? 1;
}

function suddenDeathRoundWinner(
  shootout: Shootout,
  teamAId: string,
  teamBId: string,
  round: number,
): string | undefined {
  const inRound = shootout.shots.filter(
    (s) => s.phase === "sudden_death" && s.round === round,
  );
  const shotA = inRound.find((s) => s.teamId === teamAId);
  const shotB = inRound.find((s) => s.teamId === teamBId);
  if (!shotA || !shotB) return undefined;

  const ptsA = shotPoints(shotA);
  const ptsB = shotPoints(shotB);
  if (ptsA > ptsB) return teamAId;
  if (ptsB > ptsA) return teamBId;
  return undefined;
}

function enterSuddenDeath(shootout: Shootout): Shootout {
  return {
    ...shootout,
    phase: "sudden_death",
    suddenDeath: true,
    currentRound: 1,
    currentTeamId: shootout.firstShooterId,
  };
}

function finishShootout(shootout: Shootout, winnerTeamId: string): Shootout {
  return {
    ...shootout,
    finished: true,
    active: false,
    winnerTeamId,
    currentTeamId: undefined,
  };
}

export function recordShootoutShot(
  shootout: Shootout,
  teamAId: string,
  teamBId: string,
  result: ShotResult,
  goalPoints = 1,
): Shootout {
  if (shootout.finished || shootout.phase === "setup" || !shootout.currentTeamId) {
    return shootout;
  }

  const teamId = shootout.currentTeamId;
  const first = shootout.firstShooterId;
  const second = otherTeam(teamAId, teamBId, first);

  const isSuddenDeath =
    shootout.phase === "sudden_death" || shootout.suddenDeath;

  const shot: Shot = {
    id: newId(),
    teamId,
    result,
    round: isSuddenDeath
      ? shootout.currentRound
      : teamShotCount(shootout, teamId) + 1,
    phase: isSuddenDeath ? "sudden_death" : "regular",
    points: result === "goal" ? goalPoints : undefined,
  };

  let next: Shootout = { ...shootout, shots: [...shootout.shots, shot] };

  // ——— Phase régulière : 5 tirs par équipe ———
  if (next.phase === "regular") {
    if (!regularComplete(next, teamAId, teamBId)) {
      return {
        ...next,
        currentTeamId: nextRegularShooter(next.shots.length, first, teamAId, teamBId),
        currentRound: Math.ceil(next.shots.length / 2),
      };
    }

    const scoreA = shootoutScore(next, teamAId);
    const scoreB = shootoutScore(next, teamBId);
    if (scoreA === scoreB) {
      return enterSuddenDeath(next);
    }
    return finishShootout(next, scoreA > scoreB ? teamAId : teamBId);
  }

  // ——— Mort subite : 1 tir chacun par manche, plus de points gagne ———
  const sdRound = next.currentRound;
  const inRound = next.shots.filter(
    (s) => s.phase === "sudden_death" && s.round === sdRound,
  );

  if (inRound.length === 1) {
    return { ...next, currentTeamId: second };
  }

  const winner = suddenDeathRoundWinner(next, teamAId, teamBId, sdRound);
  if (winner) {
    return finishShootout(next, winner);
  }

  return {
    ...next,
    currentRound: sdRound + 1,
    currentTeamId: first,
  };
}

/** Recalcule l'état après annulation du dernier tir. */
function recomputeShootout(
  shootout: Shootout,
  teamAId: string,
  teamBId: string,
): Shootout {
  const shots = shootout.shots;
  const first = shootout.firstShooterId;
  const second = otherTeam(teamAId, teamBId, first);
  const base = { ...shootout, shots, finished: false, active: true, winnerTeamId: undefined };

  if (shots.length === 0) {
    return {
      ...base,
      phase: "setup",
      suddenDeath: false,
      currentTeamId: undefined,
      currentRound: 1,
    };
  }

  if (!regularComplete(base, teamAId, teamBId)) {
    return {
      ...base,
      phase: "regular",
      suddenDeath: false,
      currentTeamId: nextRegularShooter(shots.length, first, teamAId, teamBId),
      currentRound: Math.max(1, Math.ceil(shots.length / 2)),
    };
  }

  const scoreA = shootoutScore(base, teamAId);
  const scoreB = shootoutScore(base, teamBId);

  if (scoreA !== scoreB) {
    return finishShootout(base, scoreA > scoreB ? teamAId : teamBId);
  }

  const sdShots = shots.filter((s) => s.phase === "sudden_death");
  if (sdShots.length === 0) {
    return enterSuddenDeath(base);
  }

  const lastRound = sdShots[sdShots.length - 1].round;
  const inRound = sdShots.filter((s) => s.round === lastRound);

  if (inRound.length === 1) {
    return {
      ...base,
      phase: "sudden_death",
      suddenDeath: true,
      currentRound: lastRound,
      currentTeamId: second,
    };
  }

  const winner = suddenDeathRoundWinner(base, teamAId, teamBId, lastRound);
  if (winner) {
    return finishShootout(base, winner);
  }

  return {
    ...base,
    phase: "sudden_death",
    suddenDeath: true,
    currentRound: lastRound + 1,
    currentTeamId: first,
  };
}

export function undoLastShootoutShot(
  shootout: Shootout,
  teamAId: string,
  teamBId: string,
): Shootout {
  if (shootout.shots.length === 0) return shootout;
  const shots = shootout.shots.slice(0, -1);
  return recomputeShootout({ ...shootout, shots }, teamAId, teamBId);
}

export function resetShootout(teamAId: string, teamBId: string): Shootout {
  return createShootout(teamAId, teamBId);
}

export function getShootoutPhaseLabel(shootout: Shootout): string {
  if (shootout.phase === "setup") return "Tirage au sort";
  if (shootout.phase === "sudden_death" || shootout.suddenDeath) return "Mort subite";
  return "Série initiale (5 tirs)";
}

export function getRegularShotProgress(shootout: Shootout, teamId: string): number {
  return Math.min(REGULAR_SHOTS_PER_TEAM, teamShotCount(shootout, teamId));
}
