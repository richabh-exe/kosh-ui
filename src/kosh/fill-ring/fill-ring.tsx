"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FlowNumber } from "../flow-number/flow-number";
import type { KoshComponentProps } from "../motion/types";
import { useEntrance } from "../motion/use-entrance";
import { useMotionLevel } from "../motion/use-motion-level";
import { useSpringValue } from "../motion/use-spring-value";
import "./fill-ring.css";

export interface RingData {
  value: number;
  goal: number;
}

export interface FillRingProps extends KoshComponentProps<RingData> {
  /** Diameter in px. The component reserves size × size. Default 120. */
  size?: number;
  /** Ring thickness in px. Default 10. */
  thickness?: number;
  /** Shown in the centre under the number, and used in the accessible text. */
  label?: string;
  /** The ends of the arc. Default "round". */
  caps?: "round" | "square";
  /** Fires once each time the value reaches the goal from below. */
  onGoal?: () => void;
  /**
   * A one-off entrance: if the ring is off screen when the page loads, the
   * arc sweeps up from zero as it scrolls into view. Default false.
   */
  enter?: boolean;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

// The arc is two half-rings, each rotating inside a clip. The first covers
// 0 to 50%, the second 50 to 100%. Only `transform` changes, so the browser
// never has to repaint the ring. (The usual stroke-dashoffset trick repaints
// every frame.)
const firstTurn = (share: number) =>
  `rotate(${Math.min(clamp(share), 0.5) * 360}deg)`;
const secondTurn = (share: number) =>
  `rotate(${Math.max(0, clamp(share) - 0.5) * 360}deg)`;
// A round cap is a dot riding the head of the arc: one more rotation.
const headTurn = (share: number) => `rotate(${clamp(share) * 360}deg)`;
// An empty ring has no ends to round.
const capOpacity = (share: number) => (share > 0.004 ? "1" : "0");

/**
 * Progress toward a goal, as a ring. The arc fills with an overshoot, and
 * the moment the value reaches the goal, the ring bursts once.
 */
export function FillRing({
  data,
  motion,
  tone = "ink",
  onSettle,
  className,
  size = 120,
  thickness = 10,
  label,
  caps = "round",
  onGoal,
  enter = false,
}: FillRingProps) {
  const level = useMotionLevel(motion);
  const [entrance, phase] = useEntrance<HTMLDivElement>(enter, level);
  const goal = data.goal > 0 ? data.goal : 1;
  const share = data.value / goal;
  const reached = share >= 1;

  const first = useRef<HTMLSpanElement>(null);
  const second = useRef<HTMLSpanElement>(null);
  const head = useRef<HTMLSpanElement>(null);
  const tail = useRef<HTMLSpanElement>(null);

  // React renders the arc once, at the share it had on mount. After that
  // the spring owns the transforms. Keeping the rendered style constant
  // stops React from snapping the arc to the new value on every update.
  const [mounted] = useState(share);

  // One spring, several elements. It may overshoot past the target. The
  // drawn arc is clamped to a full circle.
  const armed = phase === "armed";
  useSpringValue(armed ? 0 : share, {
    // Waiting off screen: empty the ring at once, with no animation. When
    // it scrolls into view the target becomes the real value again and the
    // spring carries the arc up from zero.
    level: armed ? "none" : level,
    preset: "pop",
    onChange: (value) => {
      if (first.current) first.current.style.transform = firstTurn(value);
      if (second.current) second.current.style.transform = secondTurn(value);
      if (head.current) {
        head.current.style.transform = headTurn(value);
        head.current.style.opacity = capOpacity(value);
      }
      if (tail.current) tail.current.style.opacity = capOpacity(value);
    },
    onRest: () => {
      // Emptying the ring before an entrance is not an update.
      if (!armed) onSettle?.();
    },
  });

  // Count upward crossings of the goal, so the burst plays once per arrival
  // and re-arms when the value drops below the goal again.
  const [crossing, setCrossing] = useState({ reached, bursts: 0 });
  if (crossing.reached !== reached) {
    setCrossing({ reached, bursts: crossing.bursts + (reached ? 1 : 0) });
  }
  const goalReached = useEffectEvent(() => onGoal?.());
  useEffect(() => {
    // An event, not an animation: it fires at every motion level.
    if (crossing.bursts > 0) goalReached();
  }, [crossing.bursts]);

  const bursting = reached && crossing.bursts > 0;

  return (
    <div
      ref={entrance}
      className={className ? `k-ring ${className}` : "k-ring"}
      data-motion={level}
      data-tone={tone}
      // Alternating the value restarts the pop on each new arrival.
      data-burst={bursting ? crossing.bursts % 2 : undefined}
      role="progressbar"
      aria-label={label ?? "Progress"}
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={Math.max(0, Math.min(goal, data.value))}
      aria-valuetext={`${data.value} of ${goal}${reached ? ". Goal reached." : ""}`}
      style={
        {
          "--k-ring-size": `${size}px`,
          "--k-ring-thickness": `${thickness}px`,
        } as CSSProperties
      }
    >
      <span className="k-ring__track" />
      <span className="k-ring__half">
        <span
          ref={first}
          className="k-ring__arc"
          style={{ transform: firstTurn(mounted) }}
        />
      </span>
      <span className="k-ring__half k-ring__half--second">
        <span
          ref={second}
          className="k-ring__arc"
          style={{ transform: secondTurn(mounted) }}
        />
      </span>
      {caps === "round" ? (
        <>
          {/* The start of the arc: a dot that stays at 12 o'clock. */}
          <span
            ref={tail}
            className="k-ring__cap"
            style={{ opacity: capOpacity(mounted) }}
          />
          {/* The head of the arc: the same dot, turned to the arc's end. */}
          <span
            ref={head}
            className="k-ring__head"
            style={{
              transform: headTurn(mounted),
              opacity: capOpacity(mounted),
            }}
          >
            <span className="k-ring__cap" />
          </span>
        </>
      ) : null}
      {bursting ? (
        <span key={crossing.bursts} className="k-ring__burst" />
      ) : null}
      <span className="k-ring__center" aria-hidden="true">
        <FlowNumber data={data.value} motion={motion} tone={tone} />
        {label ? <span className="k-ring__label">{label}</span> : null}
      </span>
    </div>
  );
}
