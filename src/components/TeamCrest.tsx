import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Text } from '../design-system';
import { LIGAMX } from '../data';
import type { Team, TeamCode } from '../types';

interface TeamCrestProps {
  team: TeamCode | Team;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function TeamCrest({ team, size = 44, style }: TeamCrestProps) {
  const t = typeof team === 'string' ? LIGAMX[team] : team;
  if (!t) return null;
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
      {/* Diagonal accent stripe */}
      <Svg width={size} height={size} style={{ position: 'absolute', opacity: 0.18 }}>
        <Polygon
          points={`${size * 0.48},0 ${size * 0.52},0 ${size},${size * 0.52} ${size},${size * 0.48}`}
          fill={t.secondary}
        />
      </Svg>
      <Text style={{ color: t.text, fontWeight: '900', fontSize: size * 0.42 }}>{t.initial}</Text>
    </View>
  );
}

export default TeamCrest;
