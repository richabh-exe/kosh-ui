"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as m from "motion/react-m";
import { usePlainMotion } from "../motion/motion-ready";
import { springs } from "../motion/tokens";
import type { KoshComponentProps } from "../motion/types";
import { useEntrance } from "../motion/use-entrance";
import { useMotionLevel } from "../motion/use-motion-level";
import { useSpringValue } from "../motion/use-spring-value";
import "./live-spark.css";

export interface LiveSparkProps extends KoshComponentProps<number[]> {
  /** How many points are visible. Older points leave on the left. Default 24. */
  window?: number;
  /** Fixed y range. Default: the visible points' range, padded by 10%. */
  domain?: [number, number];
  /** Reserved height in px. Default 48. The width is always 100%. */
  height?: number;
  /** "linear" joins points with straight lines. "smooth" curves through them. Default "linear". */
  curve?: "linear" | "smooth";
  /** A signal-coloured dot at the newest point. Default true. */
  showLast?: boolean;
  /** Accessible description. Default: the latest value and the trend. */
  label?: string;
  /**
   * A one-off entrance: if the line is off screen when the page loads, it
   * is revealed from left to right as it scrolls into view. Default false.
   */
  enter?: boolean;
}

interface Seen {
  points: number[];
  /** Absolute index of points[0]: how many points have left the front. */
  offset: number;
  updates: number;
  /** How many points the latest update added. 0 for a replaced dataset. */
  arrived: number;
  /** Counts replaced datasets, to remount the track without a slide. */
  resets: number;
}

/**
 * How far did the series move on? Returns k where next = previous with k
 * points dropped from the front and new points appended, or -1 if `next` is
 * a different series altogether.
 */
function shiftBetween(previous: number[], next: number[]) {
  for (let k = 0; k <= previous.length; k++) {
    const overlap = previous.length - k;
    if (overlap > next.length) continue;
    let same = true;
    for (let i = 0; i < overlap && same; i++) {
      same = previous[k + i] === next[i];
    }
    if (same && (overlap > 0 || previous.length === 0)) return k;
  }
  return -1;
}

/** Straight segments. */
function linearPath(ys: number[]) {
  return ys.map((y, i) => `${i ? "L" : "M"}${i} ${y.toFixed(4)}`).join(" ");
}

/**
 * A smooth curve that passes through every point and never overshoots
 * between two of them (monotone cubic interpolation, Fritsch–Carlson).
 * That last part matters for data: an ordinary spline would draw a dip or
 * a peak that is not in the numbers. Points are one unit apart in x.
 */
