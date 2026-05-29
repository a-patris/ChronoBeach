import { useEffect, useState } from "react";

/** Horloge locale pour afficher un chrono sans écrire dans Firestore à chaque seconde. */
export function useClockTick(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);

  return now;
}
