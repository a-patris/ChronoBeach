import { useCallback, useEffect, useRef, useState } from "react";
import {
  collectDisplayEventIds,
  DISPLAY_EVENT_DURATION_MS,
  findNewDisplayHighlights,
  type DisplayHighlight,
} from "../displayEvents";
import type { Match, Tournament } from "../types";

export function useDisplayEventQueue(tournament: Tournament, match: Match) {
  const seenRef = useRef(new Set<string>());
  const initRef = useRef(false);
  const matchIdRef = useRef(match.id);
  const queueRef = useRef<DisplayHighlight[]>([]);
  const activeRef = useRef<DisplayHighlight | null>(null);
  const [active, setActive] = useState<DisplayHighlight | null>(null);

  const showNext = useCallback(() => {
    if (activeRef.current) return;
    const next = queueRef.current.shift() ?? null;
    activeRef.current = next;
    setActive(next);
  }, []);

  const dismiss = useCallback(() => {
    activeRef.current = null;
    setActive(null);
    const next = queueRef.current.shift() ?? null;
    if (next) {
      activeRef.current = next;
      setActive(next);
    }
  }, []);

  useEffect(() => {
    if (matchIdRef.current !== match.id) {
      matchIdRef.current = match.id;
      seenRef.current = new Set();
      initRef.current = false;
      queueRef.current = [];
      activeRef.current = null;
      setActive(null);
    }
  }, [match.id]);

  useEffect(() => {
    if (!initRef.current) {
      for (const id of collectDisplayEventIds(match)) seenRef.current.add(id);
      initRef.current = true;
      return;
    }

    const fresh = findNewDisplayHighlights(tournament, match, seenRef.current);
    if (fresh.length === 0) return;

    for (const ev of fresh) seenRef.current.add(ev.id);
    queueRef.current.push(...fresh);
    showNext();
  }, [
    tournament,
    match,
    match.matchSheet?.goals,
    match.matchSheet?.plays,
    match.matchSheet?.sanctions,
    match.shootout?.shots,
    showNext,
  ]);

  useEffect(() => {
    if (!active) return;
    const ms = DISPLAY_EVENT_DURATION_MS[active.variant];
    const timer = window.setTimeout(dismiss, ms);
    return () => clearTimeout(timer);
  }, [active, dismiss]);

  return active;
}