function smoothPath(ys: number[]) {
  const n = ys.length;
  if (n < 3) return linearPath(ys);
  const slope = Array.from(
    { length: n - 1 },
    (_, i) => (ys[i + 1] ?? 0) - (ys[i] ?? 0),
  );
  const tangent = ys.map((_, i) => {
    if (i === 0) return slope[0] ?? 0;
    if (i === n - 1) return slope[n - 2] ?? 0;
    const before = slope[i - 1] ?? 0;
    const after = slope[i] ?? 0;
    // A turning point gets a flat tangent, so the curve cannot overshoot it.
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    const d = slope[i] ?? 0;
    if (d === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = (tangent[i] ?? 0) / d;
    const b = (tangent[i + 1] ?? 0) / d;
    const size = a * a + b * b;
    if (size > 9) {
      const scale = 3 / Math.sqrt(size);
      tangent[i] = scale * a * d;
      tangent[i + 1] = scale * b * d;
    }
  }
  let path = `M0 ${(ys[0] ?? 0).toFixed(4)}`;
  for (let i = 0; i < n - 1; i++) {
    const y0 = ys[i] ?? 0;
    const y1 = ys[i + 1] ?? 0;
    path += ` C${(i + 1 / 3).toFixed(4)} ${(y0 + (tangent[i] ?? 0) / 3).toFixed(4)} ${(i + 2 / 3).toFixed(4)} ${(y1 - (tangent[i + 1] ?? 0) / 3).toFixed(4)} ${i + 1} ${y1.toFixed(4)}`;
  }
  return path;
}

/**
 * A sparkline for a value that keeps arriving. A new point slides in from
 * the right and the line moves along to make room.
 */
export function LiveSpark({
  data,
  motion,
  tone = "ink",
  onSettle,
  className,
  window: visible = 24,
  domain,
  height = 48,
  curve = "linear",
  showLast = true,
  label,
  enter = false,
}: LiveSparkProps) {
  const level = useMotionLevel(motion);
  const plain = usePlainMotion(level);
  const [entrance, phase] = useEntrance<HTMLDivElement>(enter, level, 900);

  // Give every point a permanent position (its absolute index), so adding a
  // point never moves the old ones. The whole drawing slides instead.
  const [seen, setSeen] = useState<Seen>({
    points: data,
    offset: 0,
    updates: 0,
    arrived: 0,
    resets: 0,
  });
  const changed =
    seen.points !== data &&
    (seen.points.length !== data.length ||
      seen.points.some((p, i) => p !== data[i]));
  if (changed) {
    const shift = shiftBetween(seen.points, data);
    setSeen(
      shift < 0
        ? {
            points: data,
            offset: seen.offset + seen.points.length,
            updates: seen.updates + 1,
            arrived: 0,
            resets: seen.resets + 1,
          }
        : {
            points: data,
            offset: seen.offset + shift,
            updates: seen.updates + 1,
            arrived: data.length - (seen.points.length - shift),
            resets: seen.resets,
          },
    );
  }

  const count = data.length;
  const lastIndex = seen.offset + count - 1;
  // Draw one point more than is visible: the one sliding out on the left.
  const from = Math.max(0, count - visible - 1);
  const drawn = data.slice(from);
  const firstIndex = seen.offset + from;

  // ---- The vertical range ------------------------------------------------
  const shown = data.slice(Math.max(0, count - visible));
  let [low, high] = domain ?? [
    shown.length ? Math.min(...shown) : 0,
    shown.length ? Math.max(...shown) : 1,
  ];
  if (!domain) {
    const pad = (high - low || 1) * 0.1;
    low -= pad;
    high += pad;
  }
  const range = high - low || 1;

  // The path is drawn against the range the chart had when it mounted, and
  // never redrawn for a range change. Instead the drawing is moved and
  // stretched vertically, with a transform, to show the current range:
  //   y on screen = stretch × y as drawn + shift
  // When a new point widens the range, that transform springs to its new
  // values, so the line eases into its new scale instead of jumping.
  const [drawnWith] = useState({ low, range });
  const stretch = drawnWith.range / range;
  const shift = 1 - (drawnWith.low - low) / range - stretch;
  const yDrawn = (value: number) =>
    1 - (value - drawnWith.low) / drawnWith.range;
  const yNow = (value: number) => 1 - (value - low) / range;

  const latest = data[count - 1];
  const dotY = latest === undefined ? 0 : yNow(latest);

  const group = useRef<SVGGElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const frame = useRef({ stretch, shift });
  const paintGroup = () => {
    // On an SVG element a CSS transform is part of its coordinate system, so
    // `vector-effect: non-scaling-stroke` keeps the line's thickness even.
    group.current?.style.setProperty(
      "transform",
      `translate(0px, ${frame.current.shift}px) scale(1, ${frame.current.stretch})`,
    );
  };
  useSpringValue(stretch, {
    level,
    preset: "settle",
    onChange: (value) => {
      frame.current.stretch = value;
      paintGroup();
    },
  });
  useSpringValue(shift, {
    level,
    preset: "settle",
    onChange: (value) => {
      frame.current.shift = value;
      paintGroup();
    },
  });
  // The dot rides a full-height rail moved by a percentage of that height.
  useSpringValue(dotY, {
    level,
    preset: "settle",
    onChange: (value) => {
      if (rail.current)
        rail.current.style.transform = `translateY(${value * 100}%)`;
    },
  });
  // React renders these transforms once. After that the springs own them.
  const [mounted] = useState({ stretch, shift, dotY });

  // One step is the distance between two points, as a share of the width.
  const step = 100 / Math.max(1, visible - 1);
  const x = -Math.max(0, lastIndex - (visible - 1)) * step;
  const ys = drawn.map(yDrawn);
  const path = curve === "smooth" ? smoothPath(ys) : linearPath(ys);

  const trend =
    shown.length < 2 || latest === undefined || shown[0] === undefined
      ? "steady"
      : latest > shown[0]
        ? "up"
        : latest < shown[0]
          ? "down"
          : "steady";

  // onSettle: after the slide, or at once when nothing slides.
  const settledAt = useRef(0);
  const sliding = useRef(false);
  const settle = useEffectEvent(() => onSettle?.());
  useEffect(() => {
    if (settledAt.current === seen.updates) return;
    settledAt.current = seen.updates;
    if (plain || seen.arrived === 0) settle();
    else sliding.current = true;
  }, [seen.updates, seen.arrived, plain]);

  const drawing: ReactNode = (
    <>
      {drawn.length > 1 ? (
        <svg
          viewBox={`0 0 ${drawn.length - 1} 1`}
          preserveAspectRatio="none"
          style={{
            left: `${firstIndex * step}%`,
            width: `${(drawn.length - 1) * step}%`,
          }}
        >
          <g
            ref={group}
            style={{
              transform: `translate(0px, ${mounted.shift}px) scale(1, ${mounted.stretch})`,
            }}
          >
            <path d={path} />
          </g>
        </svg>
      ) : null}
      {showLast && latest !== undefined ? (
        <div
          ref={rail}
          className="k-spark__rail"
          style={{ transform: `translateY(${mounted.dotY * 100}%)` }}
        >
          <i
            // A new element per point, so the pop plays for each arrival.
            key={lastIndex}
            className="k-spark__dot"
            data-new={seen.arrived > 0 ? "" : undefined}
            style={{ left: `${lastIndex * step}%` }}
          />
        </div>
      ) : null}
    </>
  );

  return (
    <div
      ref={entrance}
      className={className ? `k-spark ${className}` : "k-spark"}
      data-motion={level}
      data-tone={tone}
      data-enter={phase === "static" ? undefined : phase}
      role="img"
      aria-label={
        label ??
        (latest === undefined
          ? "No data yet"
          : `Latest ${latest}, ${trend} over the last ${shown.length} points`)
      }
      style={{ height }}
    >
      {/* Two nested boxes for the entrance. See .k-spark__wipe in the CSS. */}
      <div className="k-spark__wipe">
        <div className="k-spark__wipe-inner">
          {plain ? (
            <div
              className="k-spark__track"
              style={{ transform: `translateX(${x}%)` }}
            >
              {drawing}
            </div>
          ) : (
            <m.div
              // A replaced dataset gets a fresh track: no slide across the gap.
              key={seen.resets}
              className="k-spark__track"
              initial={false}
              // The target moves one step per point. A spring heads for the
              // new target from wherever it is, so points arriving mid-slide
              // never make the line jump back.
              animate={{ x: `${x}%` }}
              transition={springs.slide}
              onAnimationComplete={() => {
                if (sliding.current) {
                  sliding.current = false;
                  onSettle?.();
                }
              }}
            >
              {drawing}
            </m.div>
          )}
        </div>
      </div>
    </div>
  );
}
