export type Team = {
  id: string;
  name: string;
  /** Data URL (image redimensionnée) stockée en localStorage. */
  logo?: string;
  /** Id de la poule (optionnel). */
  poolId?: string;
};

export type Pool = {
  id: string;
  name: string;
};

export type MatchStatus = "ready" | "running" | "paused" | "finished";

export type MatchMode = "match" | "shootout";

export type ShotResult = "goal" | "miss" | "save";

export type ShotPhase = "regular" | "sudden_death";

export type Shot = {
  id: string;
  teamId: string;
  result: ShotResult;
  round: number;
  phase?: ShotPhase;
  /** Points marqués si but (1 ou 2). */
  points?: number;
};

export type ShootoutPhase = "setup" | "regular" | "sudden_death";

export type Shootout = {
  active: boolean;
  finished: boolean;
  /** @deprecated Utiliser phase — conservé pour migration. */
  suddenDeath: boolean;
  phase: ShootoutPhase;
  /** Équipe qui commence (tirage au sort). */
  firstShooterId: string;
  shots: Shot[];
  currentRound: number;
  currentTeamId?: string;
  winnerTeamId?: string;
};

export type PeriodScore = {
  scoreA: number;
  scoreB: number;
};

/** Horodatage pour chrono persistant (évite la dérive entre onglets / refresh). */
export type TimerMeta = {
  running: boolean;
  startedAt?: number;
  remainingAtStart?: number;
};

export type TimeoutState = {
  teamId: string;
  durationSeconds: number;
  remainingSeconds: number;
  timer: TimerMeta;
};

export type Match = {
  id: string;
  teamAId: string;
  teamBId: string;
  poolId?: string;

  mode: MatchMode;

  scoreA: number;
  scoreB: number;

  period: 1 | 2;

  /** Scores archivés à chaque fin de période (style sets volley). */
  periodScores: {
    period1?: PeriodScore;
    period2?: PeriodScore;
  };

  periodWinners: {
    period1?: string;
    period2?: string;
  };

  status: MatchStatus;

  durationSeconds: number;
  remainingSeconds: number;
  timer: TimerMeta;

  timeout?: TimeoutState;

  /** Équipes ayant déjà pris un TM cette période (1 TM max / équipe / période). */
  timeoutsUsed: {
    period1: string[];
    period2: string[];
  };

  shootout?: Shootout;

  winnerTeamId?: string;
};

export type Tournament = {
  id: string;
  name: string;
  teams: Team[];
  pools: Pool[];
  matches: Match[];
  activeMatchId?: string;
};

export type TeamStanding = {
  teamId: string;
  poolId?: string;
  played: number;
  won: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  /** Sets gagnés (P1 + P2 + shoot-out si applicable). */
  setsWon: number;
  setsLost: number;
  setAverage: number;
  points: number;
};
