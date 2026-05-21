import { Pressable, View, ViewStyle, StyleProp } from 'react-native';
import { ReactNode } from 'react';
import { Text, colors, shadow } from '../design-system';
import { useAccent } from '../lib/tweaks';

type Variant = 'primary' | 'dark' | 'gold' | 'light' | 'danger' | 'ghostDark' | 'ghostLight' | 'soft';
type Size = 'sm' | 'md' | 'lg';

interface CButtonProps {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  onPress?: () => void;
  full?: boolean;
  lead?: ReactNode;
  trail?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CButton({
  children,
  variant = 'primary',
  size = 'md',
  onPress,
  full = false,
  lead,
  trail,
  disabled,
  style,
}: CButtonProps) {
  const { accentColor, accentInk } = useAccent();

  const variants: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: accentColor, fg: accentInk },
    dark: { bg: colors.s900, fg: colors.paper },
    gold: { bg: colors.gold, fg: colors.ink },
    light: { bg: colors.paper, fg: colors.ink },
    danger: { bg: colors.red, fg: colors.paper },
    ghostDark: { bg: 'transparent', fg: colors.paper, border: 'rgba(255,255,255,0.16)' },
    ghostLight: { bg: 'transparent', fg: colors.ink, border: 'rgba(10,11,31,0.12)' },
    soft: { bg: 'rgba(255,255,255,0.08)', fg: colors.paper },
  };

  const sizes: Record<Size, { padH: number; fs: number; h: number }> = {
    sm: { padH: 16, fs: 13, h: 36 },
    md: { padH: 20, fs: 14, h: 44 },
    lg: { padH: 24, fs: 15, h: 52 },
  };

  const v = variants[variant] ?? variants.primary;
  const s = sizes[size];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 9999,
          paddingHorizontal: s.padH,
          height: s.h,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          width: full ? '100%' : undefined,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'primary' ? shadow(accentColor, 10, 0.4) : null,
        style,
      ]}
    >
      {lead}
      {typeof children === 'string' ? (
        <Text style={{ color: v.fg, fontWeight: '700', fontSize: s.fs }}>{children}</Text>
      ) : (
        children
      )}
      {trail}
    </Pressable>
  );
}

export default CButton;
