"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * True when the operating system asks for reduced motion.
 *
 * Why not Motion's own useReducedMotion? Two reasons.
 * 1. Hydration. The server cannot know the setting, so it renders "false".
 *    useSyncExternalStore hydrates with that same value and then corrects it,
 *    so React never sees a mismatch.
 * 2. Weight. CSS-layer components (Streak Heatmap, Flow Number, Delta Chip)
 *    need the motion level but should not import Motion just to read a media
 *    query. This hook has no dependencies.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

const noop = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
