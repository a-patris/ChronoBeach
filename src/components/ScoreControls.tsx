import type { GoalType, Match, Team } from "../types";
import { TeamLogo } from "./TeamLogo";

type Props = {
  match: Match;
  teamA?: Team | null;
  teamB?: Team | null;
  onScore: (team: "A" | "B", delta: number, goalType?: GoalType) => void;
};

const GOAL_TYPES: { type: GoalType; label: string }[] = [
  { type: "360", label: "360°" },
  { type: "kungfu", label: "Kung-fu" },
  { type: "goalkeeper", label: "GK" },
  { type: "penalty6m", label: "6 m" },
];

function TeamScoreColumn({
  side,
  team,
  score,
  onScore,
}: {
  side: "A" | "B";
  team?: Team | null;
  score: number;
  onScore: Props["onScore"];
}) {
  return (
    <div className="score-team">
      <div className="score-team-header">
        <TeamLogo team={team} size="lg" />
        <h3>{team?.name ?? `Équipe ${side}`}</h3>
      </div>
      <p className="big-score">{score}</p>
      <div className="btn-row">
        <button type="button" className="btn btn-accent" onClick={() => onScore(side, 1)}>
          +1
        </button>
        <button type="button" className="btn btn-accent" onClick={() => onScore(side, 2)}>
          +2
        </button>
        <button type="button" className="btn btn-outline" onClick={() => onScore(side, -1)}>
          −1
        </button>
        <button type="button" className="btn btn-outline" onClick={() => onScore(side, -2)}>
          −2
        </button>
      </div>
      <div className="score-goal-types">
        <span className="hint">Buts +2 :</span>
        <div className="btn-row btn-row-compact">
          {GOAL_TYPES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onScore(side, 2, type)}
              title={`But ${label} (+2)`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScoreControls({ match, teamA, teamB, onScore }: Props) {
  return (
    <section className="panel score-controls">
      <h2>Score</h2>
      <div className="score-columns">
        <TeamScoreColumn side="A" team={teamA} score={match.scoreA} onScore={onScore} />
        <TeamScoreColumn side="B" team={teamB} score={match.scoreB} onScore={onScore} />
      </div>
    </section>
  );
}
