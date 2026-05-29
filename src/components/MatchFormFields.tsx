import { MATCH_LABEL_PRESETS } from "../schedule";

type Props = {
  label: string;
  courtLabel?: string;
  scheduledTime: string;
  onLabelChange: (value: string) => void;
  onCourtLabelChange?: (value: string) => void;
  onScheduledTimeChange: (value: string) => void;
  compact?: boolean;
};

export function MatchFormFields({
  label,
  courtLabel = "",
  scheduledTime,
  onLabelChange,
  onCourtLabelChange,
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
      {onCourtLabelChange && (
        <label className="match-field">
          Terrain
          <input
            value={courtLabel}
            onChange={(e) => onCourtLabelChange(e.target.value)}
            placeholder="ex. Terrain 1, Court A…"
          />
        </label>
      )}
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
