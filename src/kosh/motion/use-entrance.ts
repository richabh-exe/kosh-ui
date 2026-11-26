"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionLevel } from "./types";

/**
 *   "static"  no entrance: the final state, as the server rendered it
 *   "armed"   off screen after hydration: hidden, waiting to perform
 *   "in"      scrolled into view: play the entrance now
 */
export type EntrancePhase = "static" | "armed" | "in";

/**
 * A one-off entrance for things below the fold.
 *
 * The rule it protects is "final state first". The server render is always
 * the finished component. This hook only ever hides something that is
 * completely off screen, then lets it enter when it scrolls into view.
 * Anything even partly visible at load stays as it is: hiding it after it
 * has been seen would be a flicker, not an entrance.
 *
 * Entrances are movement, so they only happen at "full". After `duration`
 * the phase returns to "static", so later updates animate normally.
 */
export function useEntrance<T extends Element>(
  enabled: boolean,
  level: MotionLevel,
  duration = 1200,
) {
  const ref = useRef<T>(null);
  const [phase, setPhase] = useState<EntrancePhase>("static");
  const active = enabled && level === "full";

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    let first = true;
    let done = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (first) {
          first = false;
          if (entry.isIntersecting) observer.disconnect();
          else setPhase("armed");
          return;
        }
        // In view: a third of it showing, or (for tall things) half a screen.
        const enough =
          entry.intersectionRatio >= 0.35 ||
          entry.intersectionRect.height >= window.innerHeight * 0.5;
        if (enough) {
          observer.disconnect();
          setPhase("in");
          done = window.setTimeout(() => setPhase("static"), duration);
        }
      },
      { threshold: [0, 0.35, 0.7] },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(done);
    };
  }, [active, duration]);

  return [ref, active ? phase : "static"] as const;
}
