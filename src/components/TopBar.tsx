import { View, Pressable } from 'react-native';
import { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Text, colors } from '../design-system';
import { Icon } from './Icon';

interface TopBarProps {
  title?: string;
  onBack?: boolean;
  right?: ReactNode;
  /** Custom left slot. Overrides the default back button when provided. */
  left?: ReactNode;
  /**
   * Center slot. When provided, replaces the `title` text. Use this for
   * wizard flows that embed a `<StepProgress>` in the nav row so the
   * progress indicator and navigation controls share one line.
   */
  center?: ReactNode;
  big?: boolean;
  color?: string;
}

export function TopBar({ title, onBack, right, left, center, big = false, color }: TopBarProps) {
  const router = useRouter();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      {/* Left slot ─ custom node > back icon > empty placeholder */}
      <View style={{ minWidth: 34 }}>
        {left ? left : onBack ? (
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginLeft: -6, padding: 6 }}>
            <Icon name="back" size={22} color={color ?? colors.paper} />
          </Pressable>
        ) : null}
      </View>

      {/* Center slot ─ ReactNode (e.g. StepProgress) or plain title text */}
      {center ? (
        <View style={{ flex: 1, alignItems: 'stretch' }}>
          {center}
        </View>
      ) : (
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: 'center',
            fontWeight: big ? '800' : '700',
            fontSize: big ? 20 : 16,
            color: color ?? colors.paper,
          }}
        >
          {title}
        </Text>
      )}

      {/* Right slot */}
      <View style={{ minWidth: 34, alignItems: 'flex-end', flexShrink: 0 }}>
        {right}
      </View>
    </View>
  );
}

export default TopBar;
