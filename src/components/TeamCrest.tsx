import { View, Image, ViewStyle, ImageStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { Text } from '../design-system';
import { LIGAMX } from '../data';
import type { Team, TeamCode } from '../types';

interface TeamCrestProps {
  team: TeamCode | Team;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** When true, render the raw logo with no circular frame. Defaults to false. */
  bare?: boolean;
}

export function TeamCrest({ team, size = 44, style, bare = false }: TeamCrestProps) {
  const t = typeof team === 'string' ? LIGAMX[team] : team;
  if (!t) return null;

  // Each crest instance independently fades its logo in once the PNG is
  // decoded. The team-colour background/circle renders immediately so the
  // card never looks broken.
  const logoOpacity = useSharedValue(0);
  const logoAnimStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value }));

  // Bare mode: just the PNG, transparent background — for hero areas where the
  // logo speaks for itself (match detail, pick screen).
  if (bare && t.logo) {
    const bareStyle: ImageStyle = { width: size, height: size, resizeMode: 'contain' };
    return (
      <Animated.Image
        source={t.logo}
        style={[bareStyle, style as ImageStyle, logoAnimStyle]}
        onLoad={() => { logoOpacity.value = withTiming(1, { duration: 160 }); }}
      />
    );
  }

  // Framed mode: circle with team colors, logo (or initial) inside.
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.primary,
          borderWidth: 2,
          borderColor: t.secondary,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {t.logo ? (
        <Animated.Image
          source={t.logo}
          style={[{ width: size * 0.78, height: size * 0.78, resizeMode: 'contain' }, logoAnimStyle]}
          onLoad={() => { logoOpacity.value = withTiming(1, { duration: 160 }); }}
        />
      ) : (
        <>
          <Svg width={size} height={size} style={{ position: 'absolute', opacity: 0.18 }}>
            <Polygon
              points={`${size * 0.48},0 ${size * 0.52},0 ${size},${size * 0.52} ${size},${size * 0.48}`}
              fill={t.secondary}
            />
          </Svg>
          <Text style={{ color: t.text, fontWeight: '900', fontSize: size * 0.42 }}>{t.initial}</Text>
        </>
      )}
    </View>
  );
}

export default TeamCrest;
