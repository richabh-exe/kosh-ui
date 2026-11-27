"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { FlowNumber } from "../flow-number/flow-number";
import type { KoshComponentProps } from "../motion/types";
import { useMotionLevel } from "../motion/use-motion-level";
import "./delta-chip.css";

export interface DeltaChipProps extends KoshComponentProps<number> {
  /** How to print the number. Default: one decimal place. */
  format?: Intl.NumberFormatOptions;
  /** Default "en-US". */
  locale?: string;
  /** Shown after the number. Default "%". */
  suffix?: string;
  /** For metrics where down is good (latency, churn). Swaps the colours only. */
  invert?: boolean;
  /** Treat changes this small, or smaller, as flat. Default 0. */
  flatBelow?: number;
}

const DEFAULT_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
};

/**
 * A small chip for a signed change: ▲ 4.2%. When the direction reverses the
 * arrow turns over and the background cross-fades. A reversal is the news,
 * so it is the only thing that animates beyond the digits.
 */
export function DeltaChip({
  data,
  motion,
  tone = "ink",
  onSettle,
  className,
  format = DEFAULT_FORMAT,
  locale = "en-US",
  suffix = "%",
  invert = false,
  flatBelow = 0,
}: DeltaChipProps) {
  const level = useMotionLevel(motion);
  const size = Math.abs(data);
  const trend = size <= flatBelow ? "flat" : data > 0 ? "up" : "down";
  // Good (green) or bad (red). Normally up is good. With `invert` (down is
  // good, as for errors or load time), down is.
  const mood =
    trend === "flat" ? "flat" : (trend === "up") !== invert ? "good" : "bad";

  const text = new Intl.NumberFormat(locale, format).format(size);
  const words =
    trend === "flat" ? "No change," : trend === "up" ? "Up" : "Down";

  // FlowNumber reports the roll. It cannot report a pure sign flip
  // (+2.0 → −2.0), because the digits it shows do not change.
  const previous = useRef(data);
  const settle = useEffectEvent(() => onSettle?.());
  useEffect(() => {
    const before = previous.current;
    previous.current = data;
    if (before !== data && Math.abs(before) === Math.abs(data)) settle();
  }, [data]);

  return (
    <span
      className={className ? `k-delta ${className}` : "k-delta"}
      data-motion={level}
      data-tone={tone}
      data-trend={trend}
      data-mood={mood}
    >
      {/* Direction in words: never colour or the arrow alone. With `invert`
          this still says "up" or "down" truthfully. */}
      <span className="k-sr-only">
        {words} {text}
        {suffix}
      </span>
      <svg
        className="k-delta__arrow"
        aria-hidden="true"
        viewBox="0 0 10 10"
        width="10"
        height="10"
      >
        <path d="M5 1.5 9 8.5H1z" fill="currentColor" />
      </svg>
      <span aria-hidden="true">
        <FlowNumber
          data={size}
          motion={motion}
          format={format}
          locale={locale}
          suffix={suffix}
          onSettle={onSettle}
        />
      </span>
    </span>
  );
}
