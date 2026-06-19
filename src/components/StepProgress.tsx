import { useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import { useAccent } from '../lib/tweaks';

interface StepProgressProps {
  /** Total number of steps (segments). */
  steps: number;
  /** Zero-based index of the active step. */
  current: number;
  /**
   * Override the accent color. Defaults to the user's chosen accent
   * (`useAccent().accentColor`) so the indicator carries the user's
   * identity across every wizard in the app.
   */
  accent?: string;
  /** Optional outer wrapper style (margins, padding). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Unified multi-step indicator used across all wizards (create-group,
 * pick flow, future auth/onboarding). Segmented bars with the active
 * segment slightly taller + glow so it reads as "you are here" without
 * stealing the eye from primary content.
 *
 * Behavior per segment:
 *   - Inactive:   4px tall, faint white track.
 *   - Completed:  4px tall, accent 100% fill.
 *   - Active:     5px tall (spring), accent fill animated 0→100% (timing,
 *                 so going back animates cleanly to 0 without overshoot),
 *                 plus a soft accent glow via shadow.
 */
export function StepProgress({ steps, current, accent, style }: StepProgressProps) {
  const { accentColor } = useAccent();
  const color = accent ?? accentColor;
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 6 },
        style,
      ]}
    >
      {Array.from({ length: steps }).map((_, i) => (
        <Segment
          key={i}
          active={i === current}
          filled={i < current}
          accent={color}
        />
      ))}
    </View>
  );
}

function Segment({ active, filled, accent }: { active: boolean; filled: boolean; accent: string }) {
  // Active segment grows slightly taller — withSpring for a subtle bounce
  // that draws the eye without feeling toy-ish.
  const h = useSharedValue(active ? 5 : 4);
  // Fill amount: 0 when ahead, 1 when at-or-past. Active animates 0→1 on
  // mount; going back animates 1→0 cleanly (timing avoids spring overshoot
  // which would briefly re-fill the bar after the user steps back).
  const fill = useSharedValue(active || filled ? 1 : 0);

  useEffect(() => {
    h.value = withSpring(active ? 5 : 4, { damping: 18, stiffness: 220, mass: 0.7 });
  }, [active, h]);

  useEffect(() => {
    const target = active || filled ? 1 : 0;
    fill.value = withTiming(target, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [active, filled, fill]);

  const trackStyle = useAnimatedStyle(() => ({
    height: h.value,
    // Glow only on the active segment — interpolate isn't needed since the
    // shadow is constant when active; we toggle via opacity-of-accent.
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.10)',
          overflow: 'hidden',
          // Soft accent glow on the active segment. We apply the shadow
          // unconditionally with `accent` color but rely on the segment
          // background being mostly transparent so only the lit (filled)
          // portion glows. iOS picks this up from shadowColor; Android
          // needs `elevation` which we deliberately skip to keep the look
          // identical across platforms (the glow is decorative).
          ...(active
            ? {
                shadowColor: accent,
                shadowOpacity: 0.55,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
              }
            : null),
        },
        trackStyle,
      ]}
    >
      <Animated.View
        style={[
          { height: '100%', borderRadius: 3, backgroundColor: accent },
          fillStyle,
        ]}
      />
    </Animated.View>
  );
}

export default StepProgress;
