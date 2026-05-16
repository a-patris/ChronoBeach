import { LOGO_PRESETS } from "../data/logoPresets";

type Props = {
  selected?: string;
  onSelect: (path: string | undefined) => void;
};

export function LogoPresetPicker({ selected, onSelect }: Props) {
  return (
    <div className="logo-preset-picker">
      <p className="logo-preset-label">Logo proposé</p>
      <div className="logo-preset-grid">
        {LOGO_PRESETS.map((preset) => {
          const isActive = selected === preset.path;
          return (
            <button
              key={preset.id}
              type="button"
              className={`logo-preset-btn ${isActive ? "logo-preset-btn--active" : ""}`}
              title={preset.label}
              onClick={() => onSelect(isActive ? undefined : preset.path)}
            >
              <img src={preset.path} alt="" />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
      {selected && (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onSelect(undefined)}>
          Aucun logo
        </button>
      )}
    </div>
  );
}
