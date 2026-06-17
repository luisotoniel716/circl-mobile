import { useEffect, useRef, useState } from 'react';
import type { TextStyle, StyleProp } from 'react-native';
import { Text } from '../design-system';

interface AnimatedNumberProps {
  /** The final value to count up to. Changes re-trigger the animation. */
  value:        number;
  /** Total animation duration in ms. Defaults to 900. */
  duration?:    number;
  /** Optional delay before the count-up starts. Defaults to 0. */
  delay?:       number;
  /** Suffix to append (e.g. '%' or ' pts'). */
  suffix?:      string;
  /** Prefix (e.g. '#' or '$'). */
  prefix?:      string;
  /** When true, the displayed integer is locale-formatted (1,247). */
  formatLocale?: boolean;
  /** Style passed to the underlying Text. */
  style?:       StyleProp<TextStyle>;
  /**
   * Bump this key to force the animation to restart from 0 even when
   * `value` hasn't changed — useful when a screen is re-focused via
   * navigation (the component instance is reused but the user wants
   * the count-up to play again).
   */
  replayKey?:   string | number;
}

/**
 * Animated counter that ticks from 0 → `value` on mount and on prop change.
 *
 * Uses requestAnimationFrame + a cubic ease-out curve so the number starts
 * fast and decelerates gracefully into its final state (Apple Fitness /
 * Duolingo result-screen feel). We update React state per frame; for the
 * short windows we run (~900ms) that's cheap and keeps the API a plain
 * `<Text>`-like component.
 *
 * Re-entering the screen, or the value updating from a refetch, animates
 * from the previously-displayed number — not from 0 — so subsequent
 * updates feel like a smooth correction rather than a restart.
 */
export function AnimatedNumber({
  value,
  duration     = 900,
  delay        = 0,
  suffix       = '',
  prefix       = '',
  formatLocale = false,
  style,
  replayKey,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(0);
  // Track the last value we animated FROM, so re-renders after refetches
  // tween from the current shown number instead of restarting at zero.
  const fromRef = useRef(0);
  // Remember the previous replayKey so we can detect a "replay" request
  // and reset the starting point to 0 even though `value` is unchanged.
  const lastReplayRef = useRef(replayKey);

  useEffect(() => {
    // If the caller explicitly bumped replayKey, restart from 0 even if
    // value hasn't changed — this is how a screen says "play again on focus".
    if (replayKey !== lastReplayRef.current) {
      fromRef.current = 0;
      setDisplayed(0);
      lastReplayRef.current = replayKey;
    }
    const from   = fromRef.current;
    const target = Number.isFinite(value) ? value : 0;
    if (from === target) {
      setDisplayed(target);
      return;
    }

    let rafId: number;
    let cancelled = false;
    let startTs: number | null = null;
    let delayTimer: ReturnType<typeof setTimeout> | null = null;

    function tick(ts: number) {
      if (cancelled) return;
      if (startTs === null) startTs = ts;
      const elapsed = ts - startTs;
      const t = Math.min(1, elapsed / duration);
      // Ease-out cubic — fast start, soft landing.
      const eased = 1 - Math.pow(1 - t, 3);
      const next  = from + (target - from) * eased;
      setDisplayed(next);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    if (delay > 0) {
      delayTimer = setTimeout(() => {
        rafId = requestAnimationFrame(tick);
      }, delay);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [value, duration, delay, replayKey]);

  const intPart = Math.round(displayed);
  const text = formatLocale ? intPart.toLocaleString() : String(intPart);

  return <Text style={style}>{prefix}{text}{suffix}</Text>;
}

export default AnimatedNumber;
