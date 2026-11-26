"use client";

import { useRef, type KeyboardEvent } from "react";
import { useMotionControl } from "./kosh-provider";
import { MOTION_LEVELS, type MotionLevel } from "./types";
import { useMotionLevel } from "./use-motion-level";
import { useHydrated, useReducedMotion } from "./use-reduced-motion";

const LABELS: Record<MotionLevel, string> = {
  full: "Full",
  reduced: "Reduced",
  none: "None",
};

/**
 * Full / Reduced / None, for the visitor.
 *
 * The highlighted option is always the level in effect, not just the last
 * click. If the operating system asks for reduced motion, "Full" is shown as
 * unavailable: the calmest setting wins, and the control says so honestly.
 *
 * Styles are in motion-switch.css.
 */
export function MotionSwitch({ className }: { className?: string }) {
  const { setPreference } = useMotionControl();
  const level = useMotionLevel();
  const osReduced = useReducedMotion();
  const hydrated = useHydrated();
  const group = useRef<HTMLDivElement>(null);

  const index = MOTION_LEVELS.indexOf(level);
  const available = (option: MotionLevel) => !(osReduced && option === "full");

  // Radio-group keyboard pattern: arrows move and select, Tab leaves.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const options = MOTION_LEVELS.filter(available);
    const current = options.indexOf(level);
    const next = options[(current + step + options.length) % options.length];
    if (!next) return;
    setPreference(next);
    group.current
      ?.querySelector<HTMLButtonElement>(`[data-option="${next}"]`)
      ?.focus();
  }

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label="Motion"
      className={className ? `k-switch ${className}` : "k-switch"}
      // Until hydration we do not know the visitor's level. The thumb's
      // position comes from CSS (keyed on <html data-motion>) meanwhile.
      data-ready={hydrated ? "" : undefined}
      style={hydrated ? { ["--k-switch-index" as string]: index } : undefined}
      onKeyDown={onKeyDown}
    >
      <span className="k-switch__thumb" aria-hidden="true" />
      {MOTION_LEVELS.map((option) => {
        const checked = hydrated && option === level;
        const enabled = available(option);
        return (
          <button
            key={option}
            type="button"
            role="radio"
            data-option={option}
            aria-checked={checked}
            aria-disabled={enabled ? undefined : true}
            title={
              enabled
                ? undefined
                : "Your system asks for reduced motion. Kosh never overrides it."
            }
            tabIndex={checked || (!hydrated && option === "full") ? 0 : -1}
            className="k-switch__option"
            onClick={() => enabled && setPreference(option)}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
