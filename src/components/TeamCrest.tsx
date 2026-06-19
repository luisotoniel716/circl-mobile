import { View, ViewStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';
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
  /**
   * Keep the colored disc but drop the secondary-color outline. Used when
   * the crest sits on a halo/glow background so the harsh ring doesn't
   * break the gradient.
   */
  noBorder?: boolean;
}

export function TeamCrest({ team, size = 44, style, bare = false, noBorder = false }: TeamCrestProps) {
  const t = typeof team === 'string' ? LIGAMX[team] : team;
  if (!t) return null;

  // Bare mode: just the PNG, transparent background — for hero areas where the
  // logo speaks for itself (match detail, pick screen).
  if (bare && t.logo) {
    return (
      <Image
        source={t.logo}
        style={[{ width: size, height: size }, style as any]}
        contentFit="contain"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
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
          borderWidth: noBorder ? 0 : 2,
          borderColor: t.secondary,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {t.logo ? (
        <Image
          source={t.logo}
          style={{ width: size * 0.78, height: size * 0.78 }}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
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
