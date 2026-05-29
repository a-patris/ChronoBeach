type Props = {
  active: boolean;
  onEnter: () => void | Promise<void>;
  onExit: () => void | Promise<void>;
  className?: string;
};

export function FullscreenToggle({
  active,
  onEnter,
  onExit,
  className = "kiosk-fs-btn",
}: Props) {
  return (
    <button
      type="button"
      className={`${className}${active ? " kiosk-fs-btn--exit" : ""}`}
      onClick={() => void (active ? onExit() : onEnter())}
      title={active ? "Quitter le plein écran (Échap)" : "Passer en plein écran"}
    >
      {active ? "Quitter plein écran" : "Plein écran"}
    </button>
  );
}
