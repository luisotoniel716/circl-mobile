import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  interpolate, Extrapolation, runOnJS, type SharedValue,
} from 'react-native-reanimated';
import { colors } from '../design-system';

// Exported so the parent can align its center-highlight band exactly with
// the selected slot.
export const WHEEL_ITEM_H = 72;
const VISIBLE = 3; // window shows the centered number + one above + one below

interface ScoreWheelProps {
  value:    number;
  max?:     number;
  onChange: (v: number) => void;
  /** Color of the centered (selected) number. */
  accent?:  string;
  /**
   * Fires while the wheel is being scrolled, every time the closest integer
   * to the center changes. Lets the parent surface a "live" value (e.g. the
   * potential-points pill) without waiting for momentum to settle. The
   * settled value still arrives via `onChange`.
   */
  onLiveChange?: (v: number) => void;
  /**
   * When true, the wheel includes a sentinel `-1` slot at the start that
   * renders as `-` (an "unset" marker). The score step uses this for the
   * money-line state: both wheels at `-` mean "no specific score yet,
   * winner is decided by the crest tap above".
   */
  nullable?: boolean;
}

/**
 * A vertical slot-machine number picker (0…max) with inertial snapping.
 * Numbers scale + fade as they move away from the centered slot, giving the
 * tactile "wheel" feel from the reference design. The centered number is
 * large and thin (Light weight) so it reads elegant but imposing.
 */
export function ScoreWheel({
  value, max = 9, onChange, accent = colors.paper, onLiveChange, nullable = false,
}: ScoreWheelProps) {
  const ref = useRef<Animated.ScrollView>(null);
  // When `nullable`, the items array prepends a `-1` sentinel that we render
  // as `-`. Scroll math uses array indices; we map between (index ↔ value)
  // via the constants below.
  const minValue = nullable ? -1 : 0;
  const indexOfValue = (v: number) => v - minValue;
  const valueOfIndex = (i: number) => i + minValue;

  const initialIndex = indexOfValue(value);
  const offset = useSharedValue(initialIndex * WHEEL_ITEM_H);
  // Tracks the last live-reported integer so we only emit when it changes
  // (keeps React renders cheap while the wheel is being dragged).
  const lastLive = useSharedValue(value);

  // Jump to the initial value on mount (no animation) so re-entering the
  // flow shows the previously-picked score already centered.
  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex * WHEEL_ITEM_H, animated: false });
      offset.value = initialIndex * WHEEL_ITEM_H;
      lastLive.value = value;
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the canonical `value` changes externally (e.g. parent auto-snaps
  // the dash to 0 because the other wheel started spinning), animate to it.
  useEffect(() => {
    const targetIdx = indexOfValue(value);
    if (Math.round(offset.value / WHEEL_ITEM_H) !== targetIdx) {
      ref.current?.scrollTo({ y: targetIdx * WHEEL_ITEM_H, animated: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      offset.value = y;
      if (onLiveChange) {
        const rawIdx = Math.max(0, Math.min(max - minValue, Math.round(y / WHEEL_ITEM_H)));
        const nearest = rawIdx + minValue;
        if (nearest !== lastLive.value) {
          lastLive.value = nearest;
          runOnJS(onLiveChange)(nearest);
        }
      }
    },
  });

  const items = Array.from({ length: max - minValue + 1 }, (_, i) => valueOfIndex(i));

  function settle(y: number) {
    const rawIdx = Math.max(0, Math.min(max - minValue, Math.round(y / WHEEL_ITEM_H)));
    const v = valueOfIndex(rawIdx);
    if (v !== value) {
      Haptics.selectionAsync().catch(() => {});
      onChange(v);
    }
  }

  return (
    <View style={{ height: WHEEL_ITEM_H * VISIBLE, width: 72, overflow: 'hidden' }}>
      <Animated.ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handler}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_H }}
      >
        {items.map((n, i) => (
          <WheelItem key={n} index={i} label={n < 0 ? '–' : String(n)} offset={offset} accent={accent} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function WheelItem({
  index, label, offset, accent,
}: { index: number; label: string; offset: SharedValue<number>; accent: string }) {
  const animStyle = useAnimatedStyle(() => {
    const dist = Math.abs(index * WHEEL_ITEM_H - offset.value);
    const scale   = interpolate(dist, [0, WHEEL_ITEM_H, WHEEL_ITEM_H * 2], [1, 0.5, 0.34], Extrapolation.CLAMP);
    const opacity = interpolate(dist, [0, WHEEL_ITEM_H, WHEEL_ITEM_H * 2], [1, 0.22, 0.08], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });
  return (
    <View style={{ height: WHEEL_ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={[{ fontSize: 68, fontWeight: '200', color: accent }, animStyle]}>
        {label}
      </Animated.Text>
    </View>
  );
}

export default ScoreWheel;
