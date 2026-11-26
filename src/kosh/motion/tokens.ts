/**
 * Motion tokens for JavaScript (Motion for React).
 * The CSS mirror is tokens.css. Keep the two files in step.
 */

/** Spring presets. Each has a linear() twin in tokens.css (--k-spring-*). */
export const springs = {
  /** Overshoots by about 11%, settles in ~400 ms. Bars, rings, marks. */
  pop: { type: "spring", stiffness: 760, damping: 35, mass: 1 },
  /** No overshoot, settles in ~400 ms. Lines, numbers, anything precise. */
  settle: { type: "spring", stiffness: 485, damping: 43, mass: 1 },
  /** No overshoot, ~380 ms. Reordering and rows making room. */
  slide: { type: "spring", stiffness: 380, damping: 36, mass: 1 },
} as const;

/** Durations in seconds, as Motion expects. */
export const durations = {
  fast: 0.15,
  fade: 0.24,
  roll: 0.3,
  pop: 0.32,
  slide: 0.38,
  spring: 0.4,
  ripple: 0.6,
  enter: 0.7,
  cool: 2.4,
} as const;

/** Cubic-bezier easings, as Motion expects. */
export const easings = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  pop: [0.34, 1.56, 0.64, 1],
} as const;

export type SpringName = keyof typeof springs;
