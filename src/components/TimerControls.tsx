import { formatTime, computeRemainingSeconds } from "../utils";
import { useClockTick } from "../hooks/useClockTick";
import type { Match } from "../types";

type Props = {
  match: Match;
  teamAName: string;
  teamBName: string;
  canTimeoutA: boolean;
  canTimeoutB: boolean;
  onDurationChange: (seconds: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onAdjust: (delta: number) => void;
  onTimeoutA: () => void;
  onTimeoutB: () => void;
  onCancelTimeout: () => void;
};

export function TimerControls({
  match,
  teamAName,
  teamBName,
  canTimeoutA,
  canTimeoutB,
  onDurationChange,
  onStart,
  onPause,
  onReset,
  onAdjust,
  onTimeoutA,
  onTimeoutB,
  onCancelTimeout,
}: Props) {
  const durationMin = Math.floor(match.durationSeconds / 60);
  const now = useClockTick(1000, match.timer.running);
  const remaining = computeRemainingSeconds(match, now);

  return (
    <section className="panel timer-controls">
      <h2>Chrono</h2>
      <p className="timer-display">{formatTime(remaining)}</p>
      <label className="field-inline">
        Durée (min)
        <input
          type="number"
          min={1}
          max={30}
          value={durationMin}
          disabled={match.status !== "ready"}
          onChange={(e) => onDurationChange(Number(e.target.value) * 60)}
        />
      </label>
      <div className="btn-row timer-btn-row">
        <button
          type="button"
          className="btn btn-success"
          onClick={onStart}
          disabled={match.timer.running}
        >
          Start
        </button>
        <button
          type="button"
          className="btn btn-warning btn-tm"
          disabled={!canTimeoutA}
          onClick={onTimeoutA}
          title={`Temps mort ${teamAName}`}
        >
          TM {teamAName}
        </button>
        <button
          type="button"
          className="btn btn-warning btn-tm"
          disabled={!canTimeoutB}
          onClick={onTimeoutB}
          title={`Temps mort ${teamBName}`}
        >
          TM {teamBName}
        </button>
        <button
          type="button"
          className="btn btn-warning"
          onClick={onPause}
          disabled={!match.timer.running}
        >
          Pause
        </button>
        <button type="button" className="btn btn-outline" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="btn btn-outline" onClick={() => onAdjust(30)}>
          +30s
        </button>
        <button type="button" className="btn btn-outline" onClick={() => onAdjust(-30)}>
          −30s
        </button>
        {match.timeout && (
          <button type="button" className="btn btn-outline" onClick={onCancelTimeout}>
            Annuler TM
          </button>
        )}
      </div>
    </section>
  );
}
