import { View, ViewStyle, StyleProp } from 'react-native';
import { Text, colors } from '../design-system';
import { useAccent } from '../lib/tweaks';
import { ReactNode } from 'react';

type Tone = 'gold' | 'blue' | 'accent' | 'red' | 'green' | 'ghost' | 'ghostLight' | 'live';

interface PillProps {
  children: ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

export function Pill({ children, tone = 'ghost', size = 'md', style }: PillProps) {
  const { accentColor, accentInk } = useAccent();
  const tones: Record<Tone, { bg: string; fg: string }> = {
    gold: { bg: colors.gold, fg: colors.ink },
    blue: { bg: colors.blue, fg: colors.paper },
    accent: { bg: accentColor, fg: accentInk },
    red: { bg: colors.red, fg: colors.paper },
    green: { bg: colors.green, fg: colors.paper },
    ghost: { bg: 'rgba(255,255,255,0.10)', fg: colors.paper },
    ghostLight: { bg: 'rgba(10,11,31,0.06)', fg: colors.ink },
    live: { bg: colors.red, fg: colors.paper },
  };
  const t = tones[tone] ?? tones.ghost;
  const fs = size === 'sm' ? 10 : size === 'lg' ? 13 : 11;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          borderRadius: 9999,
          paddingHorizontal: size === 'lg' ? 12 : 9,
          paddingVertical: size === 'lg' ? 6 : 3,
          backgroundColor: t.bg,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: t.fg, fontWeight: '700', fontSize: fs }}>{children}</Text>
    </View>
  );
}

export default Pill;
