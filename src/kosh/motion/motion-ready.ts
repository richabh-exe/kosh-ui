"use client";

import { createContext, useContext } from "react";
import type { MotionLevel } from "./types";

/** True once the Motion feature bundle has loaded. Set by <KoshProvider>. */
export const MotionReadyContext = createContext(false);

/**
 * Should this component render plain elements instead of Motion ones?
 *
 * Yes at "none", and yes until the Motion engine has loaded. The second
 * case matters more than it looks: an `m` element that receives a new
 * `animate` value before the engine exists does not apply it, and when the
 * engine arrives it assumes that value is already on screen. The update is
 * lost and the component shows stale data. Plain elements always show the
 * current data, and the component swaps to Motion elements when it can.
 */
export function usePlainMotion(level: MotionLevel) {
  const ready = useContext(MotionReadyContext);
  return level === "none" || !ready;
}
