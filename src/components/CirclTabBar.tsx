import { useEffect } from 'react';
import { View, Pressable, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text, colors } from '../design-system';
import { useAccent } from '../lib/tweaks';
import { Icon, IconName } from './Icon';

const BAR_H = 62; // visible bar height (above safe-area inset)
const BUBBLE = 52;

const META: Record<string, { icon: IconName; label: string }> = {
  home: { icon: 'home', label: 'Home' },
  groups: { icon: 'people', label: 'Groups' },
  create: { icon: 'add', label: 'Create' },
  activity: { icon: 'bell', label: 'Activity' },
  profile: { icon: 'profile', label: 'Profile' },
};

// Routes shown in the bottom bar. Other routes registered in (tabs) (e.g.
// activity, groups) remain navigable but are hidden from the bar — they
// open from the home header (bell) and the home "All groups" link instead.
// expo-router's `href: null` doesn't reach this custom bar (we read
// state.routes directly), so we filter here.
const VISIBLE_TABS = new Set(['home', 'create', 'profile']);

const SPRING = { damping: 16, stiffness: 140, mass: 1 };

export function CirclTabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { accentColor, accentInk } = useAccent();

  // Only show the routes whitelisted in VISIBLE_TABS. We keep references to
  // the original indices so bubble/glow positions and tabPress dispatch still
  // line up with React Navigation's full state.
  const visibleRoutes = state.routes
    .map((r, originalIndex) => ({ route: r, originalIndex }))
    .filter(({ route }) => VISIBLE_TABS.has(route.name));

  const count = visibleRoutes.length;
  const tabW = width / count;
  // Active index *within the visible set*. If the active route is hidden
  // (shouldn't happen, but defensive), fall back to 0.
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((v) => v.originalIndex === state.index),
  );

  const idx = useSharedValue(activeVisibleIndex);

  // `iconBump` lives at 1 normally and briefly spikes to 1.22 every time
  // the active tab changes. We apply it as a scale on the BUBBLE'S inner
  // icon so the user gets a satisfying "boing" on every selection —
  // Instagram / TikTok style. The bubble itself stays smooth (its slide
  // is driven by `idx`) so only the icon punches.
  const iconBump = useSharedValue(1);
  useEffect(() => {
    idx.value = withSpring(activeVisibleIndex, SPRING);
    // Reset to 1 first so a rapid double-tap retriggers the bump cleanly
    // instead of stacking from whatever value the previous sequence left.
    iconBump.value = 1;
    iconBump.value = withSequence(
      withTiming(1.22, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 8, stiffness: 220, mass: 0.6 }),
    );
  }, [activeVisibleIndex, idx, iconBump]);

  const bubbleIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconBump.value }],
  }));

  // Bubble + glow follow the spring-interpolated index.
  const bubbleStyle = useAnimatedStyle(() => {
    const cx = (idx.value + 0.5) * tabW;
    return { transform: [{ translateX: cx - BUBBLE / 2 }] };
  });
  const glowStyle = useAnimatedStyle(() => {
    const cx = (idx.value + 0.5) * tabW;
    return { transform: [{ translateX: cx - 50 }] };
  });

  const active = visibleRoutes[activeVisibleIndex]?.route ?? state.routes[state.index];
  const activeMeta = META[active.name] ?? { icon: 'home', label: '' };

  return (
    <View style={{ height: BAR_H + insets.bottom, backgroundColor: 'transparent' }}>
      {/* Solid rounded-top bar, flush to the bottom */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: BAR_H + insets.bottom,
          backgroundColor: colors.s800,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderTopWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.25, shadowRadius: 12 },
            android: { elevation: 24 },
          }),
        }}
      />

      {/* Soft radial accent glow under the bubble (real falloff, never a block) */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -20, left: 0, width: 100, height: 70 }, glowStyle]}>
        <Svg width={100} height={70}>
          <Defs>
            <RadialGradient id="tabGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={accentColor} stopOpacity={0.45} />
              <Stop offset="1" stopColor={accentColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={50} cy={35} rx={50} ry={35} fill="url(#tabGlow)" />
        </Svg>
      </Animated.View>

      {/* Tab buttons */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom, height: BAR_H, flexDirection: 'row' }}>
        {visibleRoutes.map(({ route, originalIndex }, i) => {
          const meta = META[route.name] ?? { icon: 'home' as IconName, label: route.name };
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (state.index !== originalIndex && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return <TabItem key={route.key} i={i} idx={idx} meta={meta} onPress={onPress} />;
        })}
      </View>

      {/* Floating active bubble — sits half above the bar's top edge.
          Border removed entirely (was rendering aliased against the high-
          contrast accent color); shadow alone gives it lift. Shadow radius
          dropped from 12 → 8 so the green halo is tighter and cleaner. */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: insets.bottom + BAR_H - 30,
            left: 0,
            width: BUBBLE,
            height: BUBBLE,
            borderRadius: BUBBLE / 2,
            backgroundColor: accentColor,
            alignItems: 'center',
            justifyContent: 'center',
            ...Platform.select({
              ios: { shadowColor: accentColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 8 },
              android: { elevation: 12 },
            }),
          },
          bubbleStyle,
        ]}
      >
        <Pressable onPress={() => navigation.navigate(active.name)} hitSlop={10}>
          <Animated.View style={bubbleIconStyle}>
            <Icon name={activeMeta.icon} size={22} color={accentInk} stroke={2.5} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function TabItem({
  i,
  idx,
  meta,
  onPress,
}: {
  i: number;
  idx: SharedValue<number>;
  meta: { icon: IconName; label: string };
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const dist = Math.min(1, Math.abs(i - idx.value));
    const inactive = Math.min(1, dist * 1.6); // 0 under bubble → 1 fully visible
    return {
      opacity: inactive,
      transform: [{ translateY: (1 - inactive) * 10 }, { scale: 0.78 + 0.22 * inactive }],
    };
  });
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10, gap: 4 }, style]}>
        <Icon name={meta.icon} size={20} color={colors.mist} stroke={2} />
        <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.mist }}>{meta.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default CirclTabBar;
