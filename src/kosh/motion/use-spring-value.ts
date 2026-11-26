"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { springs, type SpringName } from "./tokens";
import type { MotionLevel } from "./types";

/**
 * Springs one number toward `target` and hands you every frame.
 *
 * Use it when one spring has to drive several transforms at once, which
 * Motion's `animate` prop cannot do (each element would get its own spring
 * and they would drift apart). Fill Ring uses it: one progress value turns
 * two half-rings.
 *
 *  - `onChange(value)` runs every frame. Write transforms to refs in it.
 *    Do not set React state there: that would re-render 60 times a second.
 *  - The spring keeps its velocity when `target` changes mid-flight, so an
 *    update during an animation changes direction smoothly.
 *  - At "reduced" and "none" there is no travel: the value jumps to `target`.
 *  - `onRest` fires once each time the value comes to rest.
 *
 * Tuned for values in roughly the 0 to 1 range (see `precision`).
 */
export function useSpringValue(
  target: number,
  {
    level,
    preset = "pop",
    precision = 0.0005,
    onChange,
    onRest,
  }: {
    level: MotionLevel;
    preset?: SpringName;
    precision?: number;
    onChange: (value: number) => void;
    onRest?: () => void;
  },
) {
  const state = useRef({
    value: target,
    velocity: 0,
    to: target,
    frame: 0,
    last: 0,
  });
  const change = useEffectEvent(onChange);
  const rest = useEffectEvent(() => onRest?.());

  useEffect(() => {
    const s = state.current;
    if (s.to === target && s.value === target) return; // already there
    s.to = target;

    if (level !== "full") {
      cancelAnimationFrame(s.frame);
      s.frame = 0;
      s.value = target;
      s.velocity = 0;
      change(target);
      rest();
      return;
    }

    const { stiffness, damping, mass } = springs[preset];
    const tick = (now: number) => {
      // Integrate in 4 ms slices. A stiff spring stepped a whole frame at a
      // time overshoots wildly, or explodes after a dropped frame.
      let remaining = Math.min(0.064, (now - s.last) / 1000);
      s.last = now;
      while (remaining > 0) {
        const h = Math.min(remaining, 0.004);
        const force = -stiffness * (s.value - s.to) - damping * s.velocity;
        s.velocity += (force / mass) * h;
        s.value += s.velocity * h;
        remaining -= h;
      }
      const atRest =
        Math.abs(s.value - s.to) < precision &&
        Math.abs(s.velocity) < precision * 10;
      if (atRest) {
        s.value = s.to;
        s.velocity = 0;
        s.frame = 0;
        change(s.value);
        rest();
        return;
      }
      change(s.value);
      s.frame = requestAnimationFrame(tick);
    };
    // If a loop is already running it simply heads for the new target.
    if (!s.frame) {
      s.last = performance.now();
      s.frame = requestAnimationFrame(tick);
    }
    // No cleanup here on purpose: a new target must not stop the spring.
  }, [target, level, preset, precision]);

  useEffect(() => {
    const s = state.current;
    return () => {
      cancelAnimationFrame(s.frame);
      s.frame = 0;
    };
  }, []);
}
