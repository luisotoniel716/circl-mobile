import { View, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import { colors } from '../design-system';

interface ScreenContainerProps {
  children: ReactNode;
  theme?: 'dark' | 'light';
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

// Native replacement for the web "Phone" shell. The device is the phone now,
// so this just provides the themed background + safe-area insets.
export function ScreenContainer({
  children,
  theme = 'dark',
  edges = ['top', 'bottom'],
  style,
}: ScreenContainerProps) {
  const bg = theme === 'light' ? colors.cream : colors.s900;
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
      <View style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  );
}

export default ScreenContainer;
