import { View } from 'react-native';
import { Text, colors } from '../design-system';
import { Avatar } from './Avatar';

type Item = string | { initials: string };

interface AvatarStackProps {
  items?: Item[];
  size?: number;
  max?: number;
}

export function AvatarStack({ items = [], size = 24, max = 4 }: AvatarStackProps) {
  const shown = items.slice(0, max);
  const extra = items.length - max;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((it, i) => (
        <View
          key={i}
          style={{
            marginLeft: i ? -size * 0.35 : 0,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: colors.s900,
          }}
        >
          <Avatar initials={typeof it === 'string' ? it : it.initials} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            marginLeft: -size * 0.35,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.s700,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.s900,
          }}
        >
          <Text style={{ color: colors.paper, fontWeight: '800', fontSize: Math.round(size * 0.34) }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

export default AvatarStack;
