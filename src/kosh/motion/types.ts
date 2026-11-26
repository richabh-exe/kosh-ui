/** What a component actually does: the resolved level. */
export type MotionLevel = "none" | "reduced" | "full";

/**
 * What someone asks for: a level, or "auto" (follow the operating system).
 *
 * Named MotionPreference rather than MotionValue on purpose. Motion for React
 * already exports a class called MotionValue, and components such as Morph
 * Bars will import both.
 */
export type MotionPreference = MotionLevel | "auto";

export type KoshTone = "ink" | "signal" | "muted";

/**
 * The one API shape every Kosh component shares.
 * TData is the component's own data type.
 */
export interface KoshComponentProps<TData> {
  /** The data to show. A new reference with new values triggers an update. */
  data: TData;
  /** Motion for this component only. The calmest of prop, app and OS wins. */
  motion?: MotionPreference;
  /** Which colour carries the data. */
  tone?: KoshTone;
  /** Called once the component has come to rest after an enter or update. */
  onSettle?: () => void;
  className?: string;
}

export const MOTION_LEVELS = ["full", "reduced", "none"] as const;

export function isMotionLevel(value: unknown): value is MotionLevel {
  return value === "full" || value === "reduced" || value === "none";
}
