import { useEffect } from 'react';
import { View, Pressable, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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

const SPRING = { damping: 16, stiffness: 140, mass: 1 };

export function CirclTabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { accentColor, accentInk } = useAccent();

  const count = state.routes.length;
  const tabW = width / count;
  const activeIndex = state.index;

  const idx = useSharedValue(activeIndex);
  useEffect(() => {
    idx.value = withSpring(activeIndex, SPRING);
  }, [activeIndex, idx]);

  // Bubble + glow follow the spring-interpolated index.
  const bubbleStyle = useAnimatedStyle(() => {
    const cx = (idx.value + 0.5) * tabW;
    return { transform: [{ translateX: cx - BUBBLE / 2 }] };
  });
  const glowStyle = useAnimatedStyle(() => {
    const cx = (idx.value + 0.5) * tabW;
    return { transform: [{ translateX: cx - 50 }] };
  });

  const active = state.routes[activeIndex];
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
        {state.routes.map((route, i) => {
          const meta = META[route.name] ?? { icon: 'home' as IconName, label: route.name };
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (state.index !== i && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return <TabItem key={route.key} i={i} idx={idx} meta={meta} onPress={onPress} />;
        })}
      </View>

      {/* Floating active bubble — sits half above the bar's top edge */}
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
            borderWidth: 4,
            borderColor: colors.s900,
            ...Platform.select({
              ios: { shadowColor: accentColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 12 },
              android: { elevation: 12 },
            }),
          },
          bubbleStyle,
        ]}
      >
        <Pressable onPress={() => navigation.navigate(active.name)} hitSlop={10}>
          <Icon name={activeMeta.icon} size={22} color={accentInk} stroke={2.5} />
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
