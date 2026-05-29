import {
  ensureMatchSheet,
  getSanctionSubjectLabel,
  playerDisplayName,
  sanctionDisplayHeadline,
  sanctionDisplaySubline,
} from "./matchSheet";
import type {
  GoalEvent,
  Match,
  MatchSanction,
  PlayEvent,
  Shot,
  Team,
  Tournament,
} from "./types";
import { getTeam } from "./utils";

export type DisplayEventVariant =
  | "goal_classic"
  | "goal_kungfu"
  | "goal_360"
  | "goal_penalty"
  | "goal_gk"
  | "goal_specialist"
  | "shot_miss"
  | "save"
  | "so_goal"
  | "so_miss"
  | "so_save"
  | "sanction_warning"
  | "sanction_exclusion"
  | "sanction_disqualification";

export type DisplayHighlight = {
  id: string;
  variant: DisplayEventVariant;
  emoji: string;
  headline: string;
  playerLine: string;
  teamName: string;
  pointsBadge?: string;
  teamSide: "A" | "B";
  at: number;
};

function teamSide(match: Match, teamId: string): "A" | "B" {
  return match.teamAId === teamId ? "A" : "B";
}

function playerLine(team: Team | undefined, playerId?: string): string {
  const player = team?.players?.find((p) => p.id === playerId);
  if (!player) return "Joueur inconnu";
  return `#${player.number} ${playerDisplayName(player)}`;
}

function goalVariant(goal: GoalEvent): DisplayEventVariant {
  switch (goal.goalType) {
    case "kungfu":
      return "goal_kungfu";
    case "360":
      return "goal_360";
    case "penalty6m":
      return "goal_penalty";
    case "goalkeeper":
      return "goal_gk";
    case "specialist":
      return "goal_specialist";
    default:
      return "goal_classic";
  }
}

function goalCopy(
  goal: GoalEvent,
): Pick<DisplayHighlight, "emoji" | "headline" | "pointsBadge"> {
  const pts = goal.points === 2 ? "+2" : "+1";
  switch (goal.goalType) {
    case "kungfu":
      return {
        emoji: "🥋",
        headline: "KUNG-FU !",
        pointsBadge: pts,
      };
    case "360":
      return {
        emoji: "🌀",
        headline: "360° !",
        pointsBadge: pts,
      };
    case "penalty6m":
      return {
        emoji: "🎯",
        headline: "6 MÈTRES !",
        pointsBadge: pts,
      };
    case "goalkeeper":
      return {
        emoji: "🧤",
        headline: "BUT GARDIEN !",
        pointsBadge: pts,
      };
    case "specialist":
      return {
        emoji: "⭐",
        headline: "BUT SPÉCIALISTE !",
        pointsBadge: pts,
      };
    default:
      if (goal.points === 2) {
        return { emoji: "⚡", headline: "BUT +2 !", pointsBadge: pts };
      }
      return { emoji: "⚽", headline: "BUT !", pointsBadge: pts };
  }
}

function goalSubline(goal: GoalEvent, player: string): string {
  switch (goal.goalType) {
    case "kungfu":
      return `Splendide kung-fu de ${player}`;
    case "360":
      return `Magnifique 360° de ${player}`;
    case "penalty6m":
      return `Jet de 6 m réussi — ${player}`;
    case "goalkeeper":
      return `Exploit du gardien ${player}`;
    case "specialist":
      return `Feu d'artifice du spécialiste ${player}`;
    default:
      return player;
  }
}

function highlightFromGoal(
  tournament: Tournament,
  match: Match,
  goal: GoalEvent,
): DisplayHighlight {
  const team = getTeam(tournament, goal.teamId);
  const player = playerLine(team, goal.playerId);
  const copy = goalCopy(goal);
  return {
    id: `goal:${goal.id}`,
    variant: goalVariant(goal),
    emoji: copy.emoji,
    headline: copy.headline,
    playerLine: goalSubline(goal, player),
    teamName: team?.name ?? "Équipe",
    pointsBadge: copy.pointsBadge,
    teamSide: teamSide(match, goal.teamId),
    at: goal.at ?? 0,
  };
}

function highlightFromPlay(
  tournament: Tournament,
  match: Match,
  play: PlayEvent,
): DisplayHighlight {
  const team = getTeam(tournament, play.teamId);
  const player = playerLine(team, play.playerId);
  if (play.type === "save") {
    return {
      id: `play:${play.id}`,
      variant: "save",
      emoji: "🛡️",
      headline: "ARRÊT !",
      playerLine: `Arrêt de ${player}`,
      teamName: team?.name ?? "Équipe",
      teamSide: teamSide(match, play.teamId),
      at: play.at ?? 0,
    };
  }
  return {
    id: `play:${play.id}`,
    variant: "shot_miss",
    emoji: "💨",
    headline: "TIR RATÉ",
    playerLine: `Tir manqué — ${player}`,
    teamName: team?.name ?? "Équipe",
    teamSide: teamSide(match, play.teamId),
    at: play.at ?? 0,
  };
}

