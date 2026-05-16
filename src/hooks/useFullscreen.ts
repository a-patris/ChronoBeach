import { useCallback, useEffect, useState, type RefObject } from "react";

export function useFullscreen(targetRef?: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(
    () => typeof document !== "undefined" && !!document.fullscreenElement,
  );

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = useCallback(async () => {
    if (document.fullscreenElement) return;
    const el = targetRef?.current ?? document.documentElement;
    await el.requestFullscreen();
  }, [targetRef]);

  const exit = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }, []);

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) await exit();
    else await enter();
  }, [enter, exit]);

  return { active, enter, exit, toggle };
}
