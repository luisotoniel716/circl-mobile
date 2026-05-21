import { Pressable, View, ViewStyle, StyleProp } from 'react-native';
import { ReactNode } from 'react';
import { colors } from '../design-system';

interface CardProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
  onPress?: () => void;
}

export function Card({ children, style, dark = true, onPress }: CardProps) {
  const base: ViewStyle = {
    backgroundColor: dark ? colors.s800 : colors.paper,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(10,11,31,0.06)',
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export default Card;
