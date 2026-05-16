import { MATCH_LABEL_PRESETS } from "../schedule";

type Props = {
  label: string;
  scheduledTime: string;
  onLabelChange: (value: string) => void;
  onScheduledTimeChange: (value: string) => void;
  /** Sidebar étroite : champs empilés. */
  compact?: boolean;
};

export function MatchFormFields({
  label,
  scheduledTime,
  onLabelChange,
  onScheduledTimeChange,
  compact = false,
}: Props) {
  const presetValue = MATCH_LABEL_PRESETS.includes(
    label as (typeof MATCH_LABEL_PRESETS)[number],
  )
    ? label
    : "";

  return (
    <div className={`match-form-fields ${compact ? "match-form-fields--compact" : ""}`}>
      <label className="match-field">
        Titre du match
        <div className="match-label-row">
          <input
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="ex. Grande finale, Phase haute…"
          />
          <select
            value={presetValue}
            onChange={(e) => onLabelChange(e.target.value)}
          >
            <option value="">Titre rapide…</option>
            {MATCH_LABEL_PRESETS.filter(Boolean).map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </div>
      </label>
      <label className="match-field">
        Heure prévue
        <input
          value={scheduledTime}
          onChange={(e) => onScheduledTimeChange(e.target.value)}
          placeholder="09H30"
        />
      </label>
    </div>
  );
}
