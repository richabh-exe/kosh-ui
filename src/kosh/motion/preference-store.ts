import { isMotionLevel, type MotionPreference } from "./types";

/**
 * The visitor's own choice from <MotionSwitch>, kept in localStorage.
 *
 * It is a tiny external store (for useSyncExternalStore) rather than React
 * state, so the choice is read once, shared by every subscriber, and stays
 * in step across browser tabs.
 *
 * Every localStorage call sits in try/catch: storage throws in private
 * windows, when site data is blocked, and in some embedded previews. When it
 * does, the choice still works for this page view, held in memory.
 */

export const DEFAULT_STORAGE_KEY = "kosh-motion";

const listeners = new Set<() => void>();
const memory = new Map<string, MotionPreference>();

export function readPreference(key: string): MotionPreference {
  const held = memory.get(key);
  if (held) return held;
  try {
    const stored = window.localStorage.getItem(key);
    return isMotionLevel(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

export function writePreference(key: string, value: MotionPreference) {
  memory.set(key, value);
  try {
    if (value === "auto") window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage is unavailable. The in-memory value above still applies.
  }
  listeners.forEach((listener) => listener());
}

export function subscribePreference(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    // Another tab changed it: drop our copy so the next read is fresh.
    if (event.key) memory.delete(event.key);
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
