import { View, ViewStyle, StyleProp } from 'react-native';
import { Text, colors } from '../design-system';

interface PointsProps {
  value: number | string;
  size?: number;
  prefix?: string;
  style?: StyleProp<ViewStyle>;
}

export function Points({ value, size = 14, prefix = '', style }: PointsProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5 }, style]}>
      <View
        style={{
          width: size * 0.95,
          height: size * 0.95,
          borderRadius: size,
          backgroundColor: colors.gold,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.ink, fontSize: size * 0.55, fontWeight: '900' }}>★</Text>
      </View>
      <Text style={{ color: colors.gold, fontWeight: '800', fontSize: size }}>
        {prefix}
        {value}
      </Text>
      <Text style={{ color: colors.gold, fontSize: size * 0.7, fontWeight: '700' }}>pts</Text>
    </View>
  );
}

export default Points;
