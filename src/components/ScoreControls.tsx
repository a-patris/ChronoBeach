import type { Match, Team } from "../types";
import { TeamLogo } from "./TeamLogo";

type Props = {
  match: Match;
  teamA?: Team | null;
  teamB?: Team | null;
  onScore: (team: "A" | "B", delta: number) => void;
};

export function ScoreControls({ match, teamA, teamB, onScore }: Props) {
  return (
    <section className="panel score-controls">
      <h2>Score</h2>
      <div className="score-columns">
        <div className="score-team">
          <div className="score-team-header">
            <TeamLogo team={teamA} size="lg" />
            <h3>{teamA?.name ?? "Équipe A"}</h3>
          </div>
          <p className="big-score">{match.scoreA}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-accent" onClick={() => onScore("A", 1)}>
              +1
            </button>
            <button type="button" className="btn btn-accent" onClick={() => onScore("A", 2)}>
              +2
            </button>
            <button type="button" className="btn btn-outline" onClick={() => onScore("A", -1)}>
              −1
            </button>
            <button type="button" className="btn btn-outline" onClick={() => onScore("A", -2)}>
              −2
            </button>
          </div>
        </div>
        <div className="score-team">
          <div className="score-team-header">
            <TeamLogo team={teamB} size="lg" />
            <h3>{teamB?.name ?? "Équipe B"}</h3>
          </div>
          <p className="big-score">{match.scoreB}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-accent" onClick={() => onScore("B", 1)}>
              +1
            </button>
            <button type="button" className="btn btn-accent" onClick={() => onScore("B", 2)}>
              +2
            </button>
            <button type="button" className="btn btn-outline" onClick={() => onScore("B", -1)}>
              −1
            </button>
            <button type="button" className="btn btn-outline" onClick={() => onScore("B", -2)}>
              −2
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