function highlightFromShot(
  tournament: Tournament,
  match: Match,
  shot: Shot,
): DisplayHighlight {
  const team = getTeam(tournament, shot.teamId);
  const player = playerLine(team, shot.playerId);
  const side = teamSide(match, shot.teamId);

  if (shot.result === "goal") {
    const pts = shot.points === 2 ? "+2" : "+1";
    return {
      id: `shot:${shot.id}`,
      variant: "so_goal",
      emoji: "⚽",
      headline: "BUT !",
      playerLine: player,
      teamName: team?.name ?? "Équipe",
      pointsBadge: pts,
      teamSide: side,
      at: 0,
    };
  }
  if (shot.result === "save") {
    return {
      id: `shot:${shot.id}`,
      variant: "so_save",
      emoji: "🛡️",
      headline: "ARRÊT !",
      playerLine: `Arrêt sur le tir de ${player}`,
      teamName: team?.name ?? "Équipe",
      teamSide: side,
      at: 0,
    };
  }
  return {
    id: `shot:${shot.id}`,
    variant: "so_miss",
    emoji: "❌",
    headline: "RATÉ !",
    playerLine: `Tir manqué — ${player}`,
    teamName: team?.name ?? "Équipe",
    teamSide: side,
    at: 0,
  };
}

function highlightFromSanction(
  tournament: Tournament,
  match: Match,
  sanction: MatchSanction,
): DisplayHighlight {
  const team = getTeam(tournament, sanction.teamId);
  const sideKey = sanction.teamId === match.teamAId ? "teamA" : "teamB";
  const sideData = ensureMatchSheet(match)[sideKey];
  const subject = getSanctionSubjectLabel(team, sideData, sanction);
  const variantMap = {
    warning: "sanction_warning",
    exclusion: "sanction_exclusion",
    disqualification: "sanction_disqualification",
  } as const;
  const emojiMap = {
    warning: "🟨",
    exclusion: "↩",
    disqualification: "🟥",
  } as const;
  return {
    id: `sanction:${sanction.id}`,
    variant: variantMap[sanction.type],
    emoji: emojiMap[sanction.type],
    headline: sanctionDisplayHeadline(sanction.type),
    playerLine: sanctionDisplaySubline(sanction.type, subject),
    teamName: team?.name ?? "Équipe",
    teamSide: teamSide(match, sanction.teamId),
    at: sanction.at ?? 0,
  };
}

/** Tous les ids d'événements affichables pour un match. */
export function collectDisplayEventIds(match: Match): string[] {
  const ids: string[] = [];
  const sheet = match.matchSheet;
  if (sheet) {
    for (const g of sheet.goals) ids.push(`goal:${g.id}`);
    for (const p of sheet.plays ?? []) ids.push(`play:${p.id}`);
    for (const s of sheet.sanctions) ids.push(`sanction:${s.id}`);
  }
  if (match.shootout) {
    for (const s of match.shootout.shots) ids.push(`shot:${s.id}`);
  }
  return ids;
}

/** Événements non encore vus, triés chronologiquement. */
export function findNewDisplayHighlights(
  tournament: Tournament,
  match: Match,
  seen: Set<string>,
): DisplayHighlight[] {
  const found: DisplayHighlight[] = [];
  const sheet = match.matchSheet;

  if (sheet) {
    for (const g of sheet.goals) {
      const id = `goal:${g.id}`;
      if (!seen.has(id)) found.push(highlightFromGoal(tournament, match, g));
    }
    for (const p of sheet.plays ?? []) {
      const id = `play:${p.id}`;
      if (!seen.has(id)) found.push(highlightFromPlay(tournament, match, p));
    }
    for (const s of sheet.sanctions) {
      const id = `sanction:${s.id}`;
      if (!seen.has(id)) found.push(highlightFromSanction(tournament, match, s));
    }
  }

  if (match.shootout) {
    match.shootout.shots.forEach((s, i) => {
      const id = `shot:${s.id}`;
      if (!seen.has(id)) {
        const h = highlightFromShot(tournament, match, s);
        found.push({ ...h, at: 200000 + i });
      }
    });
  }

  return found.sort((a, b) => a.at - b.at);
}

export const DISPLAY_EVENT_DURATION_MS: Record<DisplayEventVariant, number> = {
  goal_classic: 4500,
  goal_kungfu: 5500,
  goal_360: 5000,
  goal_penalty: 5000,
  goal_gk: 5000,
  goal_specialist: 5000,
  shot_miss: 3500,
  save: 4000,
  so_goal: 4500,
  so_miss: 3500,
  so_save: 4000,
  sanction_warning: 4000,
  sanction_exclusion: 4500,
  sanction_disqualification: 5000,
};
