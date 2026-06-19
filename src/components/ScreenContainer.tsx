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
  /**
   * Optional full-bleed background that paints THROUGH the safe-area insets
   * (top + bottom). Pass e.g. a `<LinearGradient style={StyleSheet.absoluteFill}/>`.
   *
   * When provided, the SafeAreaView itself is transparent so the background
   * shows behind the status-bar area and the home-indicator area — no more
   * dark "bar" peeking out below a colored CTA on gradient screens.
   */
  background?: ReactNode;
}

// Native replacement for the web "Phone" shell. The device is the phone now,
// so this just provides the themed background + safe-area insets.
export function ScreenContainer({
  children,
  theme = 'dark',
  edges = ['top', 'bottom'],
  style,
  background,
}: ScreenContainerProps) {
  const bg = theme === 'light' ? colors.cream : colors.s900;
  const useCustomBg = background !== undefined;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {background}
      <SafeAreaView
        edges={edges}
        style={[
          { flex: 1, backgroundColor: useCustomBg ? 'transparent' : bg },
          style,
        ]}
      >
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

export default ScreenContainer;
