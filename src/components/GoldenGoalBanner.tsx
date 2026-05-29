import type { Match } from "../types";

type Props = {
  match: Match;
};

export function GoldenGoalBanner({ match }: Props) {
  if (!match.goldenGoalActive) return null;

  return (
    <div className="golden-goal-banner" role="status">
      <span className="golden-goal-icon">⚡</span>
      <div>
        <strong>Golden Goal</strong>
        <p>Période {match.period} — égalité {match.scoreA}-{match.scoreB}. Premier but gagne le set.</p>
      </div>
    </div>
  );
}
