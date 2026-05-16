import type { Team } from "../types";

export type TeamLogoSize = "xs" | "sm" | "md" | "lg" | "display";

type Props = {
  team?: Pick<Team, "name" | "logo"> | null;
  name?: string;
  size?: TeamLogoSize;
  className?: string;
};

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export function TeamLogo({ team, name, size = "md", className = "" }: Props) {
  const label = team?.name ?? name ?? "?";
  const classes = `team-logo team-logo--${size} ${className}`.trim();

  if (team?.logo) {
    return <img src={team.logo} alt="" className={classes} title={label} />;
  }

  return (
    <span className={`${classes} team-logo--placeholder`} title={label} aria-hidden>
      {initials(label)}
    </span>
  );
}
