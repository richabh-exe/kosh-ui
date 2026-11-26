"use client";

import { createContext, useContext } from "react";
import type { MotionLevel, MotionPreference } from "./types";
import { useReducedMotion } from "./use-reduced-motion";

/** The app-wide setting, provided by <KoshProvider motion>. */
export const KoshMotionContext = createContext<MotionPreference>("auto");

const rank = { none: 0, reduced: 1, full: 2 } as const;

/** The calmest of the given settings. "auto" and undefined have no opinion. */
export function calmest(
  ...values: (MotionPreference | undefined)[]
): MotionLevel | undefined {
  const levels = values.filter((v): v is MotionLevel => !!v && v !== "auto");
  if (levels.length === 0) return undefined;
  return levels.reduce((a, b) => (rank[a] < rank[b] ? a : b));
}

/**
 * Resolve one motion level from three places: the component's prop, the
 * app-wide provider, and the operating system. The calmest one wins, so no
 * prop can override an OS request for reduced motion.
 */
export function useMotionLevel(prop?: MotionPreference): MotionLevel {
  const app = useContext(KoshMotionContext);
  const os = useReducedMotion() ? "reduced" : "full";
  return [prop, app, os]
    .filter((v): v is MotionLevel => !!v && v !== "auto")
    .reduce((a, b) => (rank[a] < rank[b] ? a : b));
}
