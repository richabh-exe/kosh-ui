"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { LazyMotion, MotionConfig, MotionGlobalConfig } from "motion/react";
import {
  DEFAULT_STORAGE_KEY,
  readPreference,
  subscribePreference,
  writePreference,
} from "./preference-store";
import { MotionReadyContext } from "./motion-ready";
import type { MotionLevel, MotionPreference } from "./types";
import { calmest, KoshMotionContext, useMotionLevel } from "./use-motion-level";
import { useHydrated } from "./use-reduced-motion";

interface MotionControl {
  /** What the visitor picked in <MotionSwitch>, or "auto" if nothing yet. */
  preference: MotionPreference;
  setPreference: (value: MotionPreference) => void;
}

const MotionControlContext = createContext<MotionControl>({
  preference: "auto",
  setPreference: () => {},
});

/** Read and change the visitor's stored choice. Used by <MotionSwitch>. */
export function useMotionControl(): MotionControl {
  return useContext(MotionControlContext);
}

export interface KoshProviderProps {
  /** The app-wide motion setting. Default "auto": follow the OS. */
  motion?: MotionPreference;
  /**
   * localStorage key for the visitor's own choice. Pass null to turn
   * persistence off, for example when there is no <MotionSwitch>.
   */
  storageKey?: string | null;
  children: ReactNode;
}

const subscribeNothing = () => () => {};

/**
 * App-wide motion settings. Wrap the app once, in the root layout.
 *
 *   <KoshProvider motion="auto">{children}</KoshProvider>
 */
export function KoshProvider({
  motion = "auto",
  storageKey = DEFAULT_STORAGE_KEY,
  children,
}: KoshProviderProps) {
  const stored = useSyncExternalStore(
    storageKey ? subscribePreference : subscribeNothing,
    () => (storageKey ? readPreference(storageKey) : "auto"),
    () => "auto" as MotionPreference,
  );

  const setPreference = useCallback(
    (value: MotionPreference) => {
      if (storageKey) writePreference(storageKey, value);
    },
    [storageKey],
  );

  const control = useMemo(
    () => ({ preference: stored, setPreference }),
    [stored, setPreference],
  );

  // The developer's prop and the visitor's choice are both "app" settings.
  // The calmer of the two is what components see.
  const app = calmest(motion, stored) ?? "auto";

  return (
    <KoshMotionContext.Provider value={app}>
      <MotionControlContext.Provider value={control}>
        <MotionBridge>{children}</MotionBridge>
      </MotionControlContext.Provider>
    </KoshMotionContext.Provider>
  );
}

/**
 * A promise that only starts downloading the Motion feature bundle once
 * someone opens the gate. LazyMotion asks for its features on mount; this
 * lets us answer "not yet" for as long as the level is "none".
 */
function createFeatureGate() {
  let open: () => void = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  // One download, shared by LazyMotion and by anyone who wants to know when
  // it has finished.
  const features = opened
    .then(() => import("./features"))
    .then((mod) => mod.default);
  return { open, load: () => features, loaded: features.then(() => {}) };
}

/** Connects the resolved level to the document and to Motion. */
function MotionBridge({ children }: { children: ReactNode }) {
  const level: MotionLevel = useMotionLevel();
  const hydrated = useHydrated();
  const [gate] = useState(createFeatureGate);
  // Components render plain elements until this is true: see motion-ready.ts.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let current = true;
    void gate.loaded.then(() => {
      if (current) setReady(true);
    });
    return () => {
      current = false;
    };
  }, [gate]);

  // 1. CSS: mirror the level on <html> so [data-motion] rules apply.
  //    Skipped until hydration finishes, because until then `level` is the
  //    server's guess and the inline <MotionScript> has already set the
  //    correct value.
  useLayoutEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.motion = level;
  }, [level, hydrated]);

  // 2. Motion: at "none", finish every animation instantly, and do not
  //    download the animation engine at all unless it is needed.
  useEffect(() => {
    if (!hydrated) return;
    MotionGlobalConfig.skipAnimations = level === "none";
    if (level === "none") return;
    // Fetch the engine when the browser is idle, not in the middle of page
    // load: nothing needs to animate before someone has had time to act.
    // The timeout caps the wait on a busy page.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(gate.open, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(gate.open, 300);
    return () => window.clearTimeout(id);
  }, [level, hydrated, gate]);

  // 3. Motion: at "reduced", Motion's own reduced mode drops transform and
  //    layout animation and keeps opacity and colour. "never" at full is
  //    safe because `level` already includes the OS setting.
  return (
    <LazyMotion features={gate.load} strict>
      <MotionConfig reducedMotion={level === "full" ? "never" : "always"}>
        <MotionReadyContext.Provider value={ready}>
          {children}
        </MotionReadyContext.Provider>
      </MotionConfig>
    </LazyMotion>
  );
}
