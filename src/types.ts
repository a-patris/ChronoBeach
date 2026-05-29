export type Team = {
  id: string;
  name: string;
  /** Data URL (image redimensionnée) stockée en localStorage. */
  logo?: string;
  /** Id de la poule (optionnel). */
  poolId?: string;
  /** Effectif (max 11 : 8 titulaires + 3 remplaçants). */
  players?: Player[];
};

export type Player = {
  id: string;
  number: number;
  /** Nom complet (legacy) ou nom de naissance si firstName renseigné. */
  name: string;
  firstName?: string;
  isGoalkeeper?: boolean;
  /** Spécialiste (maillot distinct, peut remplacer le gardien). */
  isSpecialist?: boolean;
};

export type MatchOfficials = {
  /** Responsable de salle */
  roomManager?: string;
  /** Secrétaire de feuille */
  scorekeeper?: string;
  /** Chronométreur */
  timekeeper?: string;
  /** Arbitre principal */
  referee1?: string;
  /** Arbitre adjoint */
  referee2?: string;
  /** Juge accompagnateur (si présent) */
  accompanyingJudge?: string;
  /** @deprecated Utiliser referee1 */
  referees?: string;
};

export type SanctionType = "warning" | "exclusion" | "disqualification";

/** Entraîneur sanctionné sur la feuille (R / R2). */
export type StaffSlot = "coach1" | "coach2";

export type MatchSanction = {
  id: string;
  teamId: string;
  playerId?: string;
  /** Si renseigné, la sanction vise l'entraîneur (pas un joueur). */
  staffSlot?: StaffSlot;
  type: SanctionType;
  period: 1 | 2;
  note?: string;
  at?: number;
  /** Temps écoulé dans la période (chrono croissant, ex. 0:15). */
  elapsedSeconds?: number;
};

/** Rapport de discipline (carton bleu) — feuille officielle, fin de match, hors écran public. */
export type DisciplineReport = {
  id: string;
  teamId: string;
  playerId?: string;
  staffSlot?: StaffSlot;
  note?: string;
  at?: number;
};

export type GoalType =
  | "classic"
  | "360"
  | "kungfu"
  | "goalkeeper"
  | "specialist"
  | "penalty6m";

export type GoalEvent = {
  id: string;
  teamId: string;
  playerId?: string;
  points: 1 | 2;
  goalType?: GoalType;
  period: 1 | 2;
  at?: number;
  /** Temps écoulé dans la période (chrono croissant, ex. 0:15). */
  elapsedSeconds?: number;
};

export type MatchSheetSide = {
  captainId?: string;
  presentPlayerIds: string[];
  /** Entraîneur principal (ligne R). */
  staffName?: string;
  /** 2e entraîneur / officiel équipe (ligne R2). */
  staffName2?: string;
  /** GK / spécialiste actuellement en jeu (1 seul par équipe). */
  activeSpecialistId?: string;
  /** Joueurs actuellement exclus (reprise à la prochaine possession). */
  excludedPlayerIds?: string[];
};

export type MatchSheet = {
  teamA: MatchSheetSide;
  teamB: MatchSheetSide;
  goals: GoalEvent[];
  sanctions: MatchSanction[];
  /** Tirs ratés et arrêts (hors shoot-out). */
  plays: PlayEvent[];
  /** Rapports de discipline (carton bleu) — fin de match, non affichés au public. */
  disciplineReports?: DisciplineReport[];
  /** Feuille validée → feuille de table (marquage). */
  scoringStarted?: boolean;
  officials?: MatchOfficials;
};

export type PlayerStatsRow = {
  playerId: string;
  teamId: string;
  goals: number;
  points: number;
  shotsMissed: number;
  saves: number;
  shootoutGoals: number;
  shootoutAttempts: number;
};

export type Pool = {
  id: string;
  name: string;
};

export type TournamentEventType = "official" | "friendly";

export type MatchStatus = "ready" | "running" | "paused" | "finished";

export type MatchMode = "match" | "shootout";

export type ShotResult = "goal" | "miss" | "save";

export type ShotPhase = "regular" | "sudden_death";

export type Shot = {
  id: string;
  teamId: string;
  playerId?: string;
  result: ShotResult;
  round: number;
  phase?: ShotPhase;
  /** Points marqués si but (1 ou 2). */
  points?: number;
};

export type PlayEventType = "shot_miss" | "save";

export type PlayEvent = {
  id: string;
  teamId: string;
  playerId?: string;
  type: PlayEventType;
  period: 1 | 2;
  at?: number;
  /** Temps écoulé dans la période (chrono croissant, ex. 0:15). */
  elapsedSeconds?: number;
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
  /** Titre affiché (ex. Grande finale, Phase haute). */
  label?: string;
  /** Terrain / court (ex. Terrain 1) — affiché tablette & multi-écrans. */
  courtLabel?: string;
  /** Heure prévue affichée (ex. 09H30). */
  scheduledTime?: string;
  /** Ordre dans la liste des matchs. */
  sortOrder?: number;

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

  /** Golden goal actif (égalité en fin de période). */
  goldenGoalActive?: boolean;

  /** Feuille de match (effectif, sanctions, journal des buts). */
  matchSheet?: MatchSheet;
};

export type Tournament = {
  id: string;
  name: string;
  teams: Team[];
  pools: Pool[];
  matches: Match[];
  activeMatchId?: string;
  /** Officiel (10 joueurs FDME) ou amical (effectif configurable). */
  eventType?: TournamentEventType;
  /** Nombre max de joueurs inscrits sur la feuille par équipe. */
  rosterSize?: number;
  /** Propriétaire Firebase Auth (sync en ligne). */
  ownerUid?: string;
  /** Responsable de tournoi (peut régénérer les codes, gérer le staff). */
  managerUid?: string;
  createdAt?: string;
  /** Codes d'accès rapide table de marque / spectateurs. */
  access?: TournamentAccess;
  /** Dénormalisé depuis le statut commercial de l'organisateur (accès public live). */
  liveEnabled?: boolean;
};

export type TournamentAccess = {
  /** Code table de marque (tablette / PC arbitre). */
  markerCode: string;
  /** Code spectateurs (buette, suivi à distance). */
  spectatorCode: string;
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
  /** Sets de période gagnés (P1 + P2). */
  periodSetsWon: number;
  periodSetsLost: number;
  /** Sets au shoot-out (0 ou 1 par match). */
  shootoutSetsWon: number;
  shootoutSetsLost: number;
  /** Différentiel total sets (gagnés − perdus, périodes + SO). */
  setDiff: number;
  points: number;
};

/** Stats confrontations directes (départage si égalité générale). */
export type HeadToHeadStats = {
  teamId: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  /** Buts marqués / buts encaissés (confrontations directes). */
  goalAverage: number | null;
  periodSetsWon: number;
  periodSetsLost: number;
  shootoutSetsWon: number;
  shootoutSetsLost: number;
  setDiff: number;
  /** Sets gagnés / sets perdus (confrontations directes). */
  setAverage: number | null;
  points: number;
};
