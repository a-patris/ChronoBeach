import { useRef, useState } from "react";
import type { Team } from "../types";
import { fileToTeamLogo } from "../utils";
import { TeamLogo } from "./TeamLogo";

type Props = {
  team: Team;
  onChange: (logo: string | undefined) => void;
};

export function TeamLogoUpload({ team, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await fileToTeamLogo(file);
      onChange(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="team-logo-upload">
      <TeamLogo team={team} size="md" />
      <div className="team-logo-upload-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          id={`logo-${team.id}`}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <label htmlFor={`logo-${team.id}`} className="btn btn-outline btn-sm">
          {loading ? "…" : team.logo ? "Changer" : "Ajouter logo"}
        </label>
        {team.logo && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(undefined)}>
            Retirer
          </button>
        )}
        {error && <span className="logo-error">{error}</span>}
      </div>
    </div>
  );
}
