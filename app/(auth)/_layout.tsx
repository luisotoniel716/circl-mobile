import { Stack } from 'expo-router';
import { colors } from '../../src/design-system';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.s900 },
        animation: 'slide_from_right',
      }}
    />
  );
}
