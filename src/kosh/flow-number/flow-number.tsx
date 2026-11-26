"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { KoshComponentProps, MotionLevel } from "../motion/types";
import { useMotionLevel } from "../motion/use-motion-level";
import "./flow-number.css";

export interface FlowNumberProps extends KoshComponentProps<number> {
  /** Passed to Intl.NumberFormat. Default: no fraction digits. */
  format?: Intl.NumberFormatOptions;
  /** Default "en-US". */
  locale?: string;
  /** Shown before the number, for example "₹". */
  prefix?: string;
  /** Shown after the number, for example "%". */
  suffix?: string;
  /** Reserve room for at least this many characters, so growth never shifts the layout. */
  minChars?: number;
}

// Each digit slot is a window onto a vertical reel: "0…9" three times over.
// The reel rests in the middle copy, so it can always roll the short way in
// either direction (9 → 0 is one step up, not nine steps back).
const COPIES = 3;
const REEL = Array.from({ length: COPIES * 10 }, (_, i) => i % 10).join("\n");
const REST = 10; // first index of the middle copy
const DEFAULT_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };

function Digit({
  digit,
  trend,
  level,
  index,
  update,
}: {
  digit: number;
  trend: number;
  level: MotionLevel;
  /** Position from the right. The units digit is 0. */
  index: number;
  /** Counts the number's updates, so a digit knows if it changed in the latest one. */
  update: number;
}) {
  const [reel, setReel] = useState({
    digit,
    pos: REST + digit,
    snap: true,
    changes: 0,
    changedAt: 0,
  });

  // Derive the next reel position while rendering: React's pattern for state
  // that depends on the previous props. No effect, and no extra frame.
  if (reel.digit !== digit) {
    const forward = (digit - reel.digit + 10) % 10;
    const step = trend < 0 ? forward - 10 : forward;
    const next = reel.pos + step;
    const canRoll = level === "full" && next >= 0 && next < COPIES * 10;
    setReel({
      digit,
      // At reduced and none there is no transition, so no transitionend will
      // re-centre the reel later. Go straight to the resting position.
      pos: canRoll ? next : REST + digit,
      snap: !canRoll,
      changes: reel.changes + 1,
      changedAt: update,
    });
  }

  return (
    <span className="k-flow__slot">
      <span
        className="k-flow__reel"
        // The glyphs are drawn twice by CSS from this attribute: once in the
        // resting colour and once in the trend colour on top. A changed digit
        // shows the trend layer, which then fades away. Colour changes by
        // cross-fading two layers' opacity, never by animating `color`.
        data-reel={REEL}
        // Alternating the value restarts that fade on every change.
        data-flash={reel.changes === 0 ? undefined : reel.changes % 2}
        // Changed in the latest update. At "none" nothing can fade, so these
        // digits simply keep the trend colour until the next update.
        data-fresh={update > 0 && reel.changedAt === update ? "" : undefined}
        style={{
          transform: `translateY(${(-reel.pos / (COPIES * 10)) * 100}%)`,
          transition: reel.snap ? "none" : undefined,
          // Stagger from the units digit leftwards: the eye follows the carry.
          transitionDelay: reel.snap
            ? undefined
            : `${Math.min(index, 6) * 20}ms`,
        }}
        onTransitionEnd={() =>
          // Rolled into another copy: hop back to the middle, invisibly.
          setReel((r) => ({ ...r, pos: REST + r.digit, snap: true }))
        }
      />
    </span>
  );
}

/** True while any digit under `root` is still mid-roll. */
function isRolling(root: HTMLElement | null) {
  if (!root) return false;
  return root
    .getAnimations({ subtree: true })
    .some(
      (animation) =>
        animation instanceof CSSTransition &&
        animation.transitionProperty === "transform" &&
        animation.playState === "running",
    );
}

/**
 * A number that changes. Only the digits that changed roll, and they flash
 * the signal colour when the number rose, a muted colour when it fell.
 */
export function FlowNumber({
  data,
  motion,
  tone,
  onSettle,
  className,
  format = DEFAULT_FORMAT,
  locale = "en-US",
  prefix,
  suffix,
  minChars,
}: FlowNumberProps) {
  const level = useMotionLevel(motion);
  const root = useRef<HTMLSpanElement>(null);

  const text = new Intl.NumberFormat(locale, format).format(data);

  const [seen, setSeen] = useState({
    data,
    text,
    trend: 0,
    updates: 0,
    gone: "",
  });
  if (seen.data !== data) {
    setSeen({
      data,
      text,
      trend: data > seen.data ? 1 : -1,
      updates: seen.updates + 1,
      // The number lost places (1,000 → 999): remember the characters that
      // left, so they can fade out instead of vanishing.
      gone:
        seen.text.length > text.length
          ? seen.text.slice(0, seen.text.length - text.length)
          : "",
    });
  }

  // onSettle: once after each change, when the last digit has come to rest.
  const settling = useRef(false);
  const settledFor = useRef(data);
  const settle = useEffectEvent(() => onSettle?.());
  useEffect(() => {
    if (settledFor.current === data) return;
    settledFor.current = data;
    settling.current = true;
    // One frame later the transitions exist. If none do (reduced, none, or a
    // change that moved no digit), the number is already at rest.
    const frame = requestAnimationFrame(() => {
      if (settling.current && !isRolling(root.current)) {
        settling.current = false;
        settle();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [data]);

  const chars = [...text];
  let digitsFromRight = chars.filter((c) => /\d/.test(c)).length;

  return (
    <span
      ref={root}
      className={className ? `k-flow ${className}` : "k-flow"}
      data-motion={level}
      // No tone given: take the colour of the surrounding text.
      data-tone={tone}
      data-trend={seen.trend > 0 ? "up" : seen.trend < 0 ? "down" : "flat"}
      onTransitionEnd={() => {
        if (settling.current && !isRolling(root.current)) {
          settling.current = false;
          onSettle?.();
        }
      }}
    >
      {/* Screen readers get the number as text, not thirty stacked digits. */}
      <span className="k-sr-only">
        {prefix}
        {text}
        {suffix}
      </span>
      <span
        aria-hidden="true"
        className="k-flow__row"
        style={minChars ? { minWidth: `${minChars}ch` } : undefined}
      >
        {prefix ? <span className="k-flow__affix">{prefix}</span> : null}
        {/* Characters that just left. A zero-width anchor in front of the
            number, so they fade where they stood without taking up room. */}
        {seen.gone ? (
          <span key={seen.updates} className="k-flow__gone">
            <span>{seen.gone}</span>
          </span>
        ) : null}
        {chars.map((char, i) => {
          // Key slots from the right, so the units digit stays the units
          // digit when the number gains or loses a place.
          const fromRight = chars.length - 1 - i;
          if (!/\d/.test(char)) {
            return (
              <span key={`s${fromRight}`} className="k-flow__sep">
                {char}
              </span>
            );
          }
          digitsFromRight -= 1;
          return (
            <Digit
              key={`d${fromRight}`}
              digit={Number(char)}
              trend={seen.trend}
              level={level}
              index={digitsFromRight}
              update={seen.updates}
            />
          );
        })}
        {suffix ? <span className="k-flow__affix">{suffix}</span> : null}
      </span>
    </span>
  );
}
