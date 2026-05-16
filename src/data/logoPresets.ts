export type LogoPreset = {
  id: string;
  label: string;
  path: string;
};

/** Logos fournis dans public/logos/presets — proposés à la création d'équipe. */
export const LOGO_PRESETS: LogoPreset[] = [
  { id: "bho", label: "BHO", path: "/logos/presets/bho.webp" },
  { id: "occitanie", label: "Occitanie", path: "/logos/presets/occitanie.jpg" },
  { id: "ventoux", label: "Sélection Ventoux", path: "/logos/presets/selection-ventoux.png" },
  { id: "logo-4", label: "Logo 4", path: "/logos/presets/logo-4.webp" },
  { id: "logo-5", label: "Logo 5", path: "/logos/presets/logo-5.jpeg" },
];
